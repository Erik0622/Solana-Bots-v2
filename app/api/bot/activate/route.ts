import { NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { PrismaClient } from '@prisma/client';
import * as anchor from '@project-serum/anchor';
import { BotType } from '@/lib/trading/bot';

const prisma = new PrismaClient();
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

// Bot-Programm IDL importieren
const idl = require('../../../../target/idl/trading_bot.json');
const programId = new PublicKey(process.env.BOT_PROGRAM_ID as string);

export async function POST(request: Request) {
  try {
    const { botId, walletAddress, riskPercentage, action, botType } = await request.json();

    // Validiere Eingaben
    if (!botId || !walletAddress || !riskPercentage) {
      return NextResponse.json({ error: 'Fehlende Parameter' }, { status: 400 });
    }

    // Bestimme Bot-Typ
    let strategyType;
    switch (botType) {
      case 'volume-tracker':
        strategyType = BotType.VOLUME_TRACKER;
        break;
      case 'trend-surfer':
        strategyType = BotType.TREND_SURFER;
        break;
      case 'dip-hunter':
        strategyType = BotType.DIP_HUNTER;
        break;
      default:
        strategyType = BotType.VOLUME_TRACKER; // Standardwert
    }

    // Hole Bot aus der Datenbank oder erstelle einen neuen
    let bot = await prisma.bot.findUnique({
      where: { id: botId }
    });

    if (!bot) {
      // Erstelle neuen Bot in der Datenbank
      bot = await prisma.bot.create({
        data: {
          id: botId,
          name: `${botType} Bot`,
          walletAddress,
          riskPercentage,
          strategyType,
          isActive: false
        }
      });
    }

    // Erstelle Wallet-PublicKey
    const userWallet = new PublicKey(walletAddress);

    // Erstelle Bot-Account-Address (PDA)
    const [botPda] = await PublicKey.findProgramAddress(
      [Buffer.from('bot'), userWallet.toBuffer()],
      programId
    );

    // Erstelle Provider und Programm
    const provider = new anchor.AnchorProvider(
      connection,
      {} as any, // Wird später durch die Wallet des Users ersetzt
      { commitment: 'processed' }
    );
    const program = new anchor.Program(idl, programId, provider);

    // Erstelle Transaktion
    const transaction = new Transaction();

    if (action === 'activate') {
      // Wenn der Bot noch nicht initialisiert wurde, füge initialize_bot Instruktion hinzu
      if (!bot.isActive) {
        transaction.add(
          await program.methods.initializeBot(
            riskPercentage,
            getBotStrategyTypeValue(strategyType) // Konvertiere String zu numerischem Wert
          )
          .accounts({
            bot: botPda,
            owner: userWallet,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .instruction()
        );
      }

      // Füge activate_bot Instruktion hinzu
      transaction.add(
        await program.methods.activateBot()
        .accounts({
          bot: botPda,
          owner: userWallet,
        })
        .instruction()
      );
    } else {
      // Füge deactivate_bot Instruktion hinzu
      transaction.add(
        await program.methods.deactivateBot()
        .accounts({
          bot: botPda,
          owner: userWallet,
        })
        .instruction()
      );
    }

    // Serialisiere die Transaktion
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString('base64');

    return NextResponse.json({ 
      transaction: serializedTransaction,
      botPda: botPda.toBase58(),
      botType: strategyType
    });
  } catch (error) {
    console.error('Bot activation error:', error);
    return NextResponse.json({ error: 'Fehler bei der Bot-Aktivierung' }, { status: 500 });
  }
}

// Hilfsfunktion zur Konvertierung von Bot-Typ zu numerischem Wert für das Solana-Programm
function getBotStrategyTypeValue(botType: string): number {
  switch (botType) {
    case BotType.VOLUME_TRACKER:
      return 1;
    case BotType.TREND_SURFER:
      return 2;
    case BotType.DIP_HUNTER:
      return 3;
    default:
      return 1;
  }
} 