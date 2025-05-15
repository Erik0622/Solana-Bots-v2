import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider } from '@project-serum/anchor';
import { buyTokenWithSOL, sellTokenForSOL, SOL_MINT } from '@/lib/jupiter';
import { TokenDiscoveryService, NewToken } from '@/lib/token/discovery';

interface TradeResult {
  signature: string;
  price: number;
  size: number;
  timestamp: number;
  profit: number;
  type?: 'buy' | 'sell' | 'auto';
}

export class NewTokenHunter {
  private connection: Connection;
  private provider: AnchorProvider;
  private tokenDiscovery: TokenDiscoveryService;
  private riskPercentage: number;
  private maxTokenAgeHours: number = 24; // Nur Token unter 24h handeln
  private minMarketCap: number = 100000; // Mindestmarktkapitalisierung 100k
  private stopLossPercentage: number = 40; // 40% Stop Loss
  private takeProfitPercentage: number = 200; // 200% Take Profit
  private partialTakeProfitPercentage: number = 100; // Bei 100% Gewinn teilweise Gewinne realisieren
  private partialTakeProfitAmount: number = 50; // 50% der Position bei Teil-TP verkaufen
  private maxActivePositions: number = 3; // Maximal 3 gleichzeitige Positionen
  private activePositions: Map<string, {
    tokenMint: PublicKey;
    entry: number;
    size: number;
    stopLoss: number;
    takeProfit: number;
    partialTaken: boolean;
    entryTime: number;
  }> = new Map();
  private solBalance: number = 0;

  constructor(
    provider: AnchorProvider,
    riskPercentage: number = 10 // 10% Risiko pro Trade
  ) {
    this.provider = provider;
    this.connection = provider.connection;
    this.riskPercentage = riskPercentage;

    // Initialisiere Token-Discovery-Service
    this.tokenDiscovery = new TokenDiscoveryService(this.connection, {
      maxAgeHours: this.maxTokenAgeHours,
      minMarketCap: this.minMarketCap,
      requireLockedLiquidity: true, // Nur Token mit gelockter Liquidität
      minVolume: 5000
    });

    console.log('NewTokenHunter initialisiert mit Risikoeinstellung:', riskPercentage, '%');
  }

  async initialize(): Promise<void> {
    try {
      // Prüfe den SOL-Balance der Wallet
      await this.updateSOLBalance();
      
      console.log(`Bot initialisiert. SOL-Balance: ${this.solBalance}`);
    } catch (error) {
      console.error('Fehler bei der Initialisierung des Bots:', error);
      throw error;
    }
  }

  // Aktualisiert den SOL-Balance
  private async updateSOLBalance(): Promise<void> {
    try {
      const lamports = await this.connection.getBalance(this.provider.publicKey);
      this.solBalance = lamports / 1_000_000_000; // Lamports zu SOL
      
      console.log(`SOL-Balance aktualisiert: ${this.solBalance.toFixed(2)} SOL`);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des SOL-Balances:', error);
    }
  }

  // Hauptfunktion zum Scannen nach neuen Token und ggf. Trading
  async scanAndTrade(): Promise<TradeResult | null> {
    try {
      // Aktualisiere SOL-Balance
      await this.updateSOLBalance();
      
      // Prüfe, ob genug SOL für einen Trade vorhanden ist
      if (this.solBalance < 0.05) {
        console.log('Nicht genug SOL für einen Trade. Mindestens 0.05 SOL erforderlich.');
        return null;
      }

      // Verwalte bestehende Positionen
      const managementResult = await this.managePositions();
      if (managementResult) return managementResult;

      // Wenn wir bereits die maximale Anzahl an Positionen haben, keine neuen eröffnen
      if (this.activePositions.size >= this.maxActivePositions) {
        console.log(`Maximale Anzahl an Positionen (${this.maxActivePositions}) erreicht. Keine neuen Trades.`);
        return null;
      }

      // Suche nach neuen Token
      const newTokens = await this.tokenDiscovery.findNewTokens();
      
      if (newTokens.length === 0) {
        console.log('Keine neuen Token gefunden, die den Kriterien entsprechen.');
        return null;
      }

      // Analysiere jeden Token
      for (const token of newTokens) {
        // Prüfe, ob wir diesen Token bereits handeln
        if (this.activePositions.has(token.mint)) {
          continue;
        }

        // Prüfe Trading-Kriterien
        if (await this.checkTradeEntry(token)) {
          return this.executeBuy(token);
        }
      }

      return null;
    } catch (error) {
      console.error('Fehler beim Scannen und Traden:', error);
      return null;
    }
  }

  // Prüft, ob ein Token für einen Einstieg geeignet ist
  private async checkTradeEntry(token: NewToken): Promise<boolean> {
    // Prüfe Kriterien wie Alter, Marktkapitalisierung und Sicherheit
    const now = Date.now();
    const tokenAgeHours = (now - token.launchTime) / (60 * 60 * 1000);

    // 1. Prüfe Tokenalter - nicht älter als konfigurierte Stunden
    if (tokenAgeHours > this.maxTokenAgeHours) {
      return false;
    }

    // 2. Prüfe Mindestmarktkapitalisierung
    if (token.marketCap < this.minMarketCap) {
      return false;
    }

    // 3. Prüfe Sicherheitsmerkmale
    if (!token.liquidityLocked || token.isHoneypot) {
      return false;
    }

    // 4. Prüfe auf ausreichendes Volumen im Verhältnis zur Marktkapitalisierung
    // Mindestens 5% der Marktkapitalisierung als 24h Volumen
    if (token.volume24h < token.marketCap * 0.05) {
      return false;
    }

    console.log(`Geeigneter Token für Trading gefunden: ${token.symbol} (${token.mint})`);
    console.log(`Alter: ${tokenAgeHours.toFixed(2)} Stunden, MarketCap: ${token.marketCap}`);
    
    return true;
  }

  // Führt einen Kauf durch
  private async executeBuy(token: NewToken): Promise<TradeResult> {
    try {
      // Berechne SOL-Betrag basierend auf Risikoprozentsatz
      const tradeAmountSOL = this.solBalance * (this.riskPercentage / 100);
      
      console.log(`Kaufe ${token.symbol} für ${tradeAmountSOL.toFixed(4)} SOL...`);
      
      // Führe Kauf durch
      const tradeResult = await buyTokenWithSOL(
        this.connection,
        this.provider.wallet,
        new PublicKey(token.mint),
        tradeAmountSOL
      );
      
      if (!tradeResult) {
        throw new Error(`Kauf von ${token.symbol} fehlgeschlagen`);
      }
      
      // Berechne Stop Loss und Take Profit Level
      const stopLossPrice = token.price * (1 - (this.stopLossPercentage / 100));
      const takeProfitPrice = token.price * (1 + (this.takeProfitPercentage / 100));
      
      // Speichere die Position
      this.activePositions.set(token.mint, {
        tokenMint: new PublicKey(token.mint),
        entry: token.price,
        size: tradeResult.amountOut,
        stopLoss: stopLossPrice,
        takeProfit: takeProfitPrice,
        partialTaken: false,
        entryTime: Date.now()
      });
      
      console.log(`Trade ausgeführt: Einstieg bei ${token.price}, Stop Loss bei ${stopLossPrice}, Take Profit bei ${takeProfitPrice}`);
      console.log(`Transaktion: ${tradeResult.signature}`);
      
      // Aktualisiere SOL-Balance
      this.solBalance -= tradeAmountSOL;
      
      return {
        signature: tradeResult.signature,
        price: token.price,
        size: tradeResult.amountOut,
        timestamp: Date.now(),
        profit: 0, // Beim Einstieg ist der Profit 0
        type: 'buy'
      };
    } catch (error) {
      console.error('Fehler beim Ausführen des Kaufs:', error);
      throw new Error(`Kauf konnte nicht ausgeführt werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  // Verwaltet bestehende Positionen
  private async managePositions(): Promise<TradeResult | null> {
    if (this.activePositions.size === 0) return null;
    
    // Iteriere über alle aktiven Positionen
    for (const [tokenMint, position] of this.activePositions.entries()) {
      try {
        // Hole aktuelle Token-Informationen
        const tokenInfo = await this.tokenDiscovery.getTokenInfo(tokenMint);
        if (!tokenInfo) continue;
        
        const currentPrice = tokenInfo.price;
        
        // Berechne aktuellen Gewinn/Verlust in Prozent
        const profitPercentage = ((currentPrice - position.entry) / position.entry) * 100;
        
        // Prüfe Stop Loss
        if (currentPrice <= position.stopLoss) {
          console.log(`Stop Loss bei ${tokenInfo.symbol} ausgelöst bei ${currentPrice}`);
          return this.executeSell(tokenInfo, position, position.size, 'stop_loss');
        }
        
        // Prüfe Take Profit
        if (currentPrice >= position.takeProfit) {
          console.log(`Take Profit bei ${tokenInfo.symbol} ausgelöst bei ${currentPrice}`);
          return this.executeSell(tokenInfo, position, position.size, 'take_profit');
        }
        
        // Prüfe Partial Take Profit
        if (!position.partialTaken && profitPercentage >= this.partialTakeProfitPercentage) {
          console.log(`Partial Take Profit bei ${tokenInfo.symbol} ausgelöst bei ${currentPrice}`);
          const partialSize = position.size * (this.partialTakeProfitAmount / 100);
          
          // Markiere, dass wir teilweise Gewinne realisiert haben
          position.partialTaken = true;
          position.size -= partialSize;
          
          this.activePositions.set(tokenMint, position);
          
          return this.executeSell(tokenInfo, position, partialSize, 'partial_take_profit');
        }
        
        // Prüfe Time-Based Exit (48h nach Einstieg - optional)
        const positionAgeDays = (Date.now() - position.entryTime) / (24 * 60 * 60 * 1000);
        if (positionAgeDays > 2) { // Verlasse Position nach 2 Tagen
          console.log(`Time-Based Exit bei ${tokenInfo.symbol} nach ${positionAgeDays.toFixed(1)} Tagen`);
          return this.executeSell(tokenInfo, position, position.size, 'time_exit');
        }
      } catch (error) {
        console.error(`Fehler beim Verwalten der Position für Token ${tokenMint}:`, error);
      }
    }
    
    return null;
  }

  // Führt einen Verkauf durch
  private async executeSell(
    tokenInfo: NewToken,
    position: any,
    size: number,
    reason: 'stop_loss' | 'take_profit' | 'partial_take_profit' | 'time_exit'
  ): Promise<TradeResult> {
    try {
      console.log(`Verkaufe ${size} ${tokenInfo.symbol} für SOL... (${reason})`);
      
      const tradeResult = await sellTokenForSOL(
        this.connection,
        this.provider.wallet,
        position.tokenMint,
        size
      );
      
      if (!tradeResult) {
        throw new Error(`Verkauf von ${tokenInfo.symbol} fehlgeschlagen`);
      }
      
      // Berechne tatsächlichen Gewinn/Verlust
      const entryValue = position.entry * size;
      const exitValue = tokenInfo.price * size;
      const profitLoss = exitValue - entryValue;
      
      console.log(`Exit ausgeführt: ${reason} bei ${tokenInfo.price}, P/L: ${profitLoss.toFixed(2)} (${((profitLoss / entryValue) * 100).toFixed(2)}%)`);
      console.log(`Transaktion: ${tradeResult.signature}`);
      
      // Aktualisiere SOL-Balance
      this.solBalance += tradeResult.amountOut;
      
      // Wenn dies ein vollständiger Exit war, entferne die Position
      if (reason !== 'partial_take_profit' || position.size <= 0) {
        this.activePositions.delete(tokenInfo.mint);
      }
      
      return {
        signature: tradeResult.signature,
        price: tokenInfo.price,
        size: size,
        timestamp: Date.now(),
        profit: profitLoss,
        type: 'sell'
      };
    } catch (error) {
      console.error('Fehler beim Ausführen des Verkaufs:', error);
      throw new Error(`Verkauf konnte nicht ausgeführt werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  // Setzt den Risikoprozentsatz
  setRiskPercentage(newRiskPercentage: number): void {
    this.riskPercentage = newRiskPercentage;
  }

  // Aktualisiert Konfiguration für Token-Discovery
  updateTokenDiscoveryConfig(config: {
    maxAgeHours?: number;
    minMarketCap?: number;
    requireLockedLiquidity?: boolean;
    minVolume?: number;
  }): void {
    this.tokenDiscovery.updateConfig(config);
    
    // Aktualisiere auch die lokalen Einstellungen
    if (config.maxAgeHours) this.maxTokenAgeHours = config.maxAgeHours;
    if (config.minMarketCap) this.minMarketCap = config.minMarketCap;
  }

  // Für die Generierung von Simulationsdaten
  generatePerformanceData(days: number = 30): {date: string; profit: number}[] {
    const data = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Generiere realistische Performance-Daten für neue Token-Trading
      // Hohe Volatilität mit gelegentlichen Spikes
      const volatility = this.riskPercentage / 100;
      const baseProfit = 1.2; // Höhere Basisperformance für neue Token
      
      // Gelegentliche große Gewinnspitzen (typisch für Memecoins/neue Token)
      const spike = Math.random() > 0.85 ? Math.random() * 15 : 0;
      
      // Gelegentliche Verluste (Rug Pulls, Failed Launches)
      const rugPull = Math.random() > 0.95 ? -(Math.random() * 8) : 0;
      
      const dayProfit = baseProfit + (Math.sin(i * 0.5) * volatility * 3) + 
                        (Math.random() * volatility * 4) + spike + rugPull;
      
      data.push({
        date: date.toISOString().split('T')[0],
        profit: parseFloat(dayProfit.toFixed(2))
      });
    }
    
    return data;
  }
} 