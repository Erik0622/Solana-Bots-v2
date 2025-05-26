import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { startTradingBot, stopTradingBot } from '@/lib/trading/bot';

// Alle Bot-Anfragen dynamisch machen
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Hilfsfunktion zur Normalisierung von Bot-IDs
function normalizeBotId(botId: string): string {
  // Zuordnungstabelle für Kurzform zu Langform
  const idMapping: Record<string, string> = {
    'vol-tracker': 'volume-tracker',
    'trend-surfer': 'trend-surfer', // Bereits gleich
    'arb-finder': 'dip-hunter', // arb-finder ist eine alternative ID für dip-hunter
  };

  // Wenn eine Kurzform-ID vorliegt, in Langform umwandeln
  return idMapping[botId] || botId;
}

export async function POST(request: Request) {
  // No-Cache Headers für alle Antworten setzen
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  try {
    const { botId: rawBotId, wallet, action } = await request.json();
    
    // Normalisiere die Bot-ID
    const botId = normalizeBotId(rawBotId);

    if (!rawBotId || !wallet || !action) {
      return NextResponse.json({ error: 'Fehlende Parameter' }, { status: 400, headers });
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
          name: getBotNameFromId(rawBotId),
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
    console.log(`Toggle für Bot ${botId}: Neuer Status = ${newStatus ? 'active' : 'inactive'}`);
    if (newStatus) {
      result = await startTradingBot(botId);
    } else {
      result = await stopTradingBot(botId);
    }

    return NextResponse.json({
      success: true,
      botId: rawBotId, // Gib die Original-ID zurück
      status: newStatus ? 'active' : 'paused',
      message: result.message
    }, { headers });
  } catch (error) {
    console.error('Error toggling bot status:', error);
    return NextResponse.json(
      { error: 'Fehler beim Ändern des Bot-Status' }, 
      { status: 500, headers }
    );
  }
}

// Hilfsfunktion zum Ermitteln des Bot-Namens basierend auf der ID
function getBotNameFromId(botId: string): string {
  switch (botId) {
    case 'volume-tracker':
    case 'vol-tracker':
      return 'Volume Tracker';
    case 'trend-surfer':
      return 'Trend Surfer';
    case 'dip-hunter':
    case 'arb-finder':
      return 'Dip Hunter';
    default:
      return 'Trading Bot';
  }
} 