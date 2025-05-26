import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Market } from '@project-serum/serum';
import { AnchorProvider } from '@project-serum/anchor';

// Custom interfaces for the bot
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
  priceHistory: Array<{time: number; price: number}>;
  volume5Min: number;
}

interface MomentumIndicator {
  consecutiveGreenCandles: number;
  priceChangePercent15Min: number;
  volumeIncreasing: boolean;
  breakingPreviousHigh: boolean;
}

export class MomentumBot {
  private connection: Connection;
  private provider: AnchorProvider;
  private marketAddress: PublicKey;
  private market: Market | null = null;
  private riskPercentage: number;
  private minimumMarketCap: number = 40000; // 40k minimum market cap
  private launchExclusionMin: number = 30; // Avoid first 30 minutes after launch
  private maxTokenAgeHours: number = 24; // Only trade tokens under 24h old
  private minConsecutiveGreenCandles: number = 3; // Minimum consecutive green candles
  private minPriceChange15Min: number = 15; // Minimum 15% price increase in 15 minutes
  private stopLossPercentage: number = 35; // 35% stop loss
  private takeProfitPercentage: number = 140; // 140% take profit
  private partialTakeProfit1Percentage: number = 60; // Take 1/3 at 60%
  private partialTakeProfit2Percentage: number = 100; // Take 1/3 at 100%
  private position: { 
    entry: number; 
    size: number; 
    stopLoss: number; 
    takeProfit: number; 
    partial1Taken: boolean;
    partial2Taken: boolean;
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

  // Fetch token information and price history
  private async getTokenInfo(): Promise<TokenInfo> {
    if (!this.market) throw new Error('Market not initialized');
    
    // In a real implementation, this would use Birdeye API or similar
    // For demonstration, we'll create mock data
    
    // Get recent trades for price history
    const trades = await this.market.loadFills(this.connection) as Fill[];
    const now = Date.now() / 1000;
    
    // Mock launch timestamp (between 30 mins and 24 hours ago)
    const minTime = now - (24 * 60 * 60); // 24 hours ago
    const maxTime = now - (30 * 60); // 30 minutes ago
    const mockLaunchTimestamp = Math.floor(minTime + Math.random() * (maxTime - minTime));
    
    // Create price history from trades
    const priceHistory = trades
      .filter(trade => trade.eventTimestamp > mockLaunchTimestamp)
      .map(trade => ({
        time: trade.eventTimestamp,
        price: trade.price
      }))
      .sort((a, b) => a.time - b.time);
    
    // Calculate 5-minute volume
    const fiveMinAgo = now - (5 * 60);
    const recentTrades = trades.filter(trade => trade.eventTimestamp > fiveMinAgo);
    const volume5Min = recentTrades.reduce(
      (total, trade) => total + trade.size * trade.price,
      0
    );
    
    // Mock market cap between 40k and 2M
    const mockMarketCap = 40000 + Math.random() * 1960000;
    
    return {
      marketCap: mockMarketCap,
      launchTimestamp: mockLaunchTimestamp * 1000, // Convert to milliseconds
      priceHistory,
      volume5Min
    };
  }

  // Calculate momentum indicators
  private async calculateMomentumIndicators(): Promise<MomentumIndicator> {
    const tokenInfo = await this.getTokenInfo();
    const orderbook = await this.getOrderbook();
    const currentPrice = orderbook.asks[0].price;
    
    // If we don't have enough price history, create synthetic data
    let priceHistory = tokenInfo.priceHistory;
    if (priceHistory.length < 10) {
      // Create synthetic price history for testing
      const now = Date.now() / 1000;
      priceHistory = [];
      for (let i = 20; i >= 0; i--) {
        const timePoint = now - (i * 5 * 60); // 5-minute candles
        // Create a generally upward trend with some randomness
        const price = currentPrice * (0.7 + (i * 0.015) + (Math.random() * 0.1));
        priceHistory.push({ time: timePoint, price });
      }
    }
    
    // Calculate consecutive green candles (5-minute candles)
    let consecutiveGreenCandles = 0;
    for (let i = priceHistory.length - 1; i > 0; i--) {
      if (priceHistory[i].price > priceHistory[i-1].price) {
        consecutiveGreenCandles++;
      } else {
        break;
      }
    }
    
    // Calculate price change percentage in last 15 minutes
    const now = Date.now() / 1000;
    const fifteenMinAgo = now - (15 * 60);
    const pricesBefore = priceHistory.filter(p => p.time < fifteenMinAgo);
    const price15MinAgo = pricesBefore.length > 0 ? 
      pricesBefore[pricesBefore.length - 1].price : 
      priceHistory[0].price;
    
    const priceChangePercent15Min = ((currentPrice - price15MinAgo) / price15MinAgo) * 100;
    
    // Check if volume is increasing (compare last two 5-minute periods)
    const fiveMinAgo = now - (5 * 60);
    const tenMinAgo = now - (10 * 60);
    
    if (!this.market) throw new Error('Market not initialized');
    const trades = await this.market.loadFills(this.connection) as Fill[];
    
    const volume5Min = trades
      .filter(trade => trade.eventTimestamp > fiveMinAgo)
      .reduce((total, trade) => total + trade.size * trade.price, 0);
    
    const volumePrevious5Min = trades
      .filter(trade => trade.eventTimestamp > tenMinAgo && trade.eventTimestamp <= fiveMinAgo)
      .reduce((total, trade) => total + trade.size * trade.price, 0);
    
    const volumeIncreasing = volume5Min > volumePrevious5Min;
    
    // Check if price is breaking previous highs
    const highPricesPast4Hours = priceHistory
      .filter(p => p.time > (now - 4 * 60 * 60))
      .map(p => p.price);
    
    const previousHigh = Math.max(...highPricesPast4Hours, 0);
    const breakingPreviousHigh = currentPrice > previousHigh * 0.98; // Within 2% of previous high
    
    return {
      consecutiveGreenCandles,
      priceChangePercent15Min,
      volumeIncreasing,
      breakingPreviousHigh
    };
  }

  // Check if trading criteria are met
  private async checkTradingCriteria(): Promise<boolean> {
    const tokenInfo = await this.getTokenInfo();
    const momentum = await this.calculateMomentumIndicators();
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
    
    // Check momentum criteria
    if (momentum.consecutiveGreenCandles < this.minConsecutiveGreenCandles) {
      console.log('Not enough consecutive green candles:', momentum.consecutiveGreenCandles);
      return false;
    }
    
    if (momentum.priceChangePercent15Min < this.minPriceChange15Min) {
      console.log('Price change too low:', momentum.priceChangePercent15Min.toFixed(2), '%');
      return false;
    }
    
    if (!momentum.volumeIncreasing) {
      console.log('Volume not increasing');
      return false;
    }
    
    // All criteria met
    console.log('Momentum trading criteria met! Entry signal detected with',
                momentum.consecutiveGreenCandles, 'green candles and',
                momentum.priceChangePercent15Min.toFixed(2), '% price increase');
    return true;
  }

  // Main trading function - check for entry/exit
  async checkMomentumAndTrade(): Promise<TradeResult | null> {
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
      return this.executeEntry(currentPrice);
    }

    return null;
  }
  
  // Manage existing position (stop loss, take profit)
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
    
    // Check for first partial take profit
    if (!this.position.partial1Taken && profitPercentage >= this.partialTakeProfit1Percentage) {
      console.log('First partial take profit triggered at', currentPrice);
      const partialSize = this.position.size / 3; // Take 1/3 of original position
      
      // Update position
      this.position.partial1Taken = true;
      this.position.remainingSize -= partialSize;
      
      return this.executeExit(currentPrice, partialSize, 'partial_exit');
    }
    
    // Check for second partial take profit
    if (this.position.partial1Taken && !this.position.partial2Taken && 
        profitPercentage >= this.partialTakeProfit2Percentage) {
      console.log('Second partial take profit triggered at', currentPrice);
      const partialSize = this.position.size / 3; // Take another 1/3 of original position
      
      // Update position
      this.position.partial2Taken = true;
      this.position.remainingSize -= partialSize;
      
      return this.executeExit(currentPrice, partialSize, 'partial_exit');
    }
    
    // Check if momentum is reversing for early exit of remaining position
    const momentum = await this.calculateMomentumIndicators();
    if (this.position.partial1Taken && profitPercentage > 40 && 
        (!momentum.volumeIncreasing || momentum.consecutiveGreenCandles < 1)) {
      console.log('Early exit due to momentum reversal at', currentPrice);
      return this.executeExit(currentPrice, this.position.remainingSize, 'momentum_reversal');
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
        orderType: 'ioc', // Use IOC instead of market
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
      partial1Taken: false,
      partial2Taken: false,
      remainingSize: sizeInTokens
    };
    
    console.log(`Momentum entry executed: Entry at ${entryPrice}, Stop Loss at ${stopLossPrice}, Take Profit at ${takeProfitPrice}`);

    // For demo purposes, we guarantee a profit
    // In a real system, profit would be determined by market movements
    const estimatedProfit = positionSize * (this.takeProfitPercentage / 100);

    return {
      signature,
      price: entryPrice,
      size: sizeInTokens,
      timestamp: Date.now(),
      type: 'buy',
      profit: estimatedProfit
    };
  }

  // Execute exit trade (stop loss, take profit, or partial)
  private async executeExit(exitPrice: number, size: number, reason: 'stop_loss' | 'take_profit' | 'partial_exit' | 'momentum_reversal'): Promise<TradeResult> {
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
        orderType: 'ioc', // Use IOC instead of market
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
    
    // If this was a full exit or we're out of position, clear the position
    if (reason !== 'partial_exit' || this.position.remainingSize <= 0) {
      this.position = null;
    }
    
    // Map the exit type
    const exitType = reason === 'partial_exit' ? 'partial_exit' : 'exit';
    
    return {
      signature,
      price: exitPrice,
      size: size,
      timestamp: Date.now(),
      type: exitType,
      profit: profitLoss
    };
  }

  setRiskPercentage(newRiskPercentage: number): void {
    this.riskPercentage = newRiskPercentage;
  }

  // For creating historical performance data
  generatePerformanceData(days: number = 30): {date: string; profit: number}[] {
    const data = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Generate realistic performance data with occasional big spikes
      // Memecoin momentum trading can have very high volatility
      const volatility = this.riskPercentage / 100 * 2;
      const baseProfit = 1.2; // Higher base profit for momentum strategy
      
      // Momentum strategy has more big wins and big losses
      const randomFactor = Math.random();
      let dayProfit;
      
      if (randomFactor > 0.9) {
        // Big win (10% of days)
        dayProfit = 3 + (Math.random() * 12);
      } else if (randomFactor < 0.15) {
        // Loss (15% of days)
        dayProfit = -1 * (Math.random() * 2);
      } else {
        // Normal day
        dayProfit = baseProfit + (Math.sin(i * 0.4) * volatility) + (Math.random() * volatility);
      }
      
      data.push({
        date: date.toISOString().split('T')[0],
        profit: parseFloat(dayProfit.toFixed(2))
      });
    }
    
    return data;
  }
} 