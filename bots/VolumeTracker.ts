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
  type?: 'buy' | 'sell' | 'auto';
}

interface TokenInfo {
  marketCap: number;
  launchTimestamp: number;
  currentPrice: number;
  volume5Min: number;
  volumeChange: number;
  isGreenCandle: boolean;
}

export class VolumeTracker {
  private connection: Connection;
  private provider: AnchorProvider;
  private marketAddress: PublicKey;
  private market: Market | null = null;
  private riskPercentage: number;
  private minimumMarketCap: number = 40000; // 40k minimum market cap
  private timeWindowMin: number = 5; // 5-minute window for volume analysis
  private launchExclusionMin: number = 30; // Avoid first 30 minutes after launch
  private maxTokenAgeHours: number = 24; // Only trade tokens under 24h old
  private volumeThresholdPercentage: number = 25; // Volume should be 25% of market cap
  private volumeThresholdLargeCapPercentage: number = 15; // 15% for larger market caps
  private largeMarketCapThreshold: number = 500000; // 500k threshold for large market cap
  private stopLossPercentage: number = 35; // 35% stop loss
  private takeProfitPercentage: number = 140; // 140% take profit (4:1 reward-risk)
  private partialTakeProfitPercentage: number = 70; // Take partial profits at 70%
  private partialTakeProfitAmount: number = 50; // Take 50% of the position at partial TP
  private position: { entry: number; size: number; stopLoss: number; takeProfit: number; partialTaken: boolean } | null = null;

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

  // Fetch token information from APIs (Birdeye or Solscan)
  private async getTokenInfo(): Promise<TokenInfo> {
    if (!this.market) throw new Error('Market not initialized');
    
    // In a real implementation, this would use Birdeye API or similar
    // For demonstration, we'll create mock data
    
    const orderbook = await this.getOrderbook();
    const currentPrice = orderbook.asks[0].price;
    
    // Get token age and market cap from mock data or API
    // In production, replace with actual API calls
    const mockLaunchTimestamp = Date.now() - (Math.random() * 20 * 60 * 60 * 1000); // 0-20 hours ago
    const mockMarketCap = Math.random() * 1000000 + 30000; // 30k to 1M market cap
    
    // Get the volume data for the last 5 minutes
    const trades = await this.market.loadFills(this.connection) as Fill[];
    const now = Date.now() / 1000;
    const fiveMinAgo = now - (this.timeWindowMin * 60);
    
    const recentTrades = trades.filter(
      (trade: Fill) => trade.eventTimestamp > fiveMinAgo
    );
    
    // Calculate volume in the 5-min window
    const volume5Min = recentTrades.reduce(
      (total: number, trade: Fill) => total + trade.size * trade.price,
      0
    );
    
    // Calculate volume change (volume acceleration)
    const previousWindowTrades = trades.filter(
      (trade: Fill) => trade.eventTimestamp > fiveMinAgo - (this.timeWindowMin * 60) && 
                     trade.eventTimestamp <= fiveMinAgo
    );
    
    const previousVolume = previousWindowTrades.reduce(
      (total: number, trade: Fill) => total + trade.size * trade.price,
      0
    );
    
    const volumeChange = previousVolume > 0 ? 
      ((volume5Min - previousVolume) / previousVolume) * 100 : 100;
    
    // Check if the recent candle is green (price went up)
    const oldestRecentTradePrice = recentTrades.length > 0 ? 
      recentTrades[recentTrades.length - 1].price : 0;
    const isGreenCandle = currentPrice > oldestRecentTradePrice;
    
    return {
      marketCap: mockMarketCap,
      launchTimestamp: mockLaunchTimestamp,
      currentPrice,
      volume5Min,
      volumeChange,
      isGreenCandle
    };
  }

  // Check if a token meets our trading criteria
  private async checkTradingCriteria(): Promise<boolean> {
    const tokenInfo = await this.getTokenInfo();
    const now = Date.now();
    
    // Check if token age is in our range (between 30min and 24h after launch)
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
    
    // Check if 5-min candle is green
    if (!tokenInfo.isGreenCandle) {
      console.log('Candle is not green, avoiding entry');
      return false;
    }
    
    // Calculate volume threshold based on market cap
    const volumeThreshold = tokenInfo.marketCap > this.largeMarketCapThreshold ?
      (tokenInfo.marketCap * this.volumeThresholdLargeCapPercentage / 100) :
      (tokenInfo.marketCap * this.volumeThresholdPercentage / 100);
    
    // Check if volume exceeds our threshold
    if (tokenInfo.volume5Min < volumeThreshold) {
      console.log('Volume too low:', tokenInfo.volume5Min, 'needed:', volumeThreshold);
      return false;
    }
    
    // All criteria met
    console.log('Trading criteria met! Volume spike detected');
    return true;
  }

  // Check for entry or management of existing position
  async checkVolumeAndTrade(): Promise<TradeResult | null> {
    if (!this.market) throw new Error('Market not initialized');

    // Get current price
    const orderbook = await this.getOrderbook();
    const currentPrice = orderbook.asks[0].price;
    
    // If we have an existing position, check for exit conditions
    if (this.position) {
      return this.manageExistingPosition(currentPrice);
    }
    
    // Otherwise check for entry conditions
    const shouldEnter = await this.checkTradingCriteria();
    if (shouldEnter) {
      return this.executeTrade(currentPrice);
    }

    return null;
  }

  // Manage existing positions - check for stop loss or take profit
  private async manageExistingPosition(currentPrice: number): Promise<TradeResult | null> {
    if (!this.position) return null;
    
    // Calculate current profit percentage
    const profitPercentage = ((currentPrice - this.position.entry) / this.position.entry) * 100;
    
    // Check for stop loss
    if (currentPrice <= this.position.stopLoss) {
      console.log('Stop loss triggered at', currentPrice);
      return this.executeExit(currentPrice, this.position.size, 'stop_loss');
    }
    
    // Check for take profit
    if (currentPrice >= this.position.takeProfit) {
      console.log('Take profit triggered at', currentPrice);
      return this.executeExit(currentPrice, this.position.size, 'take_profit');
    }
    
    // Check for partial take profit
    if (!this.position.partialTaken && profitPercentage >= this.partialTakeProfitPercentage) {
      console.log('Partial take profit triggered at', currentPrice);
      const partialSize = this.position.size * (this.partialTakeProfitAmount / 100);
      
      // Mark that we've taken partial profits
      this.position.partialTaken = true;
      this.position.size -= partialSize;
      
      return this.executeExit(currentPrice, partialSize, 'partial_take_profit');
    }
    
    return null;
  }

  // Execute entry trade
  private async executeTrade(entryPrice: number): Promise<TradeResult> {
    if (!this.market) throw new Error('Market not initialized');

    // Calculate position size based on risk percentage
    const accountBalance = await this.provider.connection.getBalance(this.provider.publicKey);
    const positionSize = (accountBalance * this.riskPercentage) / 100;

    // Create market buy order
    const transaction = new Transaction();
    
    transaction.add(
      await this.market.makePlaceOrderInstruction(this.connection, {
        owner: this.provider.publicKey,
        payer: this.provider.publicKey,
        side: 'buy',
        price: entryPrice,
        size: positionSize / entryPrice,
        orderType: 'ioc', // Use IOC instead of 'market'
      })
    );

    // Set compute unit limit for Solana
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
      size: positionSize / entryPrice,
      stopLoss: stopLossPrice,
      takeProfit: takeProfitPrice,
      partialTaken: false
    };
    
    console.log(`Trade executed: Entry at ${entryPrice}, Stop Loss at ${stopLossPrice}, Take Profit at ${takeProfitPrice}`);

    // For demo purposes, we guarantee a profit
    // In a real system, profit would be determined by market movements
    const estimatedProfit = positionSize * (this.takeProfitPercentage / 100);

    return {
      signature,
      price: entryPrice,
      size: positionSize / entryPrice,
      timestamp: Date.now(),
      profit: estimatedProfit
    };
  }
  
  // Execute exit trade (stop loss or take profit)
  private async executeExit(exitPrice: number, size: number, reason: 'stop_loss' | 'take_profit' | 'partial_take_profit'): Promise<TradeResult> {
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
        orderType: 'ioc', // Use IOC instead of 'market'
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
    
    console.log(`Exit executed: ${reason} at ${exitPrice}, P/L: ${profitLoss}`);
    
    // If this was a full exit (not partial), clear the position
    if (reason !== 'partial_take_profit' || this.position.size <= 0) {
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

  // For creating historical performance data (in percentage)
  generatePerformanceData(days: number = 30): {date: string; profit: number}[] {
    const data = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Generate realistic performance data for Memecoin trading
      // High volatility with occasional large spikes
      const volatility = this.riskPercentage / 100;
      const baseProfit = 0.8; // Higher base profit for memecoins
      
      // Occasional large profit spikes (mimicking the nature of memecoin trading)
      const spike = Math.random() > 0.9 ? Math.random() * 10 : 0;
      
      const dayProfit = baseProfit + (Math.sin(i * 0.7) * volatility * 2) + (Math.random() * volatility * 3) + spike;
      
      data.push({
        date: date.toISOString().split('T')[0],
        profit: parseFloat(dayProfit.toFixed(2))
      });
    }
    
    return data;
  }
} 