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

    // Hole offene Positionen aus der Datenbank
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
  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen der Positionen' }, { status: 500 });
  }
} 