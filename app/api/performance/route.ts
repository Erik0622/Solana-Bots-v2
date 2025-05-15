import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');
    const timeframe = searchParams.get('timeframe') || '30d';

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet-Adresse erforderlich' }, { status: 400 });
    }

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

    try {
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

      // Wenn keine Trades gefunden wurden, leere Daten zurückgeben
      if (!trades || trades.length === 0) {
        return NextResponse.json({
          performanceData: [],
          totalProfit: {
            today: 0,
            week: 0,
            month: 0,
            all: 0
          },
          devFees: {
            total: 0,
            month: 0
          }
        });
      }

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
      console.error('Datenbankfehler bei Performance-API:', dbError);
      
      // Leere Performance-Daten zurückgeben
      return NextResponse.json({
        performanceData: [],
        totalProfit: {
          today: 0,
          week: 0,
          month: 0,
          all: 0
        },
        devFees: {
          total: 0,
          month: 0
        }
      });
    }
  } catch (error) {
    console.error('Error in performance API:', error);
    return NextResponse.json({ error: 'Server error in performance calculation' }, { status: 500 });
  }
}

// Hilfsfunktion zur Berechnung der Rendite über einen bestimmten Zeitraum
function calculatePeriodProfit(performanceData: Array<{date: string; profit: number; cumulative: number}>, days: number): number {
  if (performanceData.length === 0) return 0;
  
  const recentData = performanceData.slice(-days);
  return parseFloat(recentData.reduce((sum, day) => sum + day.profit, 0).toFixed(2));
} 