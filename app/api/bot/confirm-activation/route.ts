import { NextResponse } from 'next/server';
import { Connection, Transaction } from '@solana/web3.js';
import { PrismaClient } from '@prisma/client';
import { startTradingBot, stopTradingBot } from '@/lib/trading/bot';

const prisma = new PrismaClient();
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

export async function POST(request: Request) {
  try {
    const { botId, signedTransaction, action } = await request.json();

    // Validiere Eingaben
    if (!botId || !signedTransaction) {
      return NextResponse.json({ error: 'Fehlende Parameter' }, { status: 400 });
    }

    // Hole Bot aus der Datenbank
    const bot = await prisma.bot.findUnique({
      where: { id: botId }
    });

    if (!bot) {
      return NextResponse.json({ error: 'Bot nicht gefunden' }, { status: 404 });
    }

    // Deserialisiere die signierte Transaktion
    const transaction = Transaction.from(Buffer.from(signedTransaction, 'base64'));

    // Sende und bestätige Transaktion
    const signature = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction(signature);

    let result;
    if (action === 'deactivate' || bot.isActive) {
      // Bot deaktivieren
      await prisma.bot.update({
        where: { id: botId },
        data: { isActive: false }
      });
      
      result = await stopTradingBot(botId);
    } else {
      // Bot aktivieren
      await prisma.bot.update({
        where: { id: botId },
        data: { isActive: true }
      });
      
      result = await startTradingBot(botId);
    }

    // Erstelle einen Trade-Log-Eintrag
    await prisma.trade.create({
      data: {
        botId,
        type: bot.isActive ? 'deactivation' : 'activation',
        amount: 0,
        price: 0,
        txSignature: signature
      }
    });

    return NextResponse.json({ 
      success: true,
      signature,
      message: result.message,
      status: result.status
    });
  } catch (error) {
    console.error('Bot confirmation error:', error);
    return NextResponse.json({ error: 'Fehler bei der Bot-Aktivierungsbestätigung' }, { status: 500 });
  }
} 