import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isBotActive } from '@/lib/trading/bot';

// Diese Route gibt den aktuellen Status des Bots zurück
export async function GET(request: Request) {
  try {
    // Parameter aus der URL holen
    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('botId');

    if (!botId) {
      return NextResponse.json({ error: 'Bot-ID fehlt' }, { status: 400 });
    }

    // Versuche zuerst den Wert aus der persistenten Bot-Map zu holen (schneller)
    const isActiveFromMemory = isBotActive(botId);

    // Versuche auch aus der Datenbank zu lesen (falls verfügbar)
    try {
      const bot = await prisma.bot.findUnique({
        where: { id: botId },
        select: { isActive: true }
      });

      // Kombiniere beide Status-Informationen (Memory und DB)
      // Ein Bot gilt als aktiv, wenn entweder der Memory-Status oder der DB-Status aktiv ist
      const isActive = isActiveFromMemory || (bot?.isActive || false);
      
      return NextResponse.json({
        botId,
        status: isActive ? 'active' : 'paused',
      });
    } catch (dbError) {
      // Bei Datenbankfehlern nur den Memory-Status zurückgeben
      console.error('Datenbankfehler beim Abrufen des Bot-Status:', dbError);
      return NextResponse.json({
        botId,
        status: isActiveFromMemory ? 'active' : 'paused',
      });
    }
  } catch (error) {
    console.error('Fehler beim Abrufen des Bot-Status:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen des Bot-Status' }, { status: 500 });
  }
} 