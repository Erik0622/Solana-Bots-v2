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
  riskLevel: string;
  riskColor: string;
  baseRiskPerTrade: number;
  riskManagement: string;
  status: 'active' | 'paused';
  profitToday: number;
  profitWeek: number;
  profitMonth: number;
  createdAt: string;
  walletAddress: string;
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
      setCustomBots([]);
    }
  }, [publicKey]);

  // Speichere einen neuen Bot
  const saveBot = (bot: Omit<CustomBot, 'walletAddress' | 'createdAt'>) => {
    if (!publicKey) return;

    const newBot: CustomBot = {
      ...bot,
      createdAt: new Date().toISOString(),
      walletAddress: publicKey.toString(),
    };

    const updatedBots = [...customBots, newBot];
    setCustomBots(updatedBots);
    localStorage.setItem(`customBots_${publicKey.toString()}`, JSON.stringify(updatedBots));
    return newBot;
  };

  // Aktualisiere einen bestehenden Bot
  const updateBot = (botId: string, updates: Partial<CustomBot>) => {
    if (!publicKey) return;

    const updatedBots = customBots.map(bot => 
      bot.id === botId ? { ...bot, ...updates } : bot
    );
    
    setCustomBots(updatedBots);
    localStorage.setItem(`customBots_${publicKey.toString()}`, JSON.stringify(updatedBots));
  };

  // Lösche einen Bot
  const deleteBot = (botId: string) => {
    if (!publicKey) return;

    const updatedBots = customBots.filter(bot => bot.id !== botId);
    setCustomBots(updatedBots);
    localStorage.setItem(`customBots_${publicKey.toString()}`, JSON.stringify(updatedBots));
  };

  return {
    customBots,
    saveBot,
    updateBot,
    deleteBot
  };
}; 