import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // Diese Route dynamisch machen

// Diese Route gibt den aktuellen Status des Bots zurück
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('botId');

    if (!botId) {
      const errorResponse = NextResponse.json({ error: 'Bot-ID fehlt' }, { status: 400 });
      errorResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      errorResponse.headers.set('Pragma', 'no-cache');
      errorResponse.headers.set('Expires', '0');
      return errorResponse;
    }

    try {
      const bot = await prisma.bot.findUnique({
        where: { id: botId },
        select: { isActive: true }
      });

      const status = (bot?.isActive || false) ? 'active' : 'paused';
      const successResponse = NextResponse.json({
        botId,
        status,
      });
      successResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      successResponse.headers.set('Pragma', 'no-cache');
      successResponse.headers.set('Expires', '0');
      return successResponse;

    } catch (dbError) {
      console.error('Datenbankfehler beim Abrufen des Bot-Status:', dbError);
      // Bei Datenbankfehlern einen Fehler zurückgeben oder 'paused' als sicheren Standard
      const dbErrorResponse = NextResponse.json({ botId, status: 'paused', error: "Datenbankfehler beim Abrufen des Status" }, { status: 500 });
      dbErrorResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      dbErrorResponse.headers.set('Pragma', 'no-cache');
      dbErrorResponse.headers.set('Expires', '0');
      return dbErrorResponse;
    }
  } catch (error) {
    console.error('Fehler beim Abrufen des Bot-Status:', error);
    const genericErrorResponse = NextResponse.json({ error: 'Fehler beim Abrufen des Bot-Status' }, { status: 500 });
    genericErrorResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    genericErrorResponse.headers.set('Pragma', 'no-cache');
    genericErrorResponse.headers.set('Expires', '0');
    return genericErrorResponse;
  }
} 