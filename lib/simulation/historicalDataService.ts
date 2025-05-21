/**
 * Historical Data Service
 * 
 * Dient zum Laden und Simulieren historischer Marktdaten für die letzten 7 Tage
 */

import { normalizeBotId } from '../botState';

export interface PriceData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceDataPoint {
  timestamp: number;
  price: number;
  volume: number;
}

// Mock-Preisdaten für verschiedene Bot-Typen falls keine echten Daten verfügbar sind
const botMarketPatterns = {
  'volume-tracker': { volatility: 0.15, trend: 0.03, volumeSpikes: 4, recoveryRate: 0.6 },
  'trend-surfer': { volatility: 0.25, trend: 0.05, volumeSpikes: 2, recoveryRate: 0.7 },
  'dip-hunter': { volatility: 0.20, trend: 0.02, volumeSpikes: 6, recoveryRate: 0.9 },
};

// Cache für historische Daten
const dataCache = new Map<string, PriceData[]>();

/**
 * Erzeugt simulierte historische Daten für einen bestimmten Bot-Typ
 * Kann später durch echte API-Aufrufe ersetzt werden
 */
function generateHistoricalData(botType: string, days: number = 7, interval: number = 15): PriceData[] {
  const normalizedBotType = normalizeBotId(botType);
  
  // Wenn wir die Daten bereits im Cache haben, geben wir sie zurück
  const cacheKey = `${normalizedBotType}_${days}_${interval}`;
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey) || [];
  }
  
  // Muster für diesen Bot-Typ bestimmen
  const pattern = botMarketPatterns[normalizedBotType as keyof typeof botMarketPatterns] || 
                  botMarketPatterns['volume-tracker']; // Fallback
  
  const now = Date.now();
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const millisecondsPerInterval = interval * 60 * 1000;
  const intervals = Math.floor((days * millisecondsPerDay) / millisecondsPerInterval);
  
  const result: PriceData[] = [];
  
  // Startpreis und -volumen
  let price = 1.0; // In USD
  let volume = 1000000; // Basisvolumen
  
  // Random seed basierend auf Bot-Typ, um konsistente Muster für den gleichen Bot zu erzeugen
  const seed = normalizedBotType.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = () => {
    // Einfache deterministischer Zufallsgenerator mit Seed
    const x = Math.sin(seed + result.length) * 10000;
    return x - Math.floor(x);
  };
  
  for (let i = 0; i < intervals; i++) {
    // Zeitstempel für diesen Intervall
    const timestamp = now - ((intervals - i) * millisecondsPerInterval);
    
    // Zeitabhängige Faktoren (Tageszeit, Wochentag)
    const date = new Date(timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay(); // 0 = Sonntag, 6 = Samstag
    
    // Höhere Aktivität während Handelszeiten
    const timeMultiplier = (hour >= 8 && hour <= 22) ? 1.2 : 0.8;
    // Weniger Aktivität am Wochenende
    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.1;
    
    // Zufällige Preisbewegung basierend auf Volatilität des Bot-Typs
    const randomChange = (random() * 2 - 1) * pattern.volatility * timeMultiplier * weekendMultiplier;
    // Trendbasierte Bewegung
    const trendChange = pattern.trend * (random() > 0.45 ? 1 : -1) * timeMultiplier;
    
    // Volumenschub?
    const hasVolumeSpike = random() < (0.05 * pattern.volumeSpikes / intervals);
    const volumeMultiplier = hasVolumeSpike ? 3 + random() * 5 : 0.8 + random() * 0.4;
    
    // Preisanpassungen berechnen
    const totalPriceChange = randomChange + trendChange;
    price = Math.max(0.1, price * (1 + totalPriceChange));
    volume = volume * volumeMultiplier;
    
    // Bei Volumenschüben passen wir den Preis stärker an
    if (hasVolumeSpike) {
      const spikeDirection = random() > 0.4 ? 1 : -1;
      price = price * (1 + spikeDirection * 0.08 * (1 + random()));
    }
    
    // Wenn Preis stark gefallen ist, simuliere Erholung für bestimmte Bot-Typen
    if (result.length > 0 && price < result[result.length - 1].close * 0.85) {
      if (random() < pattern.recoveryRate) {
        price = result[result.length - 1].close * (0.9 + random() * 0.15);
      }
    }
    
    // High, Low und Close berechnen
    const volatilityRange = price * pattern.volatility * (0.5 + random() * 0.5);
    const high = price + volatilityRange * random();
    const low = price - volatilityRange * random();
    
    result.push({
      timestamp,
      open: price,
      high,
      low,
      close: price,
      volume
    });
  }
  
  // Speichere die generierten Daten im Cache
  dataCache.set(cacheKey, result);
  
  return result;
}

/**
 * Konvertiert OHLCV-Daten in einfachere Preispunkte für Chart-Anzeige
 */
export function convertToDataPoints(data: PriceData[]): PriceDataPoint[] {
  return data.map(item => ({
    timestamp: item.timestamp,
    price: item.close,
    volume: item.volume
  }));
}

/**
 * Lädt historische Daten für einen Bot-Typ
 * Verwendet Mock-Daten oder API-Daten je nach Verfügbarkeit
 */
export async function getHistoricalData(
  botType: string, 
  days: number = 7, 
  interval: number = 15
): Promise<PriceData[]> {
  try {
    // TODO: Hier könnte später ein echter API-Aufruf für Solana-Token-Daten implementiert werden
    
    // Für jetzt verwenden wir simulierte Daten
    return generateHistoricalData(botType, days, interval);
  } catch (error) {
    console.error('Fehler beim Laden historischer Daten:', error);
    return [];
  }
}

/**
 * Holt historische Daten für mehrere Bot-Typen
 */
export async function getMultipleHistoricalData(
  botTypes: string[],
  days: number = 7,
  interval: number = 15
): Promise<Record<string, PriceData[]>> {
  const result: Record<string, PriceData[]> = {};
  
  for (const botType of botTypes) {
    result[normalizeBotId(botType)] = await getHistoricalData(botType, days, interval);
  }
  
  return result;
} 