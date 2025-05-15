import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';

// Interfaces für Token-Informationen
export interface NewToken {
  mint: string;
  symbol: string;
  name: string;
  launchTime: number;
  marketCap: number;
  liquidityLocked: boolean;
  isHoneypot: boolean;
  volume24h: number;
  price: number;
}

// Konfiguration für Token-Discovery
export interface TokenDiscoveryConfig {
  maxAgeHours: number;
  minMarketCap: number;
  requireLockedLiquidity: boolean;
  minVolume: number;
}

// Standard-Konfiguration
const DEFAULT_CONFIG: TokenDiscoveryConfig = {
  maxAgeHours: 24,
  minMarketCap: 100000,
  requireLockedLiquidity: true,
  minVolume: 5000
};

/**
 * Token-Discovery-Service für neue Solana-Tokens
 */
export class TokenDiscoveryService {
  private connection: Connection;
  private config: TokenDiscoveryConfig;
  private tokenCache: Map<string, NewToken> = new Map();
  private lastScanTime: number = 0;

  constructor(connection: Connection, config: TokenDiscoveryConfig = DEFAULT_CONFIG) {
    this.connection = connection;
    this.config = config;
  }

  /**
   * Findet neue Tokens auf Solana basierend auf den Konfigurationskriterien
   */
  async findNewTokens(): Promise<NewToken[]> {
    try {
      // Verhindere zu häufiges Scannen (max. alle 5 Minuten)
      const now = Date.now();
      if (now - this.lastScanTime < 5 * 60 * 1000) {
        return Array.from(this.tokenCache.values());
      }
      
      this.lastScanTime = now;
      
      // Verwende Birdeye API für neue Token-Discovery
      // Alternativ könnte hier auch Solscan oder Solana FM APIs verwendet werden
      const response = await axios.get('https://public-api.birdeye.so/defi/new_tokens', {
        headers: {
          'X-API-KEY': process.env.BIRDEYE_API_KEY || 'YOUR_BIRDEYE_API_KEY'
        }
      });
      
      if (!response.data || !response.data.data) {
        console.error('Unerwartetes Antwortformat von Birdeye API');
        return [];
      }
      
      const tokens = response.data.data;
      const filteredTokens: NewToken[] = [];
      
      for (const token of tokens) {
        // Prüfe Alter des Tokens (nicht älter als konfigurierte Stunden)
        const launchTime = token.launchTime || token.createdAt;
        if (!launchTime || (now - launchTime) > this.config.maxAgeHours * 60 * 60 * 1000) {
          continue;
        }
        
        // Prüfe Mindestmarktkapitalisierung
        if (token.marketCap < this.config.minMarketCap) {
          continue;
        }
        
        // Prüfe Volumen
        if (token.volume24h < this.config.minVolume) {
          continue;
        }
        
        // Prüfe Sicherheitsmerkmale mit RugCheck API
        const securityCheck = await this.checkTokenSecurity(token.mint);
        
        // Wenn Liquidity Lock erforderlich ist und nicht erfüllt wird, überspringe
        if (this.config.requireLockedLiquidity && !securityCheck.liquidityLocked) {
          continue;
        }
        
        // Vermeide Honeypots
        if (securityCheck.isHoneypot) {
          continue;
        }
        
        // Token erfüllt alle Kriterien
        const newToken: NewToken = {
          mint: token.mint,
          symbol: token.symbol,
          name: token.name,
          launchTime: launchTime,
          marketCap: token.marketCap,
          liquidityLocked: securityCheck.liquidityLocked,
          isHoneypot: securityCheck.isHoneypot,
          volume24h: token.volume24h,
          price: token.price
        };
        
        filteredTokens.push(newToken);
        this.tokenCache.set(token.mint, newToken);
      }
      
      console.log(`${filteredTokens.length} neue Token gefunden, die die Kriterien erfüllen`);
      return filteredTokens;
    } catch (error) {
      console.error('Fehler bei der Token-Discovery:', error);
      return Array.from(this.tokenCache.values());
    }
  }

  /**
   * Überprüft die Sicherheit eines Tokens mit RugCheck API
   */
  private async checkTokenSecurity(tokenMint: string): Promise<{ liquidityLocked: boolean; isHoneypot: boolean }> {
    try {
      // Verwende RugCheck API für Sicherheitsüberprüfungen
      const response = await axios.get(`https://api.rugcheck.xyz/v1/tokens/${tokenMint}/check`, {
        headers: {
          'X-API-KEY': process.env.RUGCHECK_API_KEY || 'YOUR_RUGCHECK_API_KEY'
        }
      });
      
      if (!response.data) {
        return { liquidityLocked: false, isHoneypot: true }; // Im Zweifelsfall als unsicher einstufen
      }
      
      // Extrahiere relevante Sicherheitsinformationen
      const securityData = response.data;
      
      return {
        liquidityLocked: securityData.liquidityLocked || false,
        isHoneypot: securityData.isHoneypot || false
      };
    } catch (error) {
      console.error(`Fehler bei der Sicherheitsüberprüfung für Token ${tokenMint}:`, error);
      return { liquidityLocked: false, isHoneypot: true }; // Im Zweifelsfall als unsicher einstufen
    }
  }
  
  /**
   * Holt die vollständigen Informationen für einen bestimmten Token
   */
  async getTokenInfo(tokenMint: string): Promise<NewToken | null> {
    try {
      if (this.tokenCache.has(tokenMint)) {
        return this.tokenCache.get(tokenMint)!;
      }
      
      // Holt die Informationen für einen bestimmten Token
      const response = await axios.get(`https://public-api.birdeye.so/public/tokeninfo?address=${tokenMint}`, {
        headers: {
          'X-API-KEY': process.env.BIRDEYE_API_KEY || 'YOUR_BIRDEYE_API_KEY'
        }
      });
      
      if (!response.data || !response.data.data) {
        return null;
      }
      
      const tokenData = response.data.data;
      
      // Prüfe Sicherheitsmerkmale
      const securityCheck = await this.checkTokenSecurity(tokenMint);
      
      const tokenInfo: NewToken = {
        mint: tokenMint,
        symbol: tokenData.symbol,
        name: tokenData.name,
        launchTime: tokenData.launchTime || Date.now(), // Fallback zum aktuellen Zeitpunkt
        marketCap: tokenData.marketCap || 0,
        liquidityLocked: securityCheck.liquidityLocked,
        isHoneypot: securityCheck.isHoneypot,
        volume24h: tokenData.volume24h || 0,
        price: tokenData.price || 0
      };
      
      // Cache das Ergebnis
      this.tokenCache.set(tokenMint, tokenInfo);
      
      return tokenInfo;
    } catch (error) {
      console.error(`Fehler beim Laden der Token-Informationen für ${tokenMint}:`, error);
      return null;
    }
  }
  
  /**
   * Aktualisiert die Konfiguration für die Token-Discovery
   */
  updateConfig(newConfig: Partial<TokenDiscoveryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // Leere den Cache, wenn sich die Konfiguration ändert
    this.tokenCache.clear();
  }
} 