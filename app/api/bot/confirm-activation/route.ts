import { NextResponse } from 'next/server';
import { Connection, Transaction } from '@solana/web3.js';
import { PrismaClient } from '@prisma/client';
import { startTradingBot, stopTradingBot } from '@/lib/trading/bot';

// Alchemy RPC URL für Solana Mainnet
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://solana-mainnet.g.alchemy.com/v2/ajXi9mI9_OF6a0Nfy6PZ-05JT29nTxFm';

const prisma = new PrismaClient();
const connection = new Connection(SOLANA_RPC_URL);

export async function POST(request: Request) {
  try {
    const { botId, signedTransaction, action } = await request.json();

    // Validiere Eingaben
    if (!botId || !signedTransaction) {
      return NextResponse.json({ error: 'Missing parameters - botId and signedTransaction are required' }, { status: 400 });
    }

    // Hole Bot aus der Datenbank
    const bot = await prisma.bot.findUnique({
      where: { id: botId }
    });

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found in database. Please create the bot first.' }, { status: 404 });
    }

    // Deserialisiere die signierte Transaktion
    try {
      const transaction = Transaction.from(Buffer.from(signedTransaction, 'base64'));
      
      // Sende und bestätige Transaktion
      try {
        const signature = await connection.sendRawTransaction(transaction.serialize());
        
        try {
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
        } catch (confirmError) {
          console.error('Transaction confirmation error:', confirmError);
          return NextResponse.json({ 
            error: 'Failed to confirm transaction. Please try again later or check your wallet connection.' 
          }, { status: 500 });
        }
      } catch (txError) {
        console.error('Transaction sending error:', txError);
        return NextResponse.json({ 
          error: 'Failed to send transaction to the Solana network. Please check your wallet balance and connection.' 
        }, { status: 500 });
      }
    } catch (deserializeError) {
      console.error('Transaction deserialization error:', deserializeError);
      return NextResponse.json({ 
        error: 'Invalid transaction format. Please try again or contact support.' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Bot confirmation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during bot activation';
    return NextResponse.json({ 
      error: `Bot activation failed: ${errorMessage}` 
    }, { status: 500 });
  }
} 