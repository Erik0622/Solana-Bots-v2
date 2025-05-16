import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { startTradingBot, stopTradingBot } from '@/lib/trading/bot';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { botId, wallet, action } = await request.json();

    if (!botId || !wallet || !action) {
      return NextResponse.json({ error: 'Fehlende Parameter' }, { status: 400 });
    }

    // Hole Bot aus der Datenbank
    let bot = await prisma.bot.findUnique({
      where: { id: botId }
    });

    if (!bot) {
      // Bot existiert noch nicht, erstelle ihn
      bot = await prisma.bot.create({
        data: {
          id: botId,
          name: getBotNameFromId(botId),
          walletAddress: wallet,
          riskPercentage: 15, // Standardrisiko
          strategyType: botId, // Verwende ID als Strategie-Typ
          isActive: false
        }
      });
    }

    // Aktualisiere Bot-Status
    const newStatus = action === 'activate';
    await prisma.bot.update({
      where: { id: botId },
      data: {
        isActive: newStatus,
        walletAddress: wallet // Aktualisiere Wallet-Adresse für den Fall, dass sich diese geändert hat
      }
    });

    // Starte oder stoppe den Bot
    let result;
    if (newStatus) {
      result = await startTradingBot(botId);
    } else {
      result = await stopTradingBot(botId);
    }

    return NextResponse.json({
      success: true,
      botId,
      status: newStatus ? 'active' : 'paused',
      message: result.message
    });
  } catch (error) {
    console.error('Error toggling bot status:', error);
    return NextResponse.json({ error: 'Fehler beim Ändern des Bot-Status' }, { status: 500 });
  }
}

// Hilfsfunktion zum Ermitteln des Bot-Namens basierend auf der ID
function getBotNameFromId(botId: string): string {
  switch (botId) {
    case 'volume-tracker':
      return 'Volume Tracker';
    case 'trend-surfer':
      return 'Trend Surfer';
    case 'dip-hunter':
      return 'Dip Hunter';
    default:
      return 'Trading Bot';
  }
} 