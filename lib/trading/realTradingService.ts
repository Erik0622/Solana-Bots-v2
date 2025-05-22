/**
 * Real Trading Service
 * 
 * Führt echte Trades auf Solana-DEXes aus und verwaltet Positionen
 */

import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getTokenAddressForBot } from '../marketData/realDataService';
import { normalizeBotId } from '../botState';

// Konfiguration für die Solana-Verbindung
const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC, 'confirmed');

// Jupiter DEX Aggregator API
const JUPITER_API = 'https://quote-api.jup.ag/v6';

// Trading-Limits (Sicherheitsmaßnahmen)
const TRADING_LIMITS = {
  maxTradeValueUsd: 100, // Maximaler Handelsumfang in USD
  maxSlippagePercent: 1, // Maximaler Slippage in Prozent
  minLiquidityUsd: 10000, // Minimale Liquidität für ein Token
  maxGasFeeUsd: 0.5 // Maximale Gasgebühren in USD
};

// Interface für Handelsparameter
export interface TradeParams {
  botId: string;
  walletPublicKey: string;
  side: 'buy' | 'sell';
  amountUsd: number;
  maxSlippagePercent?: number;
}

// Interface für Transaktionsergebnisse
export interface TradeResult {
  success: boolean;
  transactionId?: string;
  executedPrice?: number;
  amountOut?: number;
  fee?: number;
  error?: string;
}

/**
 * Preisanfrage an Jupiter für einen Swap
 */
async function getSwapQuote(
  inputMint: string, 
  outputMint: string,
  amount: number, 
  slippageBps: number
): Promise<any> {
  try {
    const response = await fetch(`${JUPITER_API}/quote`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputMint,
        outputMint,
        amount: amount.toString(),
        slippageBps: slippageBps * 100, // Umrechnung in Basispunkte
        onlyDirectRoutes: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`Jupiter API Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Fehler bei der Jupiter-Preisanfrage:', error);
    throw error;
  }
}

/**
 * Swap-Transaktion von Jupiter erstellen
 */
async function createSwapTransaction(
  quoteResponse: any,
  userPublicKey: string
): Promise<Transaction> {
  try {
    const response = await fetch(`${JUPITER_API}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true // Automatisch SOL wrappen/unwrappen
      })
    });
    
    if (!response.ok) {
      throw new Error(`Jupiter Swap API Error: ${response.status}`);
    }
    
    const { swapTransaction } = await response.json();
    
    // Transaktionsantwort dekodieren und in eine Transaktion umwandeln
    const transaction = Transaction.from(Buffer.from(swapTransaction, 'base64'));
    
    return transaction;
  } catch (error) {
    console.error('Fehler beim Erstellen der Swap-Transaktion:', error);
    throw error;
  }
}

/**
 * Hauptfunktion zum Ausführen eines echten Trades
 */
export async function executeTrade(
  params: TradeParams,
  wallet: any
): Promise<TradeResult> {
  try {
    const { botId, walletPublicKey, side, amountUsd, maxSlippagePercent = 1 } = params;
    
    // Sicherheitsüberprüfungen
    if (amountUsd > TRADING_LIMITS.maxTradeValueUsd) {
      return {
        success: false,
        error: `Handelsvolumen überschreitet das Limit von ${TRADING_LIMITS.maxTradeValueUsd}$`
      };
    }
    
    if (maxSlippagePercent > TRADING_LIMITS.maxSlippagePercent) {
      return {
        success: false,
        error: `Slippage überschreitet das Limit von ${TRADING_LIMITS.maxSlippagePercent}%`
      };
    }
    
    // Token-Adresse für den Bot abrufen
    const normalizedBotId = normalizeBotId(botId);
    const tokenAddress = getTokenAddressForBot(normalizedBotId);
    
    // USDC ist unser Standardpaar für Trades
    const usdcAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    
    // Input und Output Mints basierend auf Handelsrichtung festlegen
    const inputMint = side === 'buy' ? usdcAddress : tokenAddress;
    const outputMint = side === 'buy' ? tokenAddress : usdcAddress;
    
    // Handelsvolumen in Token umrechnen (für USDC = amountUsd)
    const inputAmount = side === 'buy' ? amountUsd * 10**6 : 0; // USDC hat 6 Dezimalstellen
    
    // Preisangebot von Jupiter abrufen
    const quote = await getSwapQuote(
      inputMint,
      outputMint,
      inputAmount,
      maxSlippagePercent
    );
    
    // Swap-Transaktion erstellen
    const transaction = await createSwapTransaction(
      quote,
      walletPublicKey
    );
    
    // Transaktion signieren und senden
    // Wir erwarten, dass das wallet-Objekt eine signTransaction-Methode hat
    const signedTransaction = await wallet.signTransaction(transaction);
    
    // Transaktion an die Blockchain senden
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    // Auf Bestätigung warten
    await connection.confirmTransaction(signature, 'confirmed');
    
    // Transaktionsdetails zurückgeben
    return {
      success: true,
      transactionId: signature,
      executedPrice: quote.outAmount / quote.inAmount,
      amountOut: quote.outAmount,
      fee: quote.otherAmountThreshold // Dies ist eine Annäherung
    };
  } catch (error) {
    console.error('Fehler bei der Handelsausführung:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler bei der Handelsausführung'
    };
  }
}

/**
 * Prüft, ob das Wallet über ausreichende Mittel für den Trade verfügt
 */
export async function checkWalletBalance(
  walletAddress: string,
  requiredUsdcAmount: number
): Promise<boolean> {
  try {
    const publicKey = new PublicKey(walletAddress);
    const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    
    // Token-Konten des Wallets abrufen
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );
    
    // USDC-Konto suchen
    const usdcAccount = tokenAccounts.value.find(account => 
      account.account.data.parsed.info.mint === usdcMint.toString()
    );
    
    if (!usdcAccount) {
      return false; // Kein USDC-Konto gefunden
    }
    
    const balance = usdcAccount.account.data.parsed.info.tokenAmount.uiAmount;
    
    return balance >= requiredUsdcAmount;
  } catch (error) {
    console.error('Fehler beim Prüfen des Wallet-Guthabens:', error);
    return false;
  }
}

/**
 * Berechnet die Position für einen Trade basierend auf Risikoprofil und Kapital
 */
export function calculatePositionSize(
  accountBalanceUsd: number,
  riskPercentage: number,
  stopLossPercentage: number
): number {
  // Maximaler Risikobetrag pro Trade
  const maxRiskAmount = accountBalanceUsd * (riskPercentage / 100);
  
  // Positionsgröße = Risikobetrag / Stop-Loss-Abstand
  const positionSize = maxRiskAmount / (stopLossPercentage / 100);
  
  // Nicht mehr als 20% des Guthabens pro Trade
  const maxPositionSize = accountBalanceUsd * 0.2;
  
  return Math.min(positionSize, maxPositionSize);
} 