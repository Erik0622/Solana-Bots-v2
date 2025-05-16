import { Connection, PublicKey, Transaction, Commitment, VersionedTransaction, AddressLookupTableAccount } from '@solana/web3.js';
import fetch from 'cross-fetch';

// Bekannte Token-Informationen
export const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
export const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
export const USDT_MINT = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
export const BTC_WRAPPED_MINT = new PublicKey('9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E');

// Jupiter Token-Liste URL - direkte URL verwenden
const JUPITER_TOKEN_LIST_URL = 'https://token.jup.ag/all';

// Cache für Token-Liste
let tokenList: any[] = [];

// Jupiter API URL
const JUPITER_API_URL = 'https://quote-api.jup.ag/v6';

/**
 * Lädt die Token-Liste vom Jupiter API
 */
export async function loadTokenList(): Promise<any[]> {
  if (tokenList.length > 0) return tokenList;
  
  try {
    const response = await fetch(JUPITER_TOKEN_LIST_URL);
    const { tokens } = await response.json();
    tokenList = tokens;
    return tokens;
  } catch (error) {
    console.error('Fehler beim Laden der Token-Liste:', error);
    return [];
  }
}

/**
 * Kauft ein Token mit SOL
 */
export async function buyTokenWithSOL(
  connection: Connection,
  userWallet: any, // Wallet mit signTransaction-Funktionalität
  tokenMint: PublicKey,
  amountInSOL: number
): Promise<{ signature: string; price: number; amountOut: number } | null> {
  try {
    // Konvertiere SOL-Betrag zu Lamports (z.B. 1 SOL = 1 * 10^9)
    const inputAmount = Math.floor(amountInSOL * 1_000_000_000).toString();
    
    // Hole Quote von Jupiter API
    const quoteResponse = await fetch(`${JUPITER_API_URL}/quote?inputMint=${SOL_MINT.toString()}&outputMint=${tokenMint.toString()}&amount=${inputAmount}&slippageBps=50`);
    
    if (!quoteResponse.ok) {
      throw new Error(`Jupiter API quote Fehler: ${quoteResponse.statusText}`);
    }
    
    const quoteData = await quoteResponse.json();
    
    if (!quoteData || !quoteData.outAmount) {
      console.log('Keine passende Route gefunden');
      return null;
    }
    
    // Preis berechnen
    const outAmount = Number(quoteData.outAmount);
    const inAmount = Number(inputAmount);
    const price = outAmount / inAmount;
    
    // Erstelle Swap-Transaktion
    const swapResponse = await fetch(`${JUPITER_API_URL}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: userWallet.publicKey.toString(),
        wrapAndUnwrapSol: true
      })
    });
    
    if (!swapResponse.ok) {
      throw new Error(`Jupiter API swap Fehler: ${swapResponse.statusText}`);
    }
    
    const swapData = await swapResponse.json();
    
    // Transaktion signieren und ausführen
    const { swapTransaction } = swapData;
    
    // Dekodiere und signiere die Transaktion
    const transaction = VersionedTransaction.deserialize(
      Buffer.from(swapTransaction, 'base64')
    );
    
    // Signiere Transaktion
    const signedTx = await userWallet.signTransaction(transaction);
    
    // Sende die signierte Transaktion
    const signature = await connection.sendTransaction(signedTx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });
    
    // Warte auf Bestätigung
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaktion fehlgeschlagen: ${confirmation.value.err}`);
    }
    
    return { 
      signature, 
      price, 
      amountOut: outAmount
    };
  } catch (error) {
    console.error('Fehler beim Kauf mit SOL:', error);
    return null;
  }
}

/**
 * Verkauft ein Token für SOL
 */
export async function sellTokenForSOL(
  connection: Connection,
  userWallet: any, // Wallet mit signTransaction-Funktionalität
  tokenMint: PublicKey,
  tokenAmount: number
): Promise<{ signature: string; price: number; amountOut: number } | null> {
  try {
    // Tokenbeträge sind meist Ganzzahlen, gerundet
    const inputAmount = Math.floor(tokenAmount).toString();
    
    // Hole Quote von Jupiter API
    const quoteResponse = await fetch(`${JUPITER_API_URL}/quote?inputMint=${tokenMint.toString()}&outputMint=${SOL_MINT.toString()}&amount=${inputAmount}&slippageBps=50`);
    
    if (!quoteResponse.ok) {
      throw new Error(`Jupiter API quote Fehler: ${quoteResponse.statusText}`);
    }
    
    const quoteData = await quoteResponse.json();
    
    if (!quoteData || !quoteData.outAmount) {
      console.log('Keine passende Route gefunden');
      return null;
    }
    
    // Preis berechnen
    const outAmount = Number(quoteData.outAmount) / 1_000_000_000; // Konvertiere zurück zu SOL
    const inAmount = Number(inputAmount);
    const price = outAmount / inAmount;
    
    // Erstelle Swap-Transaktion
    const swapResponse = await fetch(`${JUPITER_API_URL}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: userWallet.publicKey.toString(),
        wrapAndUnwrapSol: true
      })
    });
    
    if (!swapResponse.ok) {
      throw new Error(`Jupiter API swap Fehler: ${swapResponse.statusText}`);
    }
    
    const swapData = await swapResponse.json();
    
    // Transaktion signieren und ausführen
    const { swapTransaction } = swapData;
    
    // Dekodiere und signiere die Transaktion
    const transaction = VersionedTransaction.deserialize(
      Buffer.from(swapTransaction, 'base64')
    );
    
    // Signiere Transaktion
    const signedTx = await userWallet.signTransaction(transaction);
    
    // Sende die signierte Transaktion
    const signature = await connection.sendTransaction(signedTx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });
    
    // Warte auf Bestätigung
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaktion fehlgeschlagen: ${confirmation.value.err}`);
    }
    
    return { 
      signature, 
      price, 
      amountOut: outAmount
    };
  } catch (error) {
    console.error('Fehler beim Verkauf für SOL:', error);
    return null;
  }
}

// Die ursprünglichen Funktionen für USDC behalten wir für Kompatibilität, aber aktualisiert
export async function buyToken(
  connection: Connection,
  userWallet: any, // Wallet mit signTransaction-Funktionalität
  tokenMint: PublicKey,
  amountInUSDC: number
): Promise<{ signature: string; price: number; amountOut: number } | null> {
  try {
    // Konvertiere USDC-Betrag (z.B. 10 USDC = 10 * 10^6)
    const inputAmount = Math.floor(amountInUSDC * 1_000_000).toString();
    
    // Hole Quote von Jupiter API
    const quoteResponse = await fetch(`${JUPITER_API_URL}/quote?inputMint=${USDC_MINT.toString()}&outputMint=${tokenMint.toString()}&amount=${inputAmount}&slippageBps=50`);
    
    if (!quoteResponse.ok) {
      throw new Error(`Jupiter API quote Fehler: ${quoteResponse.statusText}`);
    }
    
    const quoteData = await quoteResponse.json();
    
    if (!quoteData || !quoteData.outAmount) {
      console.log('Keine passende Route gefunden');
      return null;
    }
    
    // Preis berechnen
    const outAmount = Number(quoteData.outAmount);
    const inAmount = Number(inputAmount);
    const price = outAmount / inAmount;
    
    // Erstelle Swap-Transaktion
    const swapResponse = await fetch(`${JUPITER_API_URL}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: userWallet.publicKey.toString()
      })
    });
    
    if (!swapResponse.ok) {
      throw new Error(`Jupiter API swap Fehler: ${swapResponse.statusText}`);
    }
    
    const swapData = await swapResponse.json();
    
    // Transaktion signieren und ausführen
    const { swapTransaction } = swapData;
    
    // Dekodiere und signiere die Transaktion
    const transaction = VersionedTransaction.deserialize(
      Buffer.from(swapTransaction, 'base64')
    );
    
    // Signiere Transaktion
    const signedTx = await userWallet.signTransaction(transaction);
    
    // Sende die signierte Transaktion
    const signature = await connection.sendTransaction(signedTx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });
    
    // Warte auf Bestätigung
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaktion fehlgeschlagen: ${confirmation.value.err}`);
    }
    
    return { 
      signature, 
      price, 
      amountOut: outAmount
    };
  } catch (error) {
    console.error('Fehler beim Kauf:', error);
    return null;
  }
}

export async function sellToken(
  connection: Connection,
  userWallet: any, // Wallet mit signTransaction-Funktionalität
  tokenMint: PublicKey,
  tokenAmount: number
): Promise<{ signature: string; price: number; amountOut: number } | null> {
  try {
    // Tokenbeträge sind meist Ganzzahlen, gerundet
    const inputAmount = Math.floor(tokenAmount).toString();
    
    // Hole Quote von Jupiter API
    const quoteResponse = await fetch(`${JUPITER_API_URL}/quote?inputMint=${tokenMint.toString()}&outputMint=${USDC_MINT.toString()}&amount=${inputAmount}&slippageBps=50`);
    
    if (!quoteResponse.ok) {
      throw new Error(`Jupiter API quote Fehler: ${quoteResponse.statusText}`);
    }
    
    const quoteData = await quoteResponse.json();
    
    if (!quoteData || !quoteData.outAmount) {
      console.log('Keine passende Route gefunden');
      return null;
    }
    
    // Preis berechnen
    const outAmount = Number(quoteData.outAmount) / 1_000_000; // Konvertiere zurück zu USDC
    const inAmount = Number(inputAmount);
    const price = outAmount / inAmount;
    
    // Erstelle Swap-Transaktion
    const swapResponse = await fetch(`${JUPITER_API_URL}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: userWallet.publicKey.toString()
      })
    });
    
    if (!swapResponse.ok) {
      throw new Error(`Jupiter API swap Fehler: ${swapResponse.statusText}`);
    }
    
    const swapData = await swapResponse.json();
    
    // Transaktion signieren und ausführen
    const { swapTransaction } = swapData;
    
    // Dekodiere und signiere die Transaktion
    const transaction = VersionedTransaction.deserialize(
      Buffer.from(swapTransaction, 'base64')
    );
    
    // Signiere Transaktion
    const signedTx = await userWallet.signTransaction(transaction);
    
    // Sende die signierte Transaktion
    const signature = await connection.sendTransaction(signedTx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });
    
    // Warte auf Bestätigung
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaktion fehlgeschlagen: ${confirmation.value.err}`);
    }
    
    return { 
      signature, 
      price, 
      amountOut: outAmount
    };
  } catch (error) {
    console.error('Fehler beim Verkauf:', error);
    return null;
  }
}

// Bekannte Trading-Paare für einfachen Zugriff
export const TradingPairs = {
  SOL_USDC: {
    baseMint: SOL_MINT,
    quoteMint: USDC_MINT,
    name: 'SOL/USDC'
  },
  SOL_USDT: {
    baseMint: SOL_MINT,
    quoteMint: USDT_MINT,
    name: 'SOL/USDT'
  },
  BTC_USDC: {
    baseMint: BTC_WRAPPED_MINT,
    quoteMint: USDC_MINT,
    name: 'BTC/USDC'
  }
};

// Hilfsfunktion zum Abrufen des passenden Trading-Paars anhand des Marktnamens
export function getTradingPairByMarketName(marketName: string): { baseMint: PublicKey, quoteMint: PublicKey } {
  switch (marketName.toLowerCase()) {
    case 'solusdc':
    case 'sol/usdc':
      return TradingPairs.SOL_USDC;
    case 'solusdt':
    case 'sol/usdt':
      return TradingPairs.SOL_USDT;
    case 'btcusdc':
    case 'btc/usdc':
      return TradingPairs.BTC_USDC;
    default:
      return TradingPairs.SOL_USDC; // Standardfall
  }
} 