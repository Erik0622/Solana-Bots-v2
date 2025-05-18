import { NextResponse } from 'next/server';
import prisma, { getMockModeStatus } from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // Diese Route dynamisch machen

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

// Diese Route gibt den aktuellen Status des Bots zurück
export async function GET(request: Request) {
  // No-Cache Headers für alle Antworten setzen
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  try {
    const { searchParams } = new URL(request.url);
    const rawBotId = searchParams.get('botId');

    if (!rawBotId) {
      return NextResponse.json(
        { error: 'Bot-ID fehlt' }, 
        { status: 400, headers }
      );
    }

    // Bot-ID normalisieren
    const botId = normalizeBotId(rawBotId);
    console.log(`Status für Bot angefordert. Original-ID: ${rawBotId}, Normalisiert: ${botId}`);

    // Prüfen, ob Mock-Modus aktiv ist
    const isMockMode = getMockModeStatus();
    
    // Im Mock-Modus immer einen pausierte Status zurückgeben
    if (isMockMode) {
      console.log(`Gebe Mock-Status für Bot ${botId} zurück`);
      return NextResponse.json(
        { botId: rawBotId, status: 'paused', isMockMode: true },
        { headers }
      );
    }

    // Versuche, den Status aus der Datenbank zu holen
    try {
      const bot = await prisma.bot.findUnique({
        where: { id: botId },
        select: { isActive: true }
      });

      const status = (bot?.isActive || false) ? 'active' : 'paused';
      return NextResponse.json(
        { botId: rawBotId, status },
        { headers }
      );
    } catch (dbError) {
      console.error(`Datenbankfehler beim Abrufen des Status für Bot ${botId}:`, dbError);
      
      // Bei Datenbankfehlern einen Standardstatus zurückgeben
      return NextResponse.json(
        { botId: rawBotId, status: 'paused', error: "Datenbankfehler, verwende Standardstatus" },
        { status: 200, headers }
      );
    }
  } catch (error) {
    console.error('Allgemeiner Fehler beim Abrufen des Bot-Status:', error);
    
    // Parse botId aus URL auch bei Fehlern
    let botId = 'unknown';
    try {
      const url = new URL(request.url);
      botId = url.searchParams.get('botId') || 'unknown';
    } catch {}
    
    // Selbst bei schwerwiegendem Fehler einen Standardstatus zurückgeben
    return NextResponse.json(
      { botId, status: 'paused', error: "Kritischer Fehler, verwende Standardstatus" },
      { status: 200, headers }
    );
  }
} 