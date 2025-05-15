import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { PrismaClient } from '@prisma/client';
import * as anchor from '@project-serum/anchor';
import { AnchorProvider } from '@project-serum/anchor';
import { VolumeTracker } from '@/bots/VolumeTracker';
import { MomentumBot } from '@/bots/TrendSurfer';
import { DipHunter } from '@/bots/ArbitrageFinder';

// Alchemy RPC URL für Solana Mainnet
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://solana-mainnet.g.alchemy.com/v2/ajXi9mI9_OF6a0Nfy6PZ-05JT29nTxFm';
// Solana Programm-ID für den Trading Bot
const BOT_PROGRAM_ID = process.env.BOT_PROGRAM_ID || 'AaT7QFrQd49Lf2T6UkjrGp7pSW3KvCTQwCLJTPuHUBV9';

const prisma = new PrismaClient();
const connection = new Connection(SOLANA_RPC_URL);

// Bot-Programm IDL importieren
const idl = require('../../target/idl/trading_bot.json');
const programId = new PublicKey(BOT_PROGRAM_ID);

// Bot-Instanzen
const botInstances = new Map();

// Bot-Strategie-Typen
export enum BotType {
  VOLUME_TRACKER = 'volume-tracker',
  TREND_SURFER = 'trend-surfer',
  DIP_HUNTER = 'dip-hunter'
}

// Bot-Factory zum Erstellen der richtigen Bot-Instanz
function createBot(botType: string, provider: AnchorProvider, marketAddress: string, riskPercentage: number) {
  switch (botType) {
    case BotType.VOLUME_TRACKER:
      return new VolumeTracker(provider, marketAddress, riskPercentage);
    case BotType.TREND_SURFER:
      return new MomentumBot(provider, marketAddress, riskPercentage);
    case BotType.DIP_HUNTER:
      return new DipHunter(provider, marketAddress, riskPercentage);
    default:
      throw new Error(`Unbekannter Bot-Typ: ${botType}`);
  }
}

export async function startTradingBot(botId: string) {
  const bot = await prisma.bot.findUnique({
    where: { id: botId }
  });

  if (!bot || !bot.isActive) {
    throw new Error('Bot nicht aktiv oder nicht gefunden');
  }

  // Erstelle Provider mit der Wallet-Adresse des Benutzers
  const walletPublicKey = new PublicKey(bot.walletAddress);
  const provider = new AnchorProvider(
    connection,
    {
      publicKey: walletPublicKey,
      signTransaction: async (tx: Transaction) => tx, // Wird nur für die Initialisierung benötigt
      signAllTransactions: async (txs: Transaction[]) => txs,
    },
    { commitment: 'processed' }
  );

  // Wähle den richtigen Markt basierend auf der Bot-Strategie
  let marketAddress: string;
  switch (bot.strategyType) {
    case BotType.VOLUME_TRACKER:
      marketAddress = '9wFFyRfZBsuAha4YcuxcXLKwMxJR43S7fPfQLusDBzvT'; // SOL/USDC
      break;
    case BotType.TREND_SURFER:
      marketAddress = 'HWHvQhFmJB3NUcu1aihKmrKegfVxBEHzwVX6yZCKEsi1'; // SOL/USDT
      break;
    case BotType.DIP_HUNTER:
      marketAddress = 'A8YFbxQYFVqKZaoYJLLUVcQiWP7G2MeEgW5wsAQgMvFw'; // BTC/USDC
      break;
    default:
      marketAddress = '9wFFyRfZBsuAha4YcuxcXLKwMxJR43S7fPfQLusDBzvT'; // Standard: SOL/USDC
  }

  // Erstelle und initialisiere den Bot
  const botInstance = createBot(
    bot.strategyType,
    provider,
    marketAddress,
    bot.riskPercentage
  );
  
  await botInstance.initialize();
  
  // Speichere Bot-Instanz für spätere Referenz
  botInstances.set(botId, botInstance);

  console.log(`Bot ${botId} (${bot.strategyType}) gestartet mit Risiko: ${bot.riskPercentage}%`);

  // Starte Trading-Loop
  const intervalId = setInterval(async () => {
    try {
      // Prüfe ob Bot noch aktiv ist
      const updatedBot = await prisma.bot.findUnique({
        where: { id: botId }
      });

      if (!updatedBot?.isActive) {
        console.log(`Bot ${botId} wurde deaktiviert, stoppe Trading-Loop`);
        clearInterval(intervalId);
        botInstances.delete(botId);
        return;
      }

      // Führe Bot-Strategie aus
      let tradeResult;
      switch (bot.strategyType) {
        case BotType.VOLUME_TRACKER:
          tradeResult = await (botInstance as VolumeTracker).checkVolumeAndTrade();
          break;
        case BotType.TREND_SURFER:
          tradeResult = await (botInstance as MomentumBot).checkMomentumAndTrade();
          break;
        case BotType.DIP_HUNTER:
          tradeResult = await (botInstance as DipHunter).findAndTradeDip();
          break;
      }

      // Verarbeite Trade-Ergebnis, wenn vorhanden
      if (tradeResult) {
        await prisma.trade.create({
          data: {
            botId,
            type: tradeResult.type || 'auto',
            amount: tradeResult.size,
            price: tradeResult.price,
            profit: tradeResult.profit,
            txSignature: tradeResult.signature
          }
        });

        // Aktualisiere Bot-Statistiken
        await prisma.bot.update({
          where: { id: botId },
          data: {
            totalTrades: { increment: 1 },
            successfulTrades: tradeResult.profit > 0 ? { increment: 1 } : undefined,
            totalProfit: { increment: tradeResult.profit }
          }
        });

        console.log(`Bot ${botId} hat einen Trade ausgeführt: ${JSON.stringify(tradeResult)}`);
      }
    } catch (error) {
      console.error(`Fehler beim Trading mit Bot ${botId}:`, error);
    }
  }, 60000); // Prüfe alle 60 Sekunden

  return {
    botId,
    status: 'active',
    message: `Bot ${bot.name} wurde erfolgreich gestartet`
  };
}

export async function stopTradingBot(botId: string) {
  const botInstance = botInstances.get(botId);
  
  if (botInstance) {
    botInstances.delete(botId);
    
    // Aktualisiere Bot-Status in der Datenbank
    await prisma.bot.update({
      where: { id: botId },
      data: { isActive: false }
    });
    
    return {
      botId,
      status: 'inactive',
      message: `Bot ${botId} wurde erfolgreich gestoppt`
    };
  }
  
  return {
    botId,
    status: 'error',
    message: `Bot ${botId} wurde nicht gefunden oder läuft nicht`
  };
} 