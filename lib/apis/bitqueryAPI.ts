/**
 * Bitquery API für Solana Memecoin-Daten
 * Speziell für neue Token nach Raydium-Migration
 */

export interface BitqueryToken {
  address: string;
  symbol: string;
  name: string;
  marketCap: number;
  volume24h: number;
  raydiumLaunchTime: number;
  age: number; // in Stunden
  priceHistory: BitqueryPriceData[];
}

export interface BitqueryPriceData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BitqueryMigrationData {
  tokenAddress: string;
  migrationTime: number;
  pumpFunLaunchTime?: number;
  raydiumPairAddress: string;
}

export class BitqueryAPI {
  private baseUrl = 'https://graphql.bitquery.io';
  private apiKey = process.env.BITQUERY_API_KEY || 'ory_at_4t1KnHlwObAx_MVV5xuXlHRa86VmpiA7KhJjNLyC9MQ.-3tIZhQyT8xbIf5EQnt2e8GLnux0pFAwyl1uCVzZQZg';
  private projectId = process.env.BITQUERY_PROJECT_ID || '0aeb55a3-7c07-4eb2-8672-3e33cbe428a2';
  private secret = process.env.BITQUERY_SECRET || 'A3pO89GykmVdSiAqvJvQfsiILK';
  private lastRequestTime = 0;
  private requestCount = 0;
  private readonly rateLimitDelay = 6000; // 6 Sekunden zwischen Requests (10/min = 1 pro 6s)

  constructor() {
    if (!this.apiKey) {
      console.warn('⚠️  Bitquery API Key fehlt! Bitte BITQUERY_API_KEY in .env.local setzen');
    }
    console.log(`🔗 Bitquery API initialisiert für Projekt: ${this.projectId}`);
  }

  /**
   * Rate-Limit-Management: Wartet mindestens 6 Sekunden zwischen Requests
   */
  private async handleRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      console.log(`⏳ Rate Limit: Warte ${(waitTime / 1000).toFixed(1)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
    console.log(`📊 Bitquery Request #${this.requestCount}`);
  }

  /**
   * Findet neue Memecoins die nach Raydium migriert sind
   * Filter: < 24h alt, > 50k Market Cap, 25min nach Launch
   */
  async getNewRaydiumMemecoins(limit: number = 20): Promise<BitqueryToken[]> {
    // Verwende ein vereinfachtes Query für bessere Kompatibilität
    const query = `
      query NewRaydiumMemecoins {
        Solana {
          DEXTrades(
            where: {
              Trade: {
                Dex: { ProtocolName: { in: ["Raydium", "raydium", "Raydium V4"] } }
                Currency: { 
                  MintAddress: { 
                    notIn: [
                      "So11111111111111111111111111111111111111112",
                      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
                    ]
                  }
                }
              }
              Transaction: { Result: { Success: true } }
              Block: { 
                Time: { 
                  since: "${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}"
                }
              }
            }
            orderBy: { descending: Block_Time }
            limit: { count: ${limit} }
          ) {
            Trade {
              Currency {
                MintAddress
                Symbol
                Name
              }
              Market {
                MarketAddress
              }
              Dex {
                ProtocolName
              }
              Price
              AmountInUSD
            }
            Block {
              Time
            }
            count(uniq: transactions)
          }
        }
      }
    `;

    try {
      console.log('🔍 Suche nach neuen Raydium Memecoins...');
      await this.handleRateLimit();
      
      const response = await this.executeQuery(query);
      
      if (!response?.data?.Solana?.DEXTrades) {
        console.warn('⚠️  Keine DEX-Trade-Daten von Bitquery erhalten');
        return [];
      }

      const trades = response.data.Solana.DEXTrades;
      const tokenMap = new Map<string, any>();

      // Gruppiere Trades nach Token
      trades.forEach((trade: any) => {
        const address = trade.Trade.Currency.MintAddress;
        if (!tokenMap.has(address)) {
          tokenMap.set(address, {
            address,
            symbol: trade.Trade.Currency.Symbol || 'UNKNOWN',
            name: trade.Trade.Currency.Name || 'Unknown Token',
            firstTradeTime: trade.Block.Time,
            trades: [],
            totalVolume: 0
          });
        }
        
        const token = tokenMap.get(address);
        token.trades.push(trade);
        token.totalVolume += trade.Trade.AmountInUSD || 0;
        
        // Update first trade time
        if (new Date(trade.Block.Time) < new Date(token.firstTradeTime)) {
          token.firstTradeTime = trade.Block.Time;
        }
      });

      const filteredTokens: BitqueryToken[] = [];
      console.log(`📊 ${tokenMap.size} eindeutige Token von Bitquery erhalten, filtere nach Kriterien...`);

      // Verwende Array.from für bessere TypeScript-Kompatibilität
      Array.from(tokenMap.entries()).forEach(([address, tokenData]) => {
        const firstTradeTime = new Date(tokenData.firstTradeTime).getTime();
        const ageHours = (Date.now() - firstTradeTime) / (1000 * 60 * 60);
        const marketCap = tokenData.totalVolume * 10; // Schätzung: Volume * 10 als MCap
        const volume24h = tokenData.totalVolume;

        // Filter: min 50k Market Cap, max 24h alt, min 25min nach Launch
        if (marketCap >= 50000 && ageHours <= 24 && ageHours >= 0.42) { // 0.42h = 25min
          console.log(`✅ Token qualifiziert: ${tokenData.symbol} (MCap: $${marketCap.toLocaleString()}, Age: ${ageHours.toFixed(1)}h)`);
          
          // Hole 5-Minuten-Historie für diesen Token (mit Rate Limiting)
          // Wir müssen dies außerhalb des sync forEach machen
          filteredTokens.push({
            address,
            symbol: tokenData.symbol,
            name: tokenData.name,
            marketCap,
            volume24h,
            raydiumLaunchTime: firstTradeTime,
            age: ageHours,
            priceHistory: [] // Wird später asynchron gefüllt
          });

          // Begrenze auf gewünschte Anzahl
          if (filteredTokens.length >= limit) return;
        } else {
          console.log(`❌ Token nicht qualifiziert: ${tokenData.symbol} (MCap: $${marketCap.toLocaleString()}, Age: ${ageHours.toFixed(1)}h)`);
        }
      });

      // Hole die Preishistorie für die gefilterten Token
      for (let i = 0; i < filteredTokens.length; i++) {
        const token = filteredTokens[i];
        token.priceHistory = await this.get5MinutePriceHistory(token.address, token.raydiumLaunchTime);
      }

      console.log(`✅ Gefunden: ${filteredTokens.length} neue Raydium Memecoins`);
      return filteredTokens;

    } catch (error) {
      console.error('❌ Bitquery Memecoin Discovery Fehler:', error);
      // Fallback zu Mock-Daten bei API-Fehlern
      return this.generateMockTokens(limit);
    }
  }

  /**
   * Generiert Mock-Token bei API-Fehlern
   */
  private generateMockTokens(limit: number): BitqueryToken[] {
    console.log('🔄 Generiere Mock-Token da Bitquery API nicht verfügbar...');
    
    const mockTokens: BitqueryToken[] = [];
    const symbols = ['NEWMEME', 'FASTCAT', 'MOONSHOT', 'ROCKETDOG', 'AITOKEN', 'SOLMEME'];
    
    for (let i = 0; i < Math.min(limit, symbols.length); i++) {
      const launchTime = Date.now() - (Math.random() * 20 * 60 * 60 * 1000); // 0-20h ago
      const mockToken: BitqueryToken = {
        address: `mock${i}` + 'x'.repeat(40),
        symbol: symbols[i],
        name: `${symbols[i]} Token`,
        marketCap: 50000 + Math.random() * 500000,
        volume24h: 10000 + Math.random() * 100000,
        raydiumLaunchTime: launchTime,
        age: (Date.now() - launchTime) / (1000 * 60 * 60),
        priceHistory: this.generateMockPriceHistory()
      };
      mockTokens.push(mockToken);
    }
    
    return mockTokens;
  }

  /**
   * Generiert Mock-Preishistorie
   */
  private generateMockPriceHistory(): BitqueryPriceData[] {
    const history: BitqueryPriceData[] = [];
    let basePrice = 0.00001 + Math.random() * 0.0001;
    const now = Date.now();
    
    // 48 Candles = 4 Stunden bei 5-Minuten-Intervallen
    for (let i = 48; i >= 0; i--) {
      const timestamp = now - (i * 5 * 60 * 1000);
      const volatility = 0.05 + Math.random() * 0.15; // 5-20% Volatilität
      const change = (Math.random() - 0.5) * volatility;
      
      const open = basePrice;
      const close = basePrice * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.05);
      const low = Math.min(open, close) * (1 - Math.random() * 0.05);
      const volume = 1000 + Math.random() * 10000;
      
      history.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      });
      
      basePrice = close;
    }
    
    return history;
  }

  /**
   * Holt 5-Minuten-OHLCV-Daten für einen Token ab dem Launch-Zeitpunkt
   */
  async get5MinutePriceHistory(
    tokenAddress: string, 
    startTime: number,
    hours: number = 4 // Reduziere auf 4h für weniger API-Calls
  ): Promise<BitqueryPriceData[]> {
    
    // Skip bei Mock-Token
    if (tokenAddress.startsWith('mock')) {
      return this.generateMockPriceHistory();
    }

    const endTime = Math.min(startTime + (hours * 60 * 60 * 1000), Date.now());

    const query = `
      query Token5MinuteHistory {
        Solana {
          DEXTrades(
            where: {
              Trade: {
                Currency: { MintAddress: { is: "${tokenAddress}" } }
                Side: { 
                  Currency: { 
                    MintAddress: { is: "So11111111111111111111111111111111111111112" }
                  }
                }
              }
              Transaction: { Result: { Success: true } }
              Block: {
                Time: {
                  since: "${new Date(startTime).toISOString()}"
                  till: "${new Date(endTime).toISOString()}"
                }
              }
            }
            orderBy: { ascending: Block_Time }
            limit: { count: 50 }
          ) {
            Block {
              Time
            }
            Trade {
              Price
              Amount
            }
          }
        }
      }
    `;

    try {
      console.log(`📈 Lade Historie für Token: ${tokenAddress.slice(0, 8)}...`);
      await this.handleRateLimit();
      
      const response = await this.executeQuery(query);
      
      if (!response?.data?.Solana?.DEXTrades || response.data.Solana.DEXTrades.length === 0) {
        console.warn(`⚠️  Keine Daten für ${tokenAddress.slice(0, 8)}... - verwende Mock-Daten`);
        return this.generateMockPriceHistory();
      }

      // Konvertiere Trade-Daten zu OHLCV-Candles (vereinfacht)
      const trades = response.data.Solana.DEXTrades;
      const candles: BitqueryPriceData[] = [];
      
      // Gruppiere Trades in 5-Minuten-Intervalle
      const intervals = new Map<number, any[]>();
      
      trades.forEach((trade: any) => {
        const timestamp = new Date(trade.Block.Time).getTime();
        const intervalStart = Math.floor(timestamp / (5 * 60 * 1000)) * (5 * 60 * 1000);
        
        if (!intervals.has(intervalStart)) {
          intervals.set(intervalStart, []);
        }
        intervals.get(intervalStart)!.push(trade);
      });

      // Erstelle OHLCV-Candles
      for (const [intervalStart, intervalTrades] of intervals) {
        if (intervalTrades.length === 0) continue;
        
        const prices = intervalTrades.map(t => t.Trade.Price);
        const volumes = intervalTrades.map(t => t.Trade.Amount || 0);
        
        candles.push({
          timestamp: intervalStart,
          open: prices[0],
          high: Math.max(...prices),
          low: Math.min(...prices),
          close: prices[prices.length - 1],
          volume: volumes.reduce((sum, v) => sum + v, 0)
        });
      }

      console.log(`📊 ${candles.length} Candles für ${tokenAddress.slice(0, 8)}... erstellt`);
      return candles.length > 0 ? candles : this.generateMockPriceHistory();

    } catch (error) {
      console.error(`❌ Bitquery History Fehler für ${tokenAddress}:`, error);
      return this.generateMockPriceHistory();
    }
  }

  /**
   * Prüft ob ein Token von Pump.fun nach Raydium migriert ist
   */
  async checkPumpFunMigration(tokenAddress: string): Promise<BitqueryMigrationData | null> {
    const query = `
      query CheckMigration {
        Solana {
          DEXTrades(
            where: {
              Trade: { Currency: { MintAddress: { is: "${tokenAddress}" } } }
              Transaction: { Result: { Success: true } }
            }
            orderBy: { ascending: Block_Time }
            limit: { count: 10 }
          ) {
            Block {
              Time
            }
            Trade {
              Dex {
                ProtocolName
              }
              Market {
                MarketAddress
              }
            }
          }
        }
      }
    `;

    try {
      await this.handleRateLimit();
      const response = await this.executeQuery(query);
      
      if (!response?.data?.Solana?.DEXTrades) {
        return null;
      }

      const trades = response.data.Solana.DEXTrades;
      let pumpFunTime: number | undefined;
      let raydiumTime: number | undefined;
      let raydiumPair = '';

      for (const trade of trades) {
        const time = new Date(trade.Block.Time).getTime();
        const protocol = trade.Trade.Dex.ProtocolName.toLowerCase();

        if (protocol.includes('pump') && !pumpFunTime) {
          pumpFunTime = time;
        }
        if (protocol.includes('raydium') && !raydiumTime) {
          raydiumTime = time;
          raydiumPair = trade.Trade.Market.MarketAddress;
        }
      }

      if (raydiumTime) {
        return {
          tokenAddress,
          migrationTime: raydiumTime,
          pumpFunLaunchTime: pumpFunTime,
          raydiumPairAddress: raydiumPair
        };
      }

      return null;

    } catch (error) {
      console.error(`❌ Bitquery Migration Check Fehler für ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Führt eine GraphQL-Query aus
   */
  private async executeQuery(query: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Bitquery API Key erforderlich');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };

    // Füge X-API-KEY hinzu falls vorhanden
    if (this.secret) {
      headers['X-API-KEY'] = this.secret;
    }

    console.log('🔗 Sende Bitquery GraphQL Request...');

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        query,
        variables: {},
        operationName: null
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bitquery API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL Errors:', data.errors);
      throw new Error(`GraphQL Errors: ${JSON.stringify(data.errors)}`);
    }

    console.log('✅ Bitquery API Response erfolgreich erhalten');
    return data;
  }

  /**
   * Test-Funktion für API-Verbindung
   */
  async testConnection(): Promise<boolean> {
    const testQuery = `
      query TestConnection {
        Solana {
          DEXTrades(limit: { count: 1 }) {
            Block {
              Time
            }
            Trade {
              Dex {
                ProtocolName
              }
            }
          }
        }
      }
    `;

    try {
      console.log('🧪 Teste Bitquery API Verbindung...');
      await this.handleRateLimit();
      const response = await this.executeQuery(testQuery);
      
      if (response?.data?.Solana?.DEXTrades) {
        console.log('✅ Bitquery API Verbindung erfolgreich');
        return true;
      } else {
        console.error('❌ Unerwartete Antwort von Bitquery API');
        return false;
      }
    } catch (error) {
      console.error('❌ Bitquery API Verbindung fehlgeschlagen:', error);
      return false;
    }
  }
} 