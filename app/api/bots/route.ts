import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet-Adresse erforderlich' }, { status: 400 });
    }

    // Standard-Bots, die zurückgegeben werden, wenn keine gefunden wurden oder ein Fehler auftritt
    const defaultBots = [
      {
        id: 'volume-tracker',
        name: 'Volume Tracker',
        status: 'paused',
        trades: 0,
        profitToday: 0,
        profitWeek: 0,
        profitMonth: 0
      },
      {
        id: 'trend-surfer',
        name: 'Trend Surfer',
        status: 'paused',
        trades: 0,
        profitToday: 0,
        profitWeek: 0,
        profitMonth: 0
      },
      {
        id: 'dip-hunter',
        name: 'Dip Hunter',
        status: 'paused',
        trades: 0,
        profitToday: 0,
        profitWeek: 0,
        profitMonth: 0
      }
    ];

    try {
      // Hole Bots aus der Datenbank
      const bots = await prisma.bot.findMany({
        where: {
          walletAddress: wallet
        },
        include: {
          trades: {
            orderBy: {
              timestamp: 'desc'
            },
            take: 30 // Letzte 30 Trades für Statistiken
          }
        }
      });

      // Wenn keine Bots gefunden wurden, gib die Standard-Bots zurück
      if (bots.length === 0) {
        console.log(`Keine Bots für Wallet ${wallet} gefunden, gebe Standard-Bots zurück`);
        return NextResponse.json(defaultBots);
      }

      // Berechne Statistiken für jeden Bot
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      const monthAgo = new Date(now);
      monthAgo.setDate(now.getDate() - 30);

      const formattedBots = bots.map(bot => {
        try {
          // Berechne Profits für verschiedene Zeiträume
          const todayProfit = calculateProfitForPeriod(bot.trades || [], today);
          const weekProfit = calculateProfitForPeriod(bot.trades || [], weekAgo);
          const monthProfit = calculateProfitForPeriod(bot.trades || [], monthAgo);

          return {
            id: bot.id,
            name: bot.name,
            status: bot.isActive ? 'active' : 'paused',
            trades: bot.totalTrades || 0,
            profitToday: todayProfit,
            profitWeek: weekProfit,
            profitMonth: monthProfit
          };
        } catch (botError) {
          console.error(`Fehler bei Bot ${bot.id}:`, botError);
          // Im Fehlerfall Standard-Bot-Daten zurückgeben
          return {
            id: bot.id,
            name: bot.name || 'Unbekannter Bot',
            status: bot.isActive ? 'active' : 'paused',
            trades: bot.totalTrades || 0,
            profitToday: 0,
            profitWeek: 0,
            profitMonth: 0
          };
        }
      });

      return NextResponse.json(formattedBots);
    } catch (dbError) {
      console.error('Datenbankfehler beim Abrufen der Bots:', dbError);
      // Bei Datenbankfehlern Standard-Bots zurückgeben
      return NextResponse.json(defaultBots);
    }
  } catch (error) {
    console.error('Schwerwiegender Fehler beim Abrufen der Bots:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen der Bots' }, { status: 500 });
  }
}

// Hilfsfunktion zur Berechnung des Profits für einen Zeitraum
function calculateProfitForPeriod(trades: any[], startDate: Date): number {
  if (!trades || trades.length === 0) return 0;
  
  const periodTrades = trades.filter(trade => 
    trade.timestamp && new Date(trade.timestamp) >= startDate
  );
  
  const profit = periodTrades.reduce((sum, trade) => 
    sum + (trade.profit || 0), 0
  );
  
  return parseFloat(profit.toFixed(2));
} 