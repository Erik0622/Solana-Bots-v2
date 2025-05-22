import { NextRequest, NextResponse } from 'next/server';
import { getRealHistoricalData } from '@/lib/marketData/realDataService';
import { getHistoricalData } from '@/lib/simulation/historicalDataService';

/**
 * API-Route: /api/market
 * 
 * Stellt historische Marktdaten für Bots bereit.
 * Parameter:
 * - botId: ID des Bots
 * - days: Anzahl der Tage (optional, Standard: 7)
 * - useRealData: 'true' oder 'false' (optional, Standard: 'true')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const botId = searchParams.get('botId');
    const days = parseInt(searchParams.get('days') || '7', 10);
    const useRealData = searchParams.get('useRealData') !== 'false'; // Default ist 'true'
    
    if (!botId) {
      return NextResponse.json(
        { error: 'Parameter botId ist erforderlich' },
        { status: 400 }
      );
    }
    
    // Versuche, echte Daten zu laden, falls gewünscht
    if (useRealData) {
      try {
        const realData = await getRealHistoricalData(botId, days);
        return NextResponse.json({ 
          data: realData,
          source: 'real' 
        });
      } catch (error) {
        console.warn(`Konnte keine echten Daten für ${botId} laden, verwende Simulationsdaten`, error);
        // Bei Fehler, mache mit simulierten Daten weiter
      }
    }
    
    // Simulierte Daten als Fallback oder wenn explizit angefordert
    const simulatedData = await getHistoricalData(botId, days);
    return NextResponse.json({
      data: simulatedData,
      source: 'simulated'
    });
    
  } catch (error) {
    console.error('Fehler beim Bereitstellen von Marktdaten:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler bei der Datenbereitstellung' },
      { status: 500 }
    );
  }
} 