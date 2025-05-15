import { Connection, PublicKey, Transaction, Commitment, VersionedTransaction } from '@solana/web3.js';
import { Jupiter, RouteInfo, TOKEN_LIST_URL } from '@jup-ag/core';
import { Wallet } from '@project-serum/anchor';
import fetch from 'cross-fetch';

// Bekannte Token-Informationen
export const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
export const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
export const USDT_MINT = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
export const BTC_WRAPPED_MINT = new PublicKey('9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E');

// Cache für Token-Liste
let tokenList: any[] = [];

// Jupiter-Instanzen für verschiedene Verbindungen
const jupiterInstances = new Map<string, Jupiter>();

/**
 * Lädt die Token-Liste vom Jupiter API
 */
export async function loadTokenList(): Promise<any[]> {
  if (tokenList.length > 0) return tokenList;
  
  try {
    const response = await fetch(TOKEN_LIST_URL);
    const { tokens } = await response.json();
    tokenList = tokens;
    return tokens;
  } catch (error) {
    console.error('Fehler beim Laden der Token-Liste:', error);
    return [];
  }
}

/**
 * Holt oder erstellt eine Jupiter-Instanz
 */
export async function getJupiter(
  connection: Connection,
  userWallet: PublicKey,
  commitment: Commitment = 'confirmed'
): Promise<Jupiter> {
  const connectionKey = `${connection.rpcEndpoint}-${userWallet.toString()}`;
  
  if (jupiterInstances.has(connectionKey)) {
    return jupiterInstances.get(connectionKey)!;
  }
  
  // Erstelle neue Jupiter-Instanz
  const jupiter = await Jupiter.load({
    connection,
    cluster: 'mainnet-beta',
    user: userWallet,
    restrictIntermediateTokens: true, // Sicherheitsfeature, um unbekannte Token zu vermeiden
    shouldLoadSerumOpenOrders: false, // Nur für DEX Trading benötigt
  });
  
  jupiterInstances.set(connectionKey, jupiter);
  return jupiter;
}

/**
 * Berechnet den besten Handelsweg
 */
export async function findBestRoute(
  jupiter: Jupiter,
  inputMint: PublicKey,
  outputMint: PublicKey,
  amount: number,
  slippageBps: number = 50 // 0.5% Slippage Standard
): Promise<RouteInfo | null> {
  try {
    const routes = await jupiter.computeRoutes({
      inputMint,
      outputMint,
      amount,
      slippageBps,
      feeBps: 5, // 0.05% Gebühr
      onlyDirectRoutes: false,
    });

    // Hole die beste Route basierend auf dem Output-Wert
    const bestRoute = routes.routesInfos[0];
    
    if (!bestRoute) {
      console.log('Keine passende Route gefunden');
      return null;
    }
    
    return bestRoute;
  } catch (error) {
    console.error('Fehler beim Berechnen der Route:', error);
    return null;
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
    const jupiter = await getJupiter(connection, userWallet.publicKey);
    
    // Konvertiere SOL-Betrag zu Lamports (z.B. 1 SOL = 1 * 10^9)
    const inputAmount = amountInSOL * 1_000_000_000;
    
    // Finde beste Route
    const bestRoute = await findBestRoute(jupiter, SOL_MINT, tokenMint, inputAmount);
    if (!bestRoute) return null;
    
    // Preis berechnen
    const price = Number(bestRoute.outAmount) / Number(bestRoute.inAmount);
    const outAmount = Number(bestRoute.outAmount);
    
    // Erstelle Transaktion
    const { transactions } = await jupiter.exchange({
      routeInfo: bestRoute
    });
    
    // Dieser Part muss clientseitig erfolgen!
    if (!userWallet.signTransaction) {
      throw new Error("Wallet unterstützt signTransaction-Methode nicht");
    }
    
    // Sende die Transaktion
    const { swapTransaction } = transactions;
    
    let signedTx;
    if (swapTransaction instanceof Transaction) {
      signedTx = await userWallet.signTransaction(swapTransaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      return { signature, price, amountOut: outAmount };
    } else if (swapTransaction instanceof VersionedTransaction) {
      signedTx = await userWallet.signTransaction(swapTransaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      return { signature, price, amountOut: outAmount };
    }
    
    throw new Error("Unbekannter Transaktionstyp");
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
    const jupiter = await getJupiter(connection, userWallet.publicKey);
    
    // Finde beste Route
    const bestRoute = await findBestRoute(jupiter, tokenMint, SOL_MINT, tokenAmount);
    if (!bestRoute) return null;
    
    // Preis berechnen
    const price = Number(bestRoute.outAmount) / Number(bestRoute.inAmount);
    const outAmount = Number(bestRoute.outAmount) / 1_000_000_000; // Konvertiere zurück zu SOL
    
    // Erstelle Transaktion
    const { transactions } = await jupiter.exchange({
      routeInfo: bestRoute
    });
    
    // Dieser Part muss clientseitig erfolgen!
    if (!userWallet.signTransaction) {
      throw new Error("Wallet unterstützt signTransaction-Methode nicht");
    }
    
    // Sende die Transaktion
    const { swapTransaction } = transactions;
    
    let signedTx;
    if (swapTransaction instanceof Transaction) {
      signedTx = await userWallet.signTransaction(swapTransaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      return { signature, price, amountOut };
    } else if (swapTransaction instanceof VersionedTransaction) {
      signedTx = await userWallet.signTransaction(swapTransaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      return { signature, price, amountOut };
    }
    
    throw new Error("Unbekannter Transaktionstyp");
  } catch (error) {
    console.error('Fehler beim Verkauf für SOL:', error);
    return null;
  }
}

// Die ursprünglichen Funktionen für USDC behalten wir für Kompatibilität
export async function buyToken(
  connection: Connection,
  userWallet: any, // Wallet mit signTransaction-Funktionalität
  tokenMint: PublicKey,
  amountInUSDC: number
): Promise<{ signature: string; price: number; amountOut: number } | null> {
  try {
    const jupiter = await getJupiter(connection, userWallet.publicKey);
    
    // Konvertiere USDC-Betrag (z.B. 10 USDC = 10 * 10^6)
    const inputAmount = amountInUSDC * 1_000_000;
    
    // Finde beste Route
    const bestRoute = await findBestRoute(jupiter, USDC_MINT, tokenMint, inputAmount);
    if (!bestRoute) return null;
    
    // Preis berechnen
    const price = Number(bestRoute.outAmount) / Number(bestRoute.inAmount);
    const outAmount = Number(bestRoute.outAmount);
    
    // Erstelle Transaktion
    const { transactions } = await jupiter.exchange({
      routeInfo: bestRoute
    });
    
    // Dieser Part muss clientseitig erfolgen!
    if (!userWallet.signTransaction) {
      throw new Error("Wallet unterstützt signTransaction-Methode nicht");
    }
    
    // Sende die Transaktion
    const { swapTransaction } = transactions;
    
    let signedTx;
    if (swapTransaction instanceof Transaction) {
      signedTx = await userWallet.signTransaction(swapTransaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      return { signature, price, amountOut: outAmount };
    } else if (swapTransaction instanceof VersionedTransaction) {
      signedTx = await userWallet.signTransaction(swapTransaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      return { signature, price, amountOut: outAmount };
    }
    
    throw new Error("Unbekannter Transaktionstyp");
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
    const jupiter = await getJupiter(connection, userWallet.publicKey);
    
    // Finde beste Route
    const bestRoute = await findBestRoute(jupiter, tokenMint, USDC_MINT, tokenAmount);
    if (!bestRoute) return null;
    
    // Preis berechnen
    const price = Number(bestRoute.outAmount) / Number(bestRoute.inAmount);
    const outAmount = Number(bestRoute.outAmount) / 1_000_000; // Konvertiere zurück zu USDC
    
    // Erstelle Transaktion
    const { transactions } = await jupiter.exchange({
      routeInfo: bestRoute
    });
    
    // Dieser Part muss clientseitig erfolgen!
    if (!userWallet.signTransaction) {
      throw new Error("Wallet unterstützt signTransaction-Methode nicht");
    }
    
    // Sende die Transaktion
    const { swapTransaction } = transactions;
    
    let signedTx;
    if (swapTransaction instanceof Transaction) {
      signedTx = await userWallet.signTransaction(swapTransaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      return { signature, price, amountOut };
    } else if (swapTransaction instanceof VersionedTransaction) {
      signedTx = await userWallet.signTransaction(swapTransaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      return { signature, price, amountOut };
    }
    
    throw new Error("Unbekannter Transaktionstyp");
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