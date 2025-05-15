import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock-Daten für die Entwicklung
const MOCK_POSITIONS = [
  {
    id: 'pos_1',
    botType: 'Volume Tracker Bot',
    entryDate: '2023-10-25',
    entryPrice: 28.45,
    currentPrice: 32.18,
    size: 2.5,
    profit: 9.32,
    profitPercentage: 13.11
  },
  {
    id: 'pos_2',
    botType: 'Trend Surfer Bot',
    entryDate: '2023-10-28',
    entryPrice: 1920.65,
    currentPrice: 2105.30,
    size: 0.15,
    profit: 27.70,
    profitPercentage: 9.61
  }
];

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
      console.warn('Datenbankfehler, verwende Mock-Daten:', dbError);
      
      // Wenn die Datenbankabfrage fehlschlägt, gib Mock-Daten zurück
      return NextResponse.json(MOCK_POSITIONS);
    }
  } catch (error) {
    console.error('Error in positions API:', error);
    
    // Im Fehlerfall auch Mock-Daten zurückgeben
    return NextResponse.json(MOCK_POSITIONS);
  }
} 