import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic'; // Diese Route dynamisch machen

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet-Adresse erforderlich' }, { status: 400 });
    }

    try {
      // Versuche, die Daten aus der Datenbank zu holen
      const positions = await prisma.position.findMany({
        where: {
          bot: {
            walletAddress: wallet
          },
          isOpen: true
        },
        include: {
          bot: {
            select: {
              name: true,
              strategyType: true
            }
          }
        }
      });

      // Formatiere die Daten für die Frontend-Anzeige
      const formattedPositions = positions.map(position => ({
        id: position.id,
        botType: position.bot.name,
        entryDate: position.openedAt.toISOString().split('T')[0],
        entryPrice: position.entryPrice,
        currentPrice: position.currentPrice,
        size: position.amount,
        profit: position.profit,
        profitPercentage: ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100
      }));

      return NextResponse.json(formattedPositions);
    } catch (dbError) {
      console.error('Datenbankfehler bei positions API:', dbError);
      // Bei einem Datenbankfehler leere Liste zurückgeben, keine Mock-Daten
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error in positions API:', error);
    return NextResponse.json({ error: 'Serverfehler bei Positions-Abfrage' }, { status: 500 });
  }
} 