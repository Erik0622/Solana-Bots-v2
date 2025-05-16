import { NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { BotType } from '@/lib/trading/bot';
import prisma, { getMockModeStatus } from '@/lib/prisma';
import { Bot as PrismaBot } from '@prisma/client';

// Alchemy RPC URL für Solana Mainnet
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://solana-mainnet.g.alchemy.com/v2/ajXi9mI9_OF6a0Nfy6PZ-05JT29nTxFm';
// Solana Programm-ID für den Trading Bot
const BOT_PROGRAM_ID = process.env.BOT_PROGRAM_ID || 'AaT7QFrQd49Lf2T6UkjrGp7pSW3KvCTQwCLJTPuHUBV9';

const connection = new Connection(SOLANA_RPC_URL, {
  commitment: 'confirmed'
});

// Definiere Typ für IDL
interface TradingBotIdl {
  version: string;
  name: string;
  instructions: any[];
  [key: string]: any;
}

// Interface für Default/Mock-Bot wenn Datenbank nicht verfügbar ist
interface DefaultBot {
  id: string;
  name: string;
  walletAddress: string;
  riskPercentage: number;
  strategyType: string;
  isActive: boolean;
}

// Bot-Programm IDL importieren - mit try-catch um Fehler abzufangen
let idl: TradingBotIdl;
try {
  idl = require('../../../../target/idl/trading_bot.json');
} catch (error) {
  console.error('Fehler beim Laden des IDL:', error);
  // Fallback-IDL, falls das echte nicht geladen werden kann
  idl = {
    version: "0.1.0",
    name: "trading_bot",
    instructions: [
      {
        name: "initializeBot",
        accounts: [
          { name: "bot", isMut: true, isSigner: false },
          { name: "user", isMut: true, isSigner: true },
          { name: "systemProgram", isMut: false, isSigner: false }
        ],
        args: [{ name: "botType", type: "string" }]
      },
      {
        name: "activateBot",
        accounts: [
          { name: "bot", isMut: true, isSigner: false },
          { name: "user", isMut: true, isSigner: true }
        ],
        args: []
      },
      {
        name: "deactivateBot",
        accounts: [
          { name: "bot", isMut: true, isSigner: false },
          { name: "user", isMut: true, isSigner: true }
        ],
        args: []
      }
    ]
  };
}

const programId = new PublicKey(BOT_PROGRAM_ID);

export const dynamic = 'force-dynamic'; // Diese Route dynamisch machen

export async function POST(request: Request) {
  try {
    const { botId, walletAddress, riskPercentage, action, botType } = await request.json();
    
    console.log("Bot Aktivierung angefordert:", { botId, walletAddress, action, botType });

    // Validiere Eingaben
    if (!botId || !walletAddress) {
      return NextResponse.json({ error: 'Fehlende Parameter: botId und walletAddress sind erforderlich' }, { status: 400 });
    }

    // Verwende einen Standard-Risikoprozentsatz, falls nicht angegeben
    const riskValue = riskPercentage || 5;

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

    // Prüfe, ob wir im Mock-Modus sind
    const isMockMode = getMockModeStatus();
    if (isMockMode) {
      console.log("Aktiviere Bot im Mock-Modus");
      
      // Generiere eine simulierte Transaktion
      const transaction = new Transaction();
      const userWallet = new PublicKey(walletAddress);
      
      // Generiere ein "gefälschtes" PDA für Simulationszwecke
      const mockPda = PublicKey.findProgramAddressSync(
        [Buffer.from('mock_bot'), userWallet.toBuffer()],
        programId
      )[0];
      
      // Füge einen Mock-Blockhash für die Simulation hinzu
      try {
        const { blockhash } = await connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = userWallet;
      } catch (error) {
        console.log("Fehler beim Abrufen des Blockhash im Mock-Modus, verwende Dummy-Wert");
        transaction.recentBlockhash = 'mockblockhash123456789abcdef';
        transaction.feePayer = userWallet;
      }
      
      // Serialisiere die leere Transaktion
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }).toString('base64');

      return NextResponse.json({ 
        transaction: serializedTransaction,
        botPda: mockPda.toBase58(),
        botType: strategyType,
        isMockMode: true
      });
    }

    // Versuche Bot aus der Datenbank zu holen oder erstelle einen neuen
    let bot: PrismaBot | DefaultBot | null = null;
    try {
      bot = await prisma.bot.findUnique({
        where: { id: botId }
      });

      if (!bot) {
        // Erstelle neuen Bot in der Datenbank
        console.log(`Erstelle neuen Bot: ${botId}, Typ: ${strategyType}`);
        bot = await prisma.bot.create({
          data: {
            id: botId,
            name: `${botType} Bot`,
            walletAddress,
            riskPercentage: riskValue,
            strategyType,
            isActive: false
          }
        });
      }
    } catch (dbError) {
      console.error('Datenbankfehler bei Bot-Aktivierung:', dbError);
      // Bei Datenbankfehler trotzdem fortfahren, aber mit einem "virtuellen" Bot-Objekt
      bot = {
        id: botId,
        name: `${botType} Bot`,
        walletAddress,
        riskPercentage: riskValue,
        strategyType,
        isActive: false
      };
    }

    // Erstelle Wallet-PublicKey
    const userWallet = new PublicKey(walletAddress);

    // Erstelle Bot-Account-Address (PDA)
    const [botPda] = await PublicKey.findProgramAddress(
      [Buffer.from('bot'), userWallet.toBuffer()],
      programId
    );

    console.log(`Bot PDA: ${botPda.toBase58()}`);

    // Erstelle Provider und Programm
    const provider = new anchor.AnchorProvider(
      connection,
      {} as any, // Wird später durch die Wallet des Users ersetzt
      { commitment: 'confirmed' }
    );
    const program = new anchor.Program(idl, programId, provider);

    // Erstelle Transaktion
    const transaction = new Transaction();

    if (action === 'activate') {
      // Wenn der Bot noch nicht initialisiert wurde, füge initialize_bot Instruktion hinzu
      if (!bot.isActive) {
        console.log("Füge initialize_bot Instruktion hinzu");
        transaction.add(
          await program.methods.initializeBot(strategyType)
          .accounts({
            bot: botPda,
            user: userWallet,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .instruction()
        );
      }

      // Füge activate_bot Instruktion hinzu
      console.log("Füge activateBot Instruktion hinzu");
      transaction.add(
        await program.methods.activateBot()
        .accounts({
          bot: botPda,
          user: userWallet,
        })
        .instruction()
      );
    } else {
      // Füge deactivate_bot Instruktion hinzu
      console.log("Füge deactivateBot Instruktion hinzu");
      transaction.add(
        await program.methods.deactivateBot()
        .accounts({
          bot: botPda,
          user: userWallet,
        })
        .instruction()
      );
    }

    // Füge den aktuellen Blockhash hinzu (wichtig für gültige Transaktion)
    const { blockhash } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userWallet;

    // Serialisiere die Transaktion
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString('base64');

    console.log("Transaktion erfolgreich erstellt");

    return NextResponse.json({ 
      transaction: serializedTransaction,
      botPda: botPda.toBase58(),
      botType: strategyType
    });
  } catch (error) {
    console.error('Bot activation error:', error);
    return NextResponse.json({ error: `Fehler bei der Bot-Aktivierung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}` }, { status: 500 });
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