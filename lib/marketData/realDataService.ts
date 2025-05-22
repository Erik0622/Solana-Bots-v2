/**
 * Real Market Data Service
 * 
 * Lädt echte Marktdaten für Solana-Tokens von verschiedenen APIs:
 * - CoinGecko: Für historische Preisdaten
 * - Jupiter: Für aktuelle Marktdaten und Liquidität
 * - Solscan: Für On-Chain-Daten
 */

import axios from 'axios';
import { PriceData, PriceDataPoint } from '../simulation/historicalDataService';

// API-Konfiguration
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const JUPITER_API = 'https://price.jup.ag/v4';
const SOLSCAN_API = 'https://public-api.solscan.io';

// Rate Limiting und Caching
const cache = new Map<string, { data: PriceData[], timestamp: number }>();
const CACHE_EXPIRY = 15 * 60 * 1000; // 15 Minuten

// Mapping von Bot-Typen zu realen Token-Adressen
const botTokenMapping: Record<string, { 
  tokenAddress: string, 
  coinGeckoId?: string,
  name: string
}> = {
  'volume-tracker': {
    tokenAddress: 'So11111111111111111111111111111111111111112', // SOL
    coinGeckoId: 'solana',
    name: 'Solana'
  },
  'trend-surfer': {
    tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    coinGeckoId: 'usd-coin',
    name: 'USD Coin'
  },
  'dip-hunter': {
    tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
    coinGeckoId: 'bonk',
    name: 'Bonk'
  }
};

/**
 * Lädt historische Preisdaten von CoinGecko
 */
export async function fetchHistoricalData(
  botType: string,
  days: number = 7
): Promise<PriceData[]> {
  try {
    const tokenInfo = botTokenMapping[botType];
    if (!tokenInfo || !tokenInfo.coinGeckoId) {
      throw new Error(`Keine CoinGecko-ID für Bot-Typ ${botType} gefunden`);
    }

    // Prüfen, ob Daten im Cache sind
    const cacheKey = `${botType}_${days}`;
    const cachedData = cache.get(cacheKey);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp) < CACHE_EXPIRY) {
      console.log(`Verwende gecachte Daten für ${botType}`);
      return cachedData.data;
    }

    // CoinGecko API aufrufen
    const response = await axios.get(`${COINGECKO_API}/coins/${tokenInfo.coinGeckoId}/market_chart`, {
      params: {
        vs_currency: 'usd',
        days: days,
        interval: 'hourly'
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SolanaTradingBot/1.0.0'
      }
    });

    if (!response.data || !response.data.prices || !response.data.volumes) {
      throw new Error('Ungültiges Antwortformat von CoinGecko');
    }

    // Daten transformieren
    const prices = response.data.prices; // [timestamp, price]
    const volumes = response.data.volumes; // [timestamp, volume]
    
    const formattedData: PriceData[] = [];
    
    for (let i = 0; i < prices.length; i++) {
      const timestamp = prices[i][0];
      const price = prices[i][1];
      
      // Entsprechendes Volumen suchen
      let volume = 0;
      const volumeEntry = volumes.find((v: [number, number]) => 
        Math.abs(v[0] - timestamp) < 1000 * 60 * 60 // innerhalb einer Stunde
      );
      
      if (volumeEntry) {
        volume = volumeEntry[1];
      }
      
      // OHLC-Daten approximieren (CoinGecko bietet nur Schlusskurse)
      const priceVariation = price * 0.01 * (Math.random() * 2 - 1); // ±1%
      
      formattedData.push({
        timestamp,
        open: price - priceVariation,
        high: price + priceVariation * 2,
        low: price - priceVariation * 2,
        close: price,
        volume
      });
    }
    
    // In Cache speichern
    cache.set(cacheKey, { data: formattedData, timestamp: now });
    
    return formattedData;
  } catch (error) {
    console.error('Fehler beim Laden historischer Daten:', error);
    throw error;
  }
}

/**
 * Aktuelle Marktdaten von Jupiter API abrufen
 */
export async function fetchCurrentPrice(tokenAddress: string): Promise<{
  price: number;
  liquidity: number;
  change24h: number;
}> {
  try {
    const response = await axios.get(`${JUPITER_API}/price`, {
      params: {
        ids: tokenAddress
      }
    });

    const data = response.data?.data?.[tokenAddress];
    
    if (!data) {
      throw new Error(`Keine Daten für Token ${tokenAddress} gefunden`);
    }
    
    return {
      price: data.price || 0,
      liquidity: data.liquidity || 0,
      change24h: data.change24h || 0
    };
  } catch (error) {
    console.error('Fehler beim Abrufen des aktuellen Preises:', error);
    throw error;
  }
}

/**
 * Umrechnen von OHLC-Daten in einfache Preispunkte für Charts
 */
export function convertToDataPoints(data: PriceData[]): PriceDataPoint[] {
  return data.map(item => ({
    timestamp: item.timestamp,
    price: item.close,
    volume: item.volume
  }));
}

/**
 * Hilfsfunktion zur Normalisierung von Token-Adressen
 */
export function getTokenAddressForBot(botType: string): string {
  const tokenInfo = botTokenMapping[botType];
  if (!tokenInfo) {
    throw new Error(`Kein Token für Bot-Typ ${botType} gefunden`);
    }
    
  return tokenInfo.tokenAddress;
}

/**
 * Öffentliche API: Lädt historische Daten für einen Bot-Typ
 */
export async function getRealHistoricalData(
  botType: string, 
  days: number = 7
): Promise<PriceData[]> {
  try {
    return await fetchHistoricalData(botType, days);
  } catch (error) {
    console.error(`Fehler beim Laden realer Daten für ${botType}:`, error);
    
    // Als Fallback können wir zum Testen die simulierten Daten verwenden
    // In der Produktion würden wir hier einen anderen Fehlerbehandlungsmechanismus implementieren
    console.warn('Verwende simulierte Daten als Fallback');
    
    // Hier würden wir die simulierten Daten aus historicalDataService importieren
    // Für jetzt werfen wir den Fehler weiter
    throw error;
  }
} 