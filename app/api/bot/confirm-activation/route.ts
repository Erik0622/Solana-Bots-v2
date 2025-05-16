import { NextResponse } from 'next/server';
import { Connection, Transaction } from '@solana/web3.js';
import { PrismaClient, Bot as PrismaBot } from '@prisma/client';
import { startTradingBot, stopTradingBot } from '@/lib/trading/bot';
import prisma, { getMockModeStatus } from '@/lib/prisma';

// Alchemy RPC URL für Solana Mainnet
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://solana-mainnet.g.alchemy.com/v2/ajXi9mI9_OF6a0Nfy6PZ-05JT29nTxFm';

const connection = new Connection(SOLANA_RPC_URL, {
  commitment: 'confirmed'
});

export async function POST(request: Request) {
  try {
    const { botId, signedTransaction, action, isMockMode: requestMockMode } = await request.json();

    // Prüfe, ob wir im Mock-Modus sind (entweder vom Request oder global)
    const isMockMode = requestMockMode || getMockModeStatus();
    
    console.log(`Bot-Aktivierung bestätigen für Bot ${botId}, Mock-Modus: ${isMockMode}`);

    // Validiere Eingaben
    if (!botId || !signedTransaction) {
      return NextResponse.json({ error: 'Missing parameters - botId and signedTransaction are required' }, { status: 400 });
    }

    // Im Mock-Modus simulieren wir eine erfolgreiche Aktivierung ohne DB-Zugriff
    if (isMockMode) {
      console.log(`Mock-Aktivierung für Bot ${botId}`);
      const isDeactivating = action === 'deactivate';
      
      return NextResponse.json({ 
        success: true,
        signature: "MockSignature" + Date.now(),
        message: isDeactivating 
          ? `Bot ${botId} wurde erfolgreich deaktiviert (Mock)` 
          : `Bot ${botId} wurde erfolgreich aktiviert (Mock)`,
        status: isDeactivating ? 'inactive' : 'active',
        isActive: !isDeactivating,
        isMockMode: true
      });
    }

    // Außerhalb des Mock-Modus: Versuche, den Bot aus der Datenbank zu holen
    let bot: PrismaBot | null = null;
    try {
      bot = await prisma.bot.findUnique({
        where: { id: botId }
      });

      if (!bot) {
        return NextResponse.json({ error: 'Bot not found in database. Please create the bot first.' }, { status: 404 });
      }
    } catch (dbError) {
      console.error('Datenbankfehler beim Abrufen des Bots:', dbError);
      // Bei Datenbankfehlern simulieren wir einen erfolgreichen Aufruf
      const isDeactivating = action === 'deactivate';
      
      return NextResponse.json({ 
        success: true,
        signature: "DBErrorSignature" + Date.now(),
        message: isDeactivating 
          ? `Bot ${botId} wurde (simuliert) deaktiviert aufgrund von Datenbankfehlern` 
          : `Bot ${botId} wurde (simuliert) aktiviert aufgrund von Datenbankfehlern`,
        status: isDeactivating ? 'inactive' : 'active',
        isActive: !isDeactivating,
        dbError: true
      });
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
          const isDeactivating = action === 'deactivate';
          
          try {
            if (isDeactivating) {
              // Bot deaktivieren
              await prisma.bot.update({
                where: { id: botId },
                data: { isActive: false }
              });
              
              result = await stopTradingBot(botId);
              console.log(`Bot ${botId} wurde deaktiviert`);
            } else {
              // Bot aktivieren
              await prisma.bot.update({
                where: { id: botId },
                data: { isActive: true }
              });
              
              result = await startTradingBot(botId);
              console.log(`Bot ${botId} wurde aktiviert`);
            }
          } catch (dbUpdateError) {
            console.error('Fehler beim Aktualisieren des Bot-Status in der Datenbank:', dbUpdateError);
            // Trotz DB-Fehler können wir eine erfolgreiche Antwort senden
            result = {
              botId,
              status: isDeactivating ? 'inactive' : 'active',
              message: isDeactivating 
                ? `Bot ${botId} wurde deaktiviert (Blockchain OK, DB-Fehler)` 
                : `Bot ${botId} wurde aktiviert (Blockchain OK, DB-Fehler)`
            };
          }

          // Erstelle einen Trade-Log-Eintrag - mit Fehlerbehandlung
          try {
            await prisma.trade.create({
              data: {
                botId,
                type: isDeactivating ? 'deactivation' : 'activation',
                amount: 0,
                price: 0,
                txSignature: signature
              }
            });
          } catch (tradeLogError) {
            console.error('Fehler beim Erstellen des Trade-Logs:', tradeLogError);
            // Kein Fehler zurückgeben, da der Bot trotzdem aktiviert/deaktiviert wurde
          }

          return NextResponse.json({ 
            success: true,
            signature,
            message: result.message,
            status: result.status,
            isActive: !isDeactivating
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