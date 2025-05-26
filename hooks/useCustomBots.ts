'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export interface CustomBot {
  id: string;
  name: string;
  description: string;
  weeklyReturn: string;
  monthlyReturn: string;
  trades: number;
  winRate: string;
  strategy: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'custom';
  riskColor: string;
  baseRiskPerTrade: number;
  riskManagement: string;
  status: 'active' | 'paused';
  profitToday: number;
  profitWeek: number;
  profitMonth: number;
  createdAt: string;
  walletAddress: string;
  code?: string; // Optional field for storing the generated code
  tradingStyle?: string;
  timeframe?: string;
}

export const useCustomBots = () => {
  const { publicKey } = useWallet();
  const [customBots, setCustomBots] = useState<CustomBot[]>([]);

  // Lade Bots beim Start und wenn sich die Wallet ändert
  useEffect(() => {
    if (publicKey) {
      const storedBots = localStorage.getItem(`customBots_${publicKey.toString()}`);
      if (storedBots) {
        setCustomBots(JSON.parse(storedBots));
      }
    } else {
      // Lade Guest Bots wenn keine Wallet verbunden
      const guestBots = localStorage.getItem('customBots_guest');
      if (guestBots) {
        setCustomBots(JSON.parse(guestBots));
      } else {
        setCustomBots([]);
      }
    }
  }, [publicKey]);

  // Speichere einen neuen Bot
  const saveBot = (bot: Omit<CustomBot, 'walletAddress' | 'createdAt'>) => {
    const newBot: CustomBot = {
      ...bot,
      createdAt: new Date().toISOString(),
      walletAddress: publicKey?.toString() || 'guest',
    };

    const updatedBots = [...customBots, newBot];
    setCustomBots(updatedBots);
    
    if (publicKey) {
      localStorage.setItem(`customBots_${publicKey.toString()}`, JSON.stringify(updatedBots));
    } else {
      localStorage.setItem('customBots_guest', JSON.stringify(updatedBots));
    }
    
    return newBot;
  };

  // Aktualisiere einen bestehenden Bot
  const updateBot = (botId: string, updates: Partial<CustomBot>) => {
    const updatedBots = customBots.map(bot => 
      bot.id === botId ? { ...bot, ...updates } : bot
    );
    
    setCustomBots(updatedBots);
    
    if (publicKey) {
      localStorage.setItem(`customBots_${publicKey.toString()}`, JSON.stringify(updatedBots));
    } else {
      localStorage.setItem('customBots_guest', JSON.stringify(updatedBots));
    }
  };

  // Lösche einen Bot
  const deleteBot = (botId: string) => {
    const updatedBots = customBots.filter(bot => bot.id !== botId);
    setCustomBots(updatedBots);
    
    if (publicKey) {
      localStorage.setItem(`customBots_${publicKey.toString()}`, JSON.stringify(updatedBots));
    } else {
      localStorage.setItem('customBots_guest', JSON.stringify(updatedBots));
    }
  };

  // Hole alle Bots (auch ohne Wallet für Anzeige)
  const getBots = () => {
    return customBots;
  };

  return {
    customBots,
    saveBot,
    updateBot,
    deleteBot,
    getBots
  };
}; 