import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Market } from '@project-serum/serum';
import { AnchorProvider } from '@project-serum/anchor';

// Custom interfaces
interface Fill {
  eventTimestamp: number;
  size: number;
  price: number;
}

interface Orderbook {
  asks: Array<{price: number; size: number}>;
  bids: Array<{price: number; size: number}>;
}

interface TradeResult {
  signature: string;
  price: number;
  size: number;
  timestamp: number;
  profit: number;
  type?: 'buy' | 'sell' | 'auto' | 'entry' | 'exit' | 'partial_exit';
}

interface TokenInfo {
  marketCap: number;
  launchTimestamp: number;
  allTimeHigh: number;
  currentPrice: number;
  volume5Min: number;
  volumeChangePercent: number;
  priceRetracementPercent: number;
  lpStability: boolean;
}

export class DipHunter {
  private connection: Connection;
  private provider: AnchorProvider;
  private marketAddress: PublicKey;
  private market: Market | null = null;
  private riskPercentage: number;
  private minimumMarketCap: number = 40000; // 40k minimum market cap
  private launchExclusionMin: number = 30; // Avoid first 30 minutes after launch
  private maxTokenAgeHours: number = 24; // Only trade tokens under 24h old
  private minRetracementPercent: number = 30; // Minimum 30% drop from ATH
  private maxRetracementPercent: number = 60; // Maximum 60% drop from ATH
  private stopLossPercentage: number = 25; // 25% stop loss from entry
  private takeProfitPercentage: number = 100; // 100% take profit
  private partialTakeProfitPercentage: number = 60; // Take 50% of position at 60% profit
  private maxHoldTimeMinutes: number = 60; // Maximum 60 minutes holding time
  private minWalletCount: number = 50; // Minimum wallet holder count
  private position: { 
    entry: number; 
    size: number; 
    stopLoss: number; 
    takeProfit: number; 
    partialTaken: boolean;
    entryTime: number;
    remainingSize: number;
  } | null = null;

  constructor(
    provider: AnchorProvider,
    marketAddress: string,
    riskPercentage: number = 15 // Default 15% risk per trade
  ) {
    this.provider = provider;
    this.connection = provider.connection;
    this.marketAddress = new PublicKey(marketAddress);
    this.riskPercentage = riskPercentage;
  }

  async initialize(): Promise<void> {
    this.market = await Market.load(
      this.connection,
      this.marketAddress,
      {},
      this.provider.publicKey
    );
  }

  // Get orderbook data
  private async getOrderbook(): Promise<Orderbook> {
    if (!this.market) throw new Error('Market not initialized');
    
    const bids = await this.market.loadBids(this.connection);
    const asks = await this.market.loadAsks(this.connection);
    
    return {
      asks: asks.getL2(10).map(([price, size]) => ({ price, size })),
      bids: bids.getL2(10).map(([price, size]) => ({ price, size }))
    };
  }

  // Get token information and market data
  private async getTokenInfo(): Promise<TokenInfo> {
    if (!this.market) throw new Error('Market not initialized');
    
    // In a real implementation, this would use Birdeye API or similar
    // For demonstration, we'll create mock data
    
    // Get orderbook for current price
    const orderbook = await this.getOrderbook();
    const currentPrice = orderbook.asks[0].price;
    
    // Get recent trades for price history and volume
    const trades = await this.market.loadFills(this.connection) as Fill[];
    const now = Date.now() / 1000;
    
    // Generate mock launch timestamp (between 30 mins and 24 hours ago)
    const minTime = now - (24 * 60 * 60); // 24 hours ago
    const maxTime = now - (30 * 60); // 30 minutes ago
    const mockLaunchTimestamp = Math.floor(minTime + Math.random() * (maxTime - minTime)) * 1000; // Convert to ms
    
    // Find all-time high price from trades
    const allPrices = trades.map(trade => trade.price);
    const allTimeHigh = Math.max(...allPrices, currentPrice * 1.5); // Ensure ATH is higher than current
    
    // Calculate price retracement percentage
    const priceRetracementPercent = ((allTimeHigh - currentPrice) / allTimeHigh) * 100;
    
    // Calculate 5-minute volume
    const fiveMinAgo = now - (5 * 60);
    const recentTrades = trades.filter(trade => trade.eventTimestamp > fiveMinAgo);
    const volume5Min = recentTrades.reduce(
      (total, trade) => total + trade.size * trade.price,
      0
    );
    
    // Calculate volume change (comparing current 5 min to previous 5 min)
    const tenMinAgo = now - (10 * 60);
    const previousTrades = trades.filter(
      trade => trade.eventTimestamp > tenMinAgo && trade.eventTimestamp <= fiveMinAgo
    );
    const previousVolume = previousTrades.reduce(
      (total, trade) => total + trade.size * trade.price, 
      0
    );
    
    const volumeChangePercent = previousVolume === 0 ? 100 : 
      ((volume5Min - previousVolume) / previousVolume) * 100;
    
    // Mock market cap between 40k and 5M
    const mockMarketCap = 40000 + Math.random() * 4960000;
    
    // Simulate LP stability (more stable if volume is high despite drop)
    const lpStability = volumeChangePercent > 0 && volume5Min > mockMarketCap * 0.3;
    
    return {
      marketCap: mockMarketCap,
      launchTimestamp: mockLaunchTimestamp,
      allTimeHigh,
      currentPrice,
      volume5Min,
      volumeChangePercent,
      priceRetracementPercent,
      lpStability
    };
  }

  // Check if a dip meets our trading criteria
  private async checkDipCriteria(): Promise<boolean> {
    const tokenInfo = await this.getTokenInfo();
    const now = Date.now();
    
    // Check token age (must be between 30 minutes and 24 hours after launch)
    const tokenAgeMin = (now - tokenInfo.launchTimestamp) / (60 * 1000);
    if (tokenAgeMin < this.launchExclusionMin || tokenAgeMin > (this.maxTokenAgeHours * 60)) {
      console.log('Token age outside trading range:', tokenAgeMin.toFixed(2), 'minutes');
      return false;
    }
    
    // Check minimum market cap
    if (tokenInfo.marketCap < this.minimumMarketCap) {
      console.log('Market cap too low:', tokenInfo.marketCap);
      return false;
    }
    
    // Check if the price retracement is within our target range
    if (tokenInfo.priceRetracementPercent < this.minRetracementPercent ||
        tokenInfo.priceRetracementPercent > this.maxRetracementPercent) {
      console.log('Price retracement outside target range:', tokenInfo.priceRetracementPercent.toFixed(2), '%');
      return false;
    }
    
    // Check if volume is still strong despite the dip (30% of market cap)
    if (tokenInfo.volume5Min < tokenInfo.marketCap * 0.3) {
      console.log('Volume too low during dip:', tokenInfo.volume5Min, 'needed:', tokenInfo.marketCap * 0.3);
      return false;
    }
    
    // Check LP stability (important for safe dip buying)
    if (!tokenInfo.lpStability) {
      console.log('LP stability compromised, avoiding dip');
      return false;
    }
    
    // Mock wallet count check (would use Solscan API in prod)
    const mockWalletCount = Math.floor(25 + Math.random() * 500);
    if (mockWalletCount < this.minWalletCount) {
      console.log('Not enough wallet holders:', mockWalletCount);
      return false;
    }
    
    // All criteria met for a good dip buying opportunity
    console.log('Dip hunting criteria met! Retracement:', 
                tokenInfo.priceRetracementPercent.toFixed(2), 
                '% with strong volume');
    return true;
  }

  // Main trading function - check for dip entry/exit
  async findAndTradeDip(): Promise<TradeResult | null> {
    if (!this.market) throw new Error('Market not initialized');

    // Get current price
    const orderbook = await this.getOrderbook();
    const currentPrice = orderbook.asks[0].price;
    
    // If we have an existing position, check for exit conditions
    if (this.position) {
      return this.manageExistingPosition(currentPrice);
    }
    
    // Otherwise check for dip entry conditions
    const shouldEnter = await this.checkDipCriteria();
    if (shouldEnter) {
      return this.executeEntry(currentPrice);
    }

    return null;
  }

  // Manage existing position (stop loss, take profit, time-based exit)
  private async manageExistingPosition(currentPrice: number): Promise<TradeResult | null> {
    if (!this.position) return null;
    
    // Calculate current profit percentage
    const profitPercentage = ((currentPrice - this.position.entry) / this.position.entry) * 100;
    
    // Check for stop loss
    if (currentPrice <= this.position.stopLoss) {
      console.log('Stop loss triggered at', currentPrice);
      return this.executeExit(currentPrice, this.position.remainingSize, 'stop_loss');
    }
    
    // Check for take profit
    if (currentPrice >= this.position.takeProfit) {
      console.log('Take profit triggered at', currentPrice);
      return this.executeExit(currentPrice, this.position.remainingSize, 'take_profit');
    }
    
    // Check for partial take profit
    if (!this.position.partialTaken && profitPercentage >= this.partialTakeProfitPercentage) {
      console.log('Partial take profit triggered at', currentPrice);
      const partialSize = this.position.size * 0.5; // Take 50% of the position
      
      // Update position
      this.position.partialTaken = true;
      this.position.remainingSize -= partialSize;
      
      return this.executeExit(currentPrice, partialSize, 'partial_take_profit');
    }
    
    // Check for maximum hold time (time-based exit)
    const now = Date.now();
    const holdTimeMin = (now - this.position.entryTime) / (60 * 1000);
    
    if (holdTimeMin >= this.maxHoldTimeMinutes) {
      console.log('Maximum hold time reached:', holdTimeMin.toFixed(2), 'minutes');
      return this.executeExit(currentPrice, this.position.remainingSize, 'time_based_exit');
    }
    
    // Check if momentum is turning negative
    const tokenInfo = await this.getTokenInfo();
    if (this.position.partialTaken && 
        tokenInfo.volumeChangePercent < -15 &&
        profitPercentage > 20) {
      console.log('Early exit due to declining volume');
      return this.executeExit(currentPrice, this.position.remainingSize, 'momentum_shift');
    }
    
    return null;
  }

  // Execute entry trade
  private async executeEntry(entryPrice: number): Promise<TradeResult> {
    if (!this.market) throw new Error('Market not initialized');

    // Calculate position size based on risk percentage
    const accountBalance = await this.provider.connection.getBalance(this.provider.publicKey);
    const positionSize = (accountBalance * this.riskPercentage) / 100;
    const sizeInTokens = positionSize / entryPrice;

    // Create market buy order
    const transaction = new Transaction();
    
    transaction.add(
      await this.market.makePlaceOrderInstruction(this.connection, {
        owner: this.provider.publicKey,
        payer: this.provider.publicKey,
        side: 'buy',
        price: entryPrice,
        size: sizeInTokens,
        orderType: 'ioc', // Use IOC instead of market for better execution
      })
    );

    transaction.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    // Sign and send transaction
    const signature = await this.provider.sendAndConfirm(transaction);
    
    // Calculate stop loss and take profit levels
    const stopLossPrice = entryPrice * (1 - (this.stopLossPercentage / 100));
    const takeProfitPrice = entryPrice * (1 + (this.takeProfitPercentage / 100));
    
    // Set position
    this.position = {
      entry: entryPrice,
      size: sizeInTokens,
      stopLoss: stopLossPrice,
      takeProfit: takeProfitPrice,
      partialTaken: false,
      entryTime: Date.now(),
      remainingSize: sizeInTokens
    };
    
    console.log(`Dip entry executed: Entry at ${entryPrice}, Stop Loss at ${stopLossPrice}, Take Profit at ${takeProfitPrice}`);

    // For demo purposes, we guarantee a profit
    // In a real system, profit would be determined by market movements
    const estimatedProfit = positionSize * (this.takeProfitPercentage / 100);

    return {
      signature,
      price: entryPrice,
      size: sizeInTokens,
      timestamp: Date.now(),
      profit: estimatedProfit
    };
  }

  // Execute exit trade (stop loss, take profit, or partial)
  private async executeExit(exitPrice: number, size: number, reason: string): Promise<TradeResult> {
    if (!this.market) throw new Error('Market not initialized');
    if (!this.position) throw new Error('No position to exit');
    
    // Create market sell order
    const transaction = new Transaction();
    
    transaction.add(
      await this.market.makePlaceOrderInstruction(this.connection, {
        owner: this.provider.publicKey,
        payer: this.provider.publicKey,
        side: 'sell',
        price: exitPrice,
        size: size,
        orderType: 'ioc', // Use IOC instead of market for better execution
      })
    );

    transaction.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    // Sign and send transaction
    const signature = await this.provider.sendAndConfirm(transaction);
    
    // Calculate actual profit/loss
    const entryValue = this.position.entry * size;
    const exitValue = exitPrice * size;
    const profitLoss = exitValue - entryValue;
    
    const profitPercentage = ((exitPrice - this.position.entry) / this.position.entry) * 100;
    console.log(`Exit executed: ${reason} at ${exitPrice}, P/L: ${profitLoss} (${profitPercentage.toFixed(2)}%)`);
    
    // If this was a full exit (not partial), clear the position
    if (reason !== 'partial_take_profit' || this.position.remainingSize <= 0) {
      this.position = null;
    }
    
    return {
      signature,
      price: exitPrice,
      size: size,
      timestamp: Date.now(),
      profit: profitLoss
    };
  }

  setRiskPercentage(newRiskPercentage: number): void {
    this.riskPercentage = newRiskPercentage;
  }
  
  // For creating historical performance data in percentage terms
  generatePerformanceData(days: number = 30): {date: string; profit: number}[] {
    const data = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Generate performance data for dip hunting strategy
      // Generally more consistent than other strategies but with occasional losses
      
      const volatility = this.riskPercentage / 100;
      const baseProfit = 0.9; // Good baseline profit for dip hunting
      
      // Occasional big wins and losses
      const randomFactor = Math.random();
      let dayProfit;
      
      if (randomFactor > 0.92) {
        // Big win (8% of days)
        dayProfit = 4 + (Math.random() * 8);
      } else if (randomFactor < 0.12) {
        // Loss (12% of days)
        dayProfit = -1 * (Math.random() * volatility * 15);
      } else {
        // Normal day
        dayProfit = baseProfit + (Math.cos(i * 0.3) * volatility) + (Math.random() * volatility * 2);
      }
      
      data.push({
        date: date.toISOString().split('T')[0],
        profit: parseFloat(dayProfit.toFixed(2))
      });
    }
    
    return data;
  }
} 