/**
 * New Token Simulator für Raydium Migration
 * 
 * Simuliert das Trading-Verhalten von Bots auf NEUEN TOKEN nach Raydium Migration.
 * Diese Token haben extreme Volatilität, wenig/keine Historie und typische Muster.
 */

import { PriceData } from './historicalDataService';
import { normalizeBotId } from '../botState';

// Typische Muster neuer Token nach Raydium Migration
export interface NewTokenPattern {
  initialPump: number; // Wie stark der erste Pump war (100-10000%)
  pumpDuration: number; // Wie lange der Pump anhält (Minuten)
  dumpSeverity: number; // Wie stark der Dump ist (50-95%)
  volatility: number; // Allgemeine Volatilität (10-50%)
  volumeBurst: number; // Volume-Spikes (2-20x normal)
}

// Verschiedene neue Token-Archetypen
const newTokenProfiles: Record<string, NewTokenPattern> = {
  'meme-coin': {
    initialPump: 5000, // 5000% initial pump
    pumpDuration: 30, // 30 Minuten
    dumpSeverity: 80, // 80% dump
    volatility: 35,
    volumeBurst: 15
  },
  'utility-token': {
    initialPump: 200, // 200% initial pump
    pumpDuration: 120, // 2 Stunden
    dumpSeverity: 60, // 60% dump
    volatility: 20,
    volumeBurst: 8
  },
  'quick-flip': {
    initialPump: 1000, // 1000% pump
    pumpDuration: 15, // 15 Minuten
    dumpSeverity: 90, // 90% dump
    volatility: 45,
    volumeBurst: 20
  }
};

/**
 * Generiert realistische Preisdaten für einen neuen Token
 */
export function generateNewTokenData(
  botType: string,
  hoursOfData: number = 24 // Nur 24 Stunden Historie für neue Token
): PriceData[] {
  const profile = getTokenProfileForBot(botType);
  const intervalMinutes = 5; // 5-Minuten-Kerzen für neue Token
  const dataPoints = Math.floor((hoursOfData * 60) / intervalMinutes);
  
  const data: PriceData[] = [];
  let currentPrice = 0.000001; // Startet bei 0.000001 USDC (typisch für neue Token)
  let currentVolume = 1000; // Basis-Volumen
  
  const pumpStartIndex = Math.floor(dataPoints * 0.1); // Pump startet bei 10%
  const pumpEndIndex = pumpStartIndex + Math.floor(profile.pumpDuration / intervalMinutes);
  const dumpEndIndex = pumpEndIndex + Math.floor(profile.pumpDuration / intervalMinutes * 0.5);
  
  for (let i = 0; i < dataPoints; i++) {
    const timestamp = Date.now() - (dataPoints - i) * intervalMinutes * 60 * 1000;
    
    let priceChange = 0;
    let volumeMultiplier = 1;
    
    // Phase 1: Pre-Pump (niedrige Volatilität)
    if (i < pumpStartIndex) {
      priceChange = (Math.random() - 0.5) * 0.05; // ±2.5%
      volumeMultiplier = 0.5 + Math.random() * 0.5; // 50-100% normal volume
    }
    // Phase 2: PUMP (extreme Steigerung)
    else if (i >= pumpStartIndex && i < pumpEndIndex) {
      const pumpProgress = (i - pumpStartIndex) / (pumpEndIndex - pumpStartIndex);
      const targetMultiplier = profile.initialPump / 100; // z.B. 50x für 5000%
      
      // Exponentieller Anstieg während des Pumps
      priceChange = 0.1 + (pumpProgress * targetMultiplier / (pumpEndIndex - pumpStartIndex));
      volumeMultiplier = profile.volumeBurst * (1 + pumpProgress * 2); // Enormes Volumen
    }
    // Phase 3: DUMP (extremer Absturz)
    else if (i >= pumpEndIndex && i < dumpEndIndex) {
      const dumpProgress = (i - pumpEndIndex) / (dumpEndIndex - pumpEndIndex);
      priceChange = -0.1 - (dumpProgress * profile.dumpSeverity / 100); // Massiver Sell-off
      volumeMultiplier = profile.volumeBurst * (2 - dumpProgress); // Hohes Volumen beim Dump
    }
    // Phase 4: Post-Dump (hohe Volatilität, niedrigere Preise)
    else {
      priceChange = (Math.random() - 0.5) * (profile.volatility / 100); // Hohe Volatilität
      volumeMultiplier = 0.3 + Math.random() * 1.5; // Unregelmäßiges Volumen
      
      // Gelegentliche kleinere Pumps
      if (Math.random() < 0.03) { // 3% Chance
        priceChange += 0.2 + Math.random() * 0.8; // 20-100% kleiner Pump
        volumeMultiplier *= 5;
      }
    }
    
    // Preis aktualisieren
    currentPrice *= (1 + priceChange);
    currentPrice = Math.max(currentPrice, 0.0000001); // Minimum-Preis
    
    // Volumen aktualisieren
    currentVolume = Math.max(1000, currentVolume * 0.95 + (Math.random() * 5000 * volumeMultiplier));
    
    // OHLC für die Kerze generieren
    const priceVariation = currentPrice * (profile.volatility / 100) * (Math.random() * 0.5);
    const open = i > 0 ? data[i-1].close : currentPrice;
    
    data.push({
      timestamp,
      open,
      high: Math.max(open, currentPrice) + priceVariation,
      low: Math.min(open, currentPrice) - priceVariation,
      close: currentPrice,
      volume: currentVolume
    });
  }
  
  return data;
}

/**
 * Wählt das Token-Profil basierend auf dem Bot-Typ
 */
function getTokenProfileForBot(botType: string): NewTokenPattern {
  const normalizedBotId = normalizeBotId(botType);
  
  switch (normalizedBotId) {
    case 'volume-tracker':
      return newTokenProfiles['meme-coin']; // Meme-Coins haben massive Volume-Spikes
    case 'trend-surfer':
      return newTokenProfiles['utility-token']; // Utility-Token haben längere Trends
    case 'dip-hunter':
      return newTokenProfiles['quick-flip']; // Quick-flips haben extreme Dips
    default:
      return newTokenProfiles['meme-coin'];
  }
}

/**
 * Generiert REALISTISCHE Performance für neue Token-Bots
 */
export function calculateRealisticNewTokenPerformance(
  botType: string,
  data: PriceData[],
  riskPercentage: number
): {
  profitPercentage: number;
  tradeCount: number;
  successRate: number;
  dailyData: { date: string; value: number }[];
} {
  const normalizedBotId = normalizeBotId(botType);
  
  // Realistische Performance-Metriken für neue Token
  const performanceProfiles = {
    'volume-tracker': {
      baseSuccessRate: 45, // Niedriger bei neuen Token
      avgTradesPerDay: 8,
      volatilityBonus: 1.5
    },
    'trend-surfer': {
      baseSuccessRate: 38, // Trends sind bei neuen Token unvorhersagbar
      avgTradesPerDay: 5,
      volatilityBonus: 1.2
    },
    'dip-hunter': {
      baseSuccessRate: 55, // Dip-hunting funktioniert gut bei extremen Bewegungen
      avgTradesPerDay: 12,
      volatilityBonus: 1.8
    }
  };
  
  const profile = performanceProfiles[normalizedBotId] || performanceProfiles['volume-tracker'];
  
  // Berechne realistische Metrics
  const tradeCount = Math.floor(profile.avgTradesPerDay * (data.length / (24 * 12))); // 5-min intervals
  const successRate = Math.max(25, Math.min(70, profile.baseSuccessRate + (Math.random() * 20 - 10)));
  
  // Profit ist bei neuen Token extrem volatil
  const baseProfit = (riskPercentage / 10) * profile.volatilityBonus;
  const profitPercentage = baseProfit * (0.5 + Math.random() * 2); // -50% bis +200% vom baseline
  
  // Tägliche Performance aus den Preisdaten extrahieren
  const dailyData = extractDailyPerformance(data, profitPercentage);
  
  return {
    profitPercentage,
    tradeCount,
    successRate,
    dailyData
  };
}

/**
 * Extrahiert tägliche Performance aus Preisdaten
 */
function extractDailyPerformance(
  data: PriceData[], 
  totalProfit: number
): { date: string; value: number }[] {
  const dailyGroups: { [date: string]: PriceData[] } = {};
  
  // Gruppiere nach Tagen
  data.forEach(point => {
    const date = new Date(point.timestamp).toISOString().split('T')[0];
    if (!dailyGroups[date]) {
      dailyGroups[date] = [];
    }
    dailyGroups[date].push(point);
  });
  
  // Berechne tägliche Performance
  const dailyData: { date: string; value: number }[] = [];
  const dates = Object.keys(dailyGroups).sort();
  let cumulativeProfit = 0;
  
  dates.forEach((date, index) => {
    const dayData = dailyGroups[date];
    const dailyChange = (dayData[dayData.length - 1].close - dayData[0].open) / dayData[0].open;
    
    // Simuliere Bot-Performance basierend auf Marktbewegung
    const botPerformance = dailyChange * (0.5 + Math.random()); // Bot macht 50-150% der Marktbewegung
    cumulativeProfit += botPerformance * 100;
    
    dailyData.push({
      date,
      value: 100 + cumulativeProfit
    });
  });
  
  return dailyData;
}

/**
 * Hauptfunktion: Generiert realistische neue Token-Simulation
 */
export function simulateNewTokenTrading(
  botType: string,
  riskPercentage: number = 10
): {
  profitPercentage: number;
  tradeCount: number;
  successRate: number;
  dailyData: { date: string; value: number }[];
  dataSource: 'new-token';
} {
  // Generiere neue Token-Daten
  const tokenData = generateNewTokenData(botType, 24);
  
  // Berechne realistische Performance
  const performance = calculateRealisticNewTokenPerformance(botType, tokenData, riskPercentage);
  
  return {
    ...performance,
    dataSource: 'new-token'
  };
} 