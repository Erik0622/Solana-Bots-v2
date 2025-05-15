import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Market } from '@project-serum/serum';
import { AnchorProvider } from '@project-serum/anchor';
import { buyToken, sellToken, getTradingPairByMarketName, buyTokenWithSOL, sellTokenForSOL, SOL_MINT } from '@/lib/jupiter';
import { TokenDiscoveryService, NewToken } from '@/lib/token/discovery';

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
  private minimumMarketCap: number = 100000; // Erhöht auf 100k minimum market cap
  private timeWindowMin: number = 5; // 5-minute window for volume analysis
  private launchExclusionMin: number = 30; // Avoid first 30 minutes after launch
  private maxTokenAgeHours: number = 24; // Nur Token unter 24h handeln
  private volumeThresholdPercentage: number = 25; // Volume should be 25% of market cap
  private volumeThresholdLargeCapPercentage: number = 15; // 15% for larger market caps
  private largeMarketCapThreshold: number = 500000; // 500k threshold for large market cap
  private stopLossPercentage: number = 35; // 35% stop loss
  private takeProfitPercentage: number = 140; // 140% take profit (4:1 reward-risk)
  private partialTakeProfitPercentage: number = 70; // Take partial profits at 70%
  private partialTakeProfitAmount: number = 50; // Take 50% of the position at partial TP
  private position: { entry: number; size: number; stopLoss: number; takeProfit: number; partialTaken: boolean; tokenMint: PublicKey } | null = null;
  private usdcBalance: number = 0;
  private solBalance: number = 0;
  private tradingPair: { baseMint: PublicKey, quoteMint: PublicKey };
  private marketName: string;
  private useNewTokensOnly: boolean = false; // Flag für Trading mit neuen Tokens
  private tokenDiscovery: TokenDiscoveryService;
  private requireLockedLiquidity: boolean = true; // Standardmäßig gelockte Liquidität erfordern

  constructor(
    provider: AnchorProvider,
    marketAddress: string,
    riskPercentage: number = 15, // Default 15% risk per trade
    useNewTokensOnly: boolean = false // Default: Standard-Verhalten 
  ) {
    this.provider = provider;
    this.connection = provider.connection;
    this.marketAddress = new PublicKey(marketAddress);
    this.riskPercentage = riskPercentage;
    this.useNewTokensOnly = useNewTokensOnly;
    
    // Bestimme das Trading-Paar anhand der Marktadresse
    this.marketName = this.getMarketNameFromAddress(marketAddress);
    this.tradingPair = getTradingPairByMarketName(this.marketName);
    
    // Initialisiere TokenDiscovery für neue Token-Filterung
    this.tokenDiscovery = new TokenDiscoveryService(this.connection, {
      maxAgeHours: this.maxTokenAgeHours,
      minMarketCap: this.minimumMarketCap,
      requireLockedLiquidity: this.requireLockedLiquidity,
      minVolume: 5000
    });
    
    console.log(`VolumeTracker initialisiert für Markt: ${this.marketName}`);
    if (this.useNewTokensOnly) {
      console.log("Modus: Nur neue Token unter 24 Stunden");
    }
  }
  
  // Hilfsmethode um den Marktnamen aus der Adresse zu bestimmen
  private getMarketNameFromAddress(address: string): string {
    // Bekannte Markt-Adressen zuordnen
    const marketMap: Record<string, string> = {
      '9wFFyRfZBsuAha4YcuxcXLKwMxJR43S7fPfQLusDBzvT': 'SOL/USDC',
      'HWHvQhFmJB3NUcu1aihKmrKegfVxBEHzwVX6yZCKEsi1': 'SOL/USDT',
      'A8YFbxQYFVqKZaoYJLLUVcQiWP7G2MeEgW5wsAQgMvFw': 'BTC/USDC'
    };
    
    return marketMap[address] || 'SOL/USDC'; // Standard: SOL/USDC
  }

  async initialize(): Promise<void> {
    try {
      // Lade den Serum Markt (für Marktdaten)
      this.market = await Market.load(
        this.connection,
        this.marketAddress,
        {},
        this.provider.publicKey
      );
      
      // Prüfe den USDC- und SOL-Balance des Benutzers
      await this.updateBalances();
      
      console.log(`Bot initialisiert. USDC-Balance: ${this.usdcBalance}, SOL-Balance: ${this.solBalance}`);
    } catch (error) {
      console.error('Fehler bei der Initialisierung des Bots:', error);
      throw error;
    }
  }
  
  // Aktualisiert den USDC- und SOL-Balance des Benutzers
  private async updateBalances(): Promise<void> {
    try {
      // SOL-Balance abrufen
      const lamports = await this.connection.getBalance(this.provider.publicKey);
      this.solBalance = lamports / 1_000_000_000; // Konvertiere Lamports zu SOL
      
      // USDC-Balance (vereinfacht für das Beispiel, in Produktion Token-Konto abfragen)
      this.usdcBalance = this.solBalance * 100 * 0.1; // Annahme: 1 SOL = ca. 100 USDC, 10% als USDC
      
      console.log(`Balances aktualisiert: ${this.usdcBalance.toFixed(2)} USDC, ${this.solBalance.toFixed(2)} SOL`);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Balances:', error);
    }
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
    // Wenn wir im Modus "nur neue Token" sind, erfordern wir eine zusätzliche Sicherheitsprüfung
    if (this.useNewTokensOnly) {
      try {
        // Prüfe die Token-Sicherheit mit dem TokenDiscovery-Service
        const tokenMint = this.tradingPair.baseMint.toString();
        const tokenInfo = await this.tokenDiscovery.getTokenInfo(tokenMint);
        
        // Wenn es keine Token-Informationen gibt oder das Token nicht sicher ist, überspringe
        if (!tokenInfo || !tokenInfo.liquidityLocked || tokenInfo.isHoneypot) {
          console.log('Token erfüllt nicht die Sicherheitsanforderungen (Liquidity nicht gelockt oder Honeypot)');
          return false;
        }
        
        // Prüfe das Alter des Tokens
        const now = Date.now();
        const tokenAgeHours = (now - tokenInfo.launchTime) / (60 * 60 * 1000);
        if (tokenAgeHours > this.maxTokenAgeHours) {
          console.log('Token ist zu alt:', tokenAgeHours.toFixed(2), 'Stunden');
          return false;
        }
        
        // Prüfe die Marktkapitalisierung
        if (tokenInfo.marketCap < this.minimumMarketCap) {
          console.log('Marktkapitalisierung zu niedrig:', tokenInfo.marketCap);
          return false;
        }
        
        console.log('Token erfüllt die Sicherheits- und Altersanforderungen');
      } catch (error) {
        console.error('Fehler bei der Token-Überprüfung:', error);
        return false;
      }
    }
    
    // Standard-Trading-Kriterien
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

    // Aktualisiere Balances
    await this.updateBalances();
    
    // Prüfe, ob genug Kapital für einen Trade vorhanden ist
    if (this.useNewTokensOnly) {
      // Im neuen Token-Modus verwenden wir SOL
      if (this.solBalance < 0.05) {
        console.log('Nicht genug SOL für einen Trade. Mindestens 0.05 SOL erforderlich.');
        return null;
      }
    } else {
      // Im Standard-Modus verwenden wir USDC
      if (this.usdcBalance < 10) {
        console.log('Nicht genug USDC für einen Trade. Mindestens 10 USDC erforderlich.');
        return null;
      }
    }

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

    try {
      let tradeResult;
      
      if (this.useNewTokensOnly) {
        // Verwende SOL als Handelswährung für neue Tokens
        const tradeAmountSOL = this.solBalance * (this.riskPercentage / 100);
        
        console.log(`Kaufe ${this.marketName} für ${tradeAmountSOL.toFixed(4)} SOL...`);
        
        tradeResult = await buyTokenWithSOL(
          this.connection,
          this.provider.wallet,
          this.tradingPair.baseMint,
          tradeAmountSOL
        );
        
        // Aktualisiere SOL-Balance
        this.solBalance -= tradeAmountSOL;
      } else {
        // Standard-Fall: Verwende USDC für etablierte Märkte
        const tradeAmountUSDC = this.usdcBalance * (this.riskPercentage / 100);
        
        console.log(`Kaufe ${this.marketName} für ${tradeAmountUSDC} USDC...`);
        
        tradeResult = await buyToken(
          this.connection,
          this.provider.wallet,
          this.tradingPair.baseMint,
          tradeAmountUSDC
        );
        
        // Aktualisiere USDC-Balance
        this.usdcBalance -= tradeAmountUSDC;
      }
      
      if (!tradeResult) {
        throw new Error(`Kauf von ${this.marketName} fehlgeschlagen`);
      }
      
      // Berechne Stop Loss und Take Profit Level
      const stopLossPrice = entryPrice * (1 - (this.stopLossPercentage / 100));
      const takeProfitPrice = entryPrice * (1 + (this.takeProfitPercentage / 100));
      
      // Setze Position
      this.position = {
        entry: entryPrice,
        size: tradeResult.amountOut,
        stopLoss: stopLossPrice,
        takeProfit: takeProfitPrice,
        partialTaken: false,
        tokenMint: this.tradingPair.baseMint
      };
      
      console.log(`Trade erfolgreich ausgeführt: Einstieg bei ${entryPrice}, Stop Loss bei ${stopLossPrice}, Take Profit bei ${takeProfitPrice}`);
      console.log(`Transaktion: ${tradeResult.signature}`);
      
      return {
        signature: tradeResult.signature,
        price: entryPrice,
        size: tradeResult.amountOut,
        timestamp: Date.now(),
        profit: 0, // Beim Einstieg ist der Profit 0
        type: 'buy'
      };
    } catch (error) {
      console.error('Fehler beim Ausführen des Kaufs:', error);
      
      // Fallback, um Datenbank-Aktualisierungen zu vermeiden
      throw new Error(`Kauf konnte nicht ausgeführt werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }
  
  // Execute exit trade (stop loss or take profit)
  private async executeExit(exitPrice: number, size: number, reason: 'stop_loss' | 'take_profit' | 'partial_take_profit'): Promise<TradeResult> {
    if (!this.market) throw new Error('Market not initialized');
    if (!this.position) throw new Error('No position to exit');
    
    try {
      let tradeResult;
      
      if (this.useNewTokensOnly) {
        // Verwende SOL als Zielbasis beim Verkauf neuer Tokens
        console.log(`Verkaufe ${size} ${this.marketName} für SOL...`);
        
        tradeResult = await sellTokenForSOL(
          this.connection,
          this.provider.wallet,
          this.position.tokenMint,
          size
        );
        
        // Aktualisiere SOL-Balance wenn erfolgreich
        if (tradeResult) {
          this.solBalance += tradeResult.amountOut;
        }
      } else {
        // Standard: Verkaufe gegen USDC
        console.log(`Verkaufe ${size} ${this.marketName} für USDC...`);
        
        tradeResult = await sellToken(
          this.connection,
          this.provider.wallet,
          this.position.tokenMint,
          size
        );
        
        // Aktualisiere USDC-Balance wenn erfolgreich
        if (tradeResult) {
          this.usdcBalance += tradeResult.amountOut;
        }
      }
      
      if (!tradeResult) {
        throw new Error(`Verkauf von ${this.marketName} fehlgeschlagen`);
      }
      
      // Berechne tatsächlichen Gewinn/Verlust
      const entryValue = this.position.entry * size;
      const exitValue = exitPrice * size;
      const profitLoss = exitValue - entryValue;
      
      console.log(`Exit ausgeführt: ${reason} bei ${exitPrice}, P/L: ${profitLoss.toFixed(2)} USDC`);
      console.log(`Transaktion: ${tradeResult.signature}`);
      
      // Wenn dies ein vollständiger Exit war (kein partieller), lösche die Position
      if (reason !== 'partial_take_profit' || this.position.size <= 0) {
        this.position = null;
      }
      
      return {
        signature: tradeResult.signature,
        price: exitPrice,
        size: size,
        timestamp: Date.now(),
        profit: profitLoss,
        type: 'sell'
      };
    } catch (error) {
      console.error('Fehler beim Ausführen des Verkaufs:', error);
      
      // Fallback, um Datenbank-Aktualisierungen zu vermeiden
      throw new Error(`Verkauf konnte nicht ausgeführt werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  setRiskPercentage(newRiskPercentage: number): void {
    this.riskPercentage = newRiskPercentage;
  }
  
  // Neue Konfigurationsfunktion für Token-Filter
  setTokenFilterConfig(config: {
    maxAgeHours?: number;
    minMarketCap?: number;
    requireLockedLiquidity?: boolean;
    useNewTokensOnly?: boolean;
  }): void {
    if (config.maxAgeHours !== undefined) this.maxTokenAgeHours = config.maxAgeHours;
    if (config.minMarketCap !== undefined) this.minimumMarketCap = config.minMarketCap;
    if (config.requireLockedLiquidity !== undefined) this.requireLockedLiquidity = config.requireLockedLiquidity;
    if (config.useNewTokensOnly !== undefined) this.useNewTokensOnly = config.useNewTokensOnly;
    
    // Aktualisiere auch den TokenDiscovery-Service
    this.tokenDiscovery.updateConfig({
      maxAgeHours: this.maxTokenAgeHours,
      minMarketCap: this.minimumMarketCap,
      requireLockedLiquidity: this.requireLockedLiquidity
    });
    
    console.log(`Token-Filter konfiguriert: Max. Alter ${this.maxTokenAgeHours}h, Min. MarketCap ${this.minimumMarketCap}, Liquidity-Lock: ${this.requireLockedLiquidity ? 'Erforderlich' : 'Optional'}`);
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