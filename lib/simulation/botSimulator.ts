/**
 * Bot Trading Simulator
 * 
 * Simuliert das Tradingverhalten verschiedener Bottypen auf historischen Daten.
 * Beginnt mit einem Startkapital von 100$ und berücksichtigt 1% Transaktionsgebühren.
 */

import { getHistoricalData, PriceData } from './historicalDataService';
import { getRealHistoricalData } from '../marketData/realDataService';
import { normalizeBotId } from '../botState';

// Ergebnistypen für die Simulation
export interface TradeAction {
  timestamp: number;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  usdValue: number;
  fee: number;
}

export interface SimulationResult {
  botId: string;
  initialCapital: number;
  finalCapital: number;
  profit: number;
  profitPercentage: number;
  trades: TradeAction[];
  dailyPerformance: { date: string; value: number }[];
}

// Verschiedene Bot-Strategien
interface BotStrategy {
  shouldBuy: (data: PriceData[], currentIndex: number) => boolean;
  shouldSell: (data: PriceData[], currentIndex: number, entryPrice: number) => boolean;
}

// Strategien für die verschiedenen Bot-Typen
const strategies: Record<string, BotStrategy> = {
  'volume-tracker': {
    shouldBuy: (data, index) => {
      if (index < 5) return false;

      const relevantData = data.slice(index - 5, index + 1); // +1 to include current
      const averageVolume = relevantData.slice(0, 5).reduce((sum, d) => sum + d.volume, 0) / 5;
      const currentVolume = relevantData[5].volume;
      const currentClose = relevantData[5].close;
      const prevClose = relevantData[4].close;

      const volumeCondition = currentVolume > averageVolume * 1.5;
      const priceCondition = currentClose >= prevClose;
      
      // console.log(`VolumeTracker[${index}] | AvgVol: ${averageVolume.toFixed(2)}, CurrVol: ${currentVolume.toFixed(2)} -> VolCond: ${volumeCondition} | PrevClose: ${prevClose.toFixed(2)}, CurrClose: ${currentClose.toFixed(2)} -> PriceCond: ${priceCondition} | Result: ${volumeCondition && priceCondition}`);
      
      return volumeCondition && priceCondition;
    },
    shouldSell: (data, index, entryPrice) => {
      if (index === 0) return false;
      
      const currentPrice = data[index].close;
      
      // Take-Profit bei 15% Gewinn (reduziert von 20%)
      if (currentPrice >= entryPrice * 1.15) {
        return true;
      }
      
      // Stop-Loss bei 10% Verlust
      if (currentPrice <= entryPrice * 0.9) {
        return true;
      }
      
      // Nach 12 Stunden verkaufen (reduziert von 24 Stunden)
      // Bei 15-Minuten-Intervallen entspricht das 48 Intervallen
      const MAX_HOLDING_PERIODS = 48;
      if (index >= MAX_HOLDING_PERIODS) {
        return true;
      }
      
      return false;
    }
  },
  'trend-surfer': {
    shouldBuy: (data, index) => {
      if (index < 6) return false; // Benötigt Daten bis index-4, also mind. 5 vorherige + aktueller
      
      const current = data[index];
      const prev1 = data[index-1];
      const prev2 = data[index-2];
      const prev4 = data[index-4]; // Für Preisanstieg

      // Zwei grüne Kerzen in Folge
      const risingCandles = 
        current.close > current.open &&
        prev1.close > prev1.open;
        
      // Ansteigendes Volumen - weniger strenge Bedingung
      const risingVolume = 
        current.volume > prev1.volume * 0.9;
        
      // 10% Preisanstieg in der letzten Stunde (4 Intervalle bei 15min)
      // Sicherstellen, dass prev4 existiert (obwohl index < 6 das abdecken sollte)
      const priceIncrease = prev4 ? (current.close - prev4.close) / prev4.close > 0.1 : false;
        
      // console.log(`TrendSurfer[${index}] | RisingCandles: ${risingCandles} (Curr: ${current.open.toFixed(2)}-${current.close.toFixed(2)}, Prev1: ${prev1.open.toFixed(2)}-${prev1.close.toFixed(2)}) | RisingVol: ${risingVolume} (Curr: ${current.volume.toFixed(2)}, Prev1: ${prev1.volume.toFixed(2)}) | PriceInc: ${priceIncrease} (Curr: ${current.close.toFixed(2)}, Prev4: ${prev4 ? prev4.close.toFixed(2) : 'N/A'}) | Result: ${risingCandles && (risingVolume || priceIncrease)}`);

      return risingCandles && (risingVolume || priceIncrease);
    },
    shouldSell: (data, index, entryPrice) => {
      if (index === 0) return false;
      
      const currentPrice = data[index].close;
      
      // Gewinnmitnahme bei 15% (reduziert von 20%)
      if (currentPrice >= entryPrice * 1.15) {
        return true;
      }
      
      // Stop-Loss bei 10% Verlust (weniger als 15%)
      if (currentPrice <= entryPrice * 0.9) {
        return true;
      }
      
      // Trendumkehr - wenn eine rote Kerze auftritt
      const trendReversal = 
        data[index].close < data[index].open;
        
      if (trendReversal && currentPrice > entryPrice) {
        return true;
      }
      
      return false;
    }
  },
  'dip-hunter': {
    shouldBuy: (data, index) => {
      if (index < 10) return false;
      
      // Preis ist um 30-60% vom lokalen Höchststand gefallen
      const localHighPrice = Math.max(...data.slice(index - 10, index).map(d => d.high));
      const currentPrice = data[index].close;
      const dropPercentage = (localHighPrice - currentPrice) / localHighPrice;
      
      // Volumen bleibt stabil
      const averageVolume = data.slice(index - 5, index).reduce((sum, d) => sum + d.volume, 0) / 5;
      const stableVolume = data[index].volume >= averageVolume * 0.7;
      
      return dropPercentage >= 0.3 && dropPercentage <= 0.6 && stableVolume;
    },
    shouldSell: (data, index, entryPrice) => {
      if (index === 0) return false;
      
      const currentPrice = data[index].close;
      
      // 50% Gewinnmitnahme bei 20% Profit (simuliert als vollständiger Verkauf)
      if (currentPrice >= entryPrice * 1.2) {
        return true;
      }
      
      // Stop-Loss bei 10% Verlust
      if (currentPrice <= entryPrice * 0.9) {
        return true;
      }
      
      // Maximale Haltezeit: 1 Stunde (4 Intervalle bei 15min)
      const MAX_HOLDING_PERIODS = 4;
      if (index >= MAX_HOLDING_PERIODS) {
        return true;
      }
      
      return false;
    }
  }
};

/**
 * Lädt die besten verfügbaren historischen Daten - erst echte Daten, dann Fallback zu simulierten
 */
async function getHistoricalDataWithFallback(
  botId: string, 
  days: number
): Promise<PriceData[]> {
  try {
    // Versuche erst, echte Daten zu laden
    console.log(`Lade echte Marktdaten für ${botId}...`);
    return await getRealHistoricalData(botId, days);
  } catch (error) {
    console.warn(`Konnte keine echten Daten für ${botId} laden, verwende Simulationsdaten als Fallback`, error);
    // Fallback zu simulierten Daten
    return await getHistoricalData(botId, days);
  }
}

/**
 * Simuliert das Trading-Verhalten eines Bots auf historischen Daten
 * @param useRealData Wenn true, werden echte Marktdaten verwendet (falls verfügbar)
 */
export async function simulateBot(
  botId: string, 
  days: number = 7, 
  initialCapital: number = 100,
  useRealData: boolean = true
): Promise<SimulationResult> {
  const normalizedBotId = normalizeBotId(botId);
  const strategy = strategies[normalizedBotId] || strategies['volume-tracker']; // Fallback zur Volume-Tracker-Strategie
  
  // Historische Daten laden
  const historicalData = useRealData 
    ? await getHistoricalDataWithFallback(normalizedBotId, days)
    : await getHistoricalData(normalizedBotId, days);
  
  // Simulationsvariablen
  let usdBalance = initialCapital;
  let tokenBalance = 0;
  let entryPrice = 0;
  const trades: TradeAction[] = [];
  const dailyBalances: { [date: string]: number } = {};
  
  // Tracking für mehrere Tage
  const startDate = new Date(historicalData[0].timestamp);
  startDate.setHours(0, 0, 0, 0);
  const startTimestamp = startDate.getTime();
  
  // Tages-Buckets vorbereiten
  for (let i = 0; i < days; i++) {
    const date = new Date(startTimestamp + i * 24 * 60 * 60 * 1000);
    const dateString = date.toISOString().split('T')[0];
    dailyBalances[dateString] = initialCapital;
  }
  
  // Simuliere das Trading über die historischen Daten
  for (let i = 0; i < historicalData.length; i++) {
    const currentData = historicalData[i];
    const currentDay = new Date(currentData.timestamp);
    currentDay.setHours(0, 0, 0, 0);
    const currentDateString = currentDay.toISOString().split('T')[0];
    
    // Aktuelle Bewertung berechnen (USD + Token in USD)
    const portfolioValue = usdBalance + (tokenBalance * currentData.close);
    
    // Tägliche Performance tracken
    if (dailyBalances[currentDateString] === initialCapital) {
      // Erster Wert des Tages
      dailyBalances[currentDateString] = portfolioValue;
    } else {
      // Letzter Wert des Tages
      dailyBalances[currentDateString] = portfolioValue;
    }
    
    // Kaufsignal bei leerem Portfolio
    if (tokenBalance === 0 && strategy.shouldBuy(historicalData, i)) {
      const investmentAmount = usdBalance * 0.95; // 95% des Kapitals investieren
      const fee = investmentAmount * 0.01; // 1% Gebühr
      const tradeAmount = investmentAmount - fee;
      tokenBalance = tradeAmount / currentData.close;
      entryPrice = currentData.close;
      usdBalance -= investmentAmount;
      
      trades.push({
        timestamp: currentData.timestamp,
        type: 'buy',
        price: currentData.close,
        amount: tokenBalance,
        usdValue: tradeAmount,
        fee
      });
    }
    // Verkaufssignal bei gefülltem Portfolio
    else if (tokenBalance > 0 && strategy.shouldSell(historicalData, i, entryPrice)) {
      const sellValue = tokenBalance * currentData.close;
      const fee = sellValue * 0.01; // 1% Gebühr
      const tradeAmount = sellValue - fee;
      usdBalance += tradeAmount;
      
      trades.push({
        timestamp: currentData.timestamp,
        type: 'sell',
        price: currentData.close,
        amount: tokenBalance,
        usdValue: tradeAmount,
        fee
      });
      
      tokenBalance = 0;
    }
  }
  
  // Wenn am Ende noch Tokens übrig sind, zum letzten Preis verkaufen
  if (tokenBalance > 0 && historicalData.length > 0) {
    const lastPrice = historicalData[historicalData.length - 1].close;
    const sellValue = tokenBalance * lastPrice;
    const fee = sellValue * 0.01;
    const tradeAmount = sellValue - fee;
    usdBalance += tradeAmount;
    
    trades.push({
      timestamp: historicalData[historicalData.length - 1].timestamp,
      type: 'sell',
      price: lastPrice,
      amount: tokenBalance,
      usdValue: tradeAmount,
      fee
    });
    
    tokenBalance = 0;
  }
  
  // Endkapital und Gewinn berechnen
  const finalCapital = usdBalance;
  const profit = finalCapital - initialCapital;
  const profitPercentage = (profit / initialCapital) * 100;
  
  // Tagesperformance in ein Array umwandeln
  const dailyPerformance = Object.entries(dailyBalances).map(([date, value]) => ({
    date,
    value
  }));
  
  return {
    botId: normalizedBotId,
    initialCapital,
    finalCapital,
    profit,
    profitPercentage,
    trades,
    dailyPerformance
  };
}

/**
 * Gibt die prozentuale Leistung eines Bots für die letzten 7 Tage zurück
 * @param useRealData Wenn true, werden echte Marktdaten verwendet
 */
export async function getBotPerformance(
  botId: string, 
  useRealData: boolean = true
): Promise<number> {
  const result = await simulateBot(botId, 7, 100, useRealData);
  return parseFloat(result.profitPercentage.toFixed(2));
}

/**
 * Gibt eine Zusammenfassung der Simulation für die UI zurück
 * @param useRealData Wenn true, werden echte Marktdaten verwendet
 */
export async function getSimulationSummary(
  botId: string,
  useRealData: boolean = true
): Promise<{
  profitPercentage: number;
  tradeCount: number;
  successRate: number;
  dailyData: { date: string; value: number }[];
}> {
  const simulation = await simulateBot(botId, 7, 100, useRealData);
  
  // Erfolgreiche Trades zählen
  const successfulTrades = simulation.trades.filter(trade => 
    trade.type === 'sell' && trade.usdValue > 0
  ).length;
  
  const totalSellTrades = simulation.trades.filter(trade => 
    trade.type === 'sell'
  ).length;
  
  const successRate = totalSellTrades > 0 
    ? (successfulTrades / totalSellTrades) * 100
    : 0;
    
  return {
    profitPercentage: simulation.profitPercentage,
    tradeCount: simulation.trades.length,
    successRate,
    dailyData: simulation.dailyPerformance
  };
} 