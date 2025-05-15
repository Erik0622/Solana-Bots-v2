import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock-Daten für die Entwicklung
function generateMockPerformanceData(timeframe: string) {
  const now = new Date();
  let days: number;
  
  switch (timeframe) {
    case '7d':
      days = 7;
      break;
    case '30d':
      days = 30;
      break;
    case 'all':
      days = 90; // 3 Monate für "all"
      break;
    default:
      days = 30;
  }
  
  const performanceData = [];
  let cumulativeProfit = 0;
  
  // Generiere tägliche Performance-Daten
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Zufälliger Profit zwischen -2% und +4%
    const dayProfit = parseFloat((Math.random() * 6 - 2).toFixed(2));
    cumulativeProfit += dayProfit;
    
    performanceData.push({
      date: dateStr,
      profit: dayProfit,
      cumulative: parseFloat(cumulativeProfit.toFixed(2))
    });
  }
  
  // Berechne Gesamtrenditen
  const totalProfit = {
    today: performanceData[performanceData.length - 1].profit,
    week: calculatePeriodProfit(performanceData, 7),
    month: calculatePeriodProfit(performanceData, 30),
    all: cumulativeProfit
  };

  // Entwicklergebühren
  const devFees = {
    total: parseFloat((cumulativeProfit * 0.1).toFixed(2)),
    month: parseFloat((totalProfit.month * 0.1).toFixed(2))
  };
  
  return {
    performanceData,
    totalProfit,
    devFees
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');
    const timeframe = searchParams.get('timeframe') || '30d';

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet-Adresse erforderlich' }, { status: 400 });
    }

    try {
      // Bestimme Startdatum basierend auf Zeitraum
      const now = new Date();
      let startDate = new Date();
      switch (timeframe) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case 'all':
          startDate = new Date(0); // Anfang der Zeit
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }

      // Hole Trades aus der Datenbank
      const trades = await prisma.trade.findMany({
        where: {
          bot: {
            walletAddress: wallet
          },
          timestamp: {
            gte: startDate
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      });

      // Gruppiere Trades nach Tag
      const tradesByDay = trades.reduce((acc, trade) => {
        const date = trade.timestamp.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(trade);
        return acc;
      }, {} as Record<string, any[]>);

      // Berechne tägliche und kumulative Rendite
      let cumulativeProfit = 0;
      const performanceData = Object.keys(tradesByDay).map(date => {
        const dayTrades = tradesByDay[date];
        const dayProfit = dayTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0);
        cumulativeProfit += dayProfit;
        
        return {
          date,
          profit: parseFloat(dayProfit.toFixed(2)),
          cumulative: parseFloat(cumulativeProfit.toFixed(2))
        };
      });

      // Berechne Gesamtrenditen
      const totalProfit = {
        today: performanceData.length > 0 ? performanceData[performanceData.length - 1].profit : 0,
        week: calculatePeriodProfit(performanceData, 7),
        month: calculatePeriodProfit(performanceData, 30),
        all: cumulativeProfit
      };

      // Berechne Entwicklergebühren (10% der Gewinne)
      const devFees = {
        total: parseFloat((cumulativeProfit * 0.1).toFixed(2)),
        month: parseFloat((totalProfit.month * 0.1).toFixed(2))
      };

      return NextResponse.json({
        performanceData,
        totalProfit,
        devFees
      });
      
    } catch (dbError) {
      console.warn('Datenbankfehler, verwende Mock-Daten:', dbError);
      // Im Fehlerfall Mock-Daten zurückgeben
      const mockData = generateMockPerformanceData(timeframe);
      return NextResponse.json(mockData);
    }
  } catch (error) {
    console.error('Error in performance API:', error);
    // Im Fehlerfall auch Mock-Daten zurückgeben
    const mockData = generateMockPerformanceData('30d');
    return NextResponse.json(mockData);
  }
}

// Hilfsfunktion zur Berechnung der Rendite über einen bestimmten Zeitraum
function calculatePeriodProfit(performanceData: Array<{date: string; profit: number; cumulative: number}>, days: number): number {
  if (performanceData.length === 0) return 0;
  
  const recentData = performanceData.slice(-days);
  return parseFloat(recentData.reduce((sum, day) => sum + day.profit, 0).toFixed(2));
} 