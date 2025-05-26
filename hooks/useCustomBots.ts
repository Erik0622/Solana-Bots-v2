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
  riskLevel: 'low' | 'moderate' | 'high';
  riskColor: string;
  baseRiskPerTrade: number;
  riskManagement?: string;
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

export function useCustomBots() {
  const { publicKey } = useWallet();
  const [customBots, setCustomBots] = useState<CustomBot[]>([]);

  useEffect(() => {
    // Load custom bots from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customBots');
      if (saved) {
        try {
          setCustomBots(JSON.parse(saved));
        } catch (error) {
          console.error('Error loading custom bots:', error);
        }
      }
    }
  }, []);

  const addCustomBot = (bot: Omit<CustomBot, 'id' | 'createdAt'>) => {
    const newBot: CustomBot = {
      ...bot,
      id: `custom-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    
    const updatedBots = [...customBots, newBot];
    setCustomBots(updatedBots);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('customBots', JSON.stringify(updatedBots));
    }
    
    return newBot;
  };

  const removeCustomBot = (id: string) => {
    const updatedBots = customBots.filter(bot => bot.id !== id);
    setCustomBots(updatedBots);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('customBots', JSON.stringify(updatedBots));
    }
  };

  const updateCustomBot = (id: string, updates: Partial<CustomBot>) => {
    const updatedBots = customBots.map(bot => 
      bot.id === id ? { ...bot, ...updates } : bot
    );
    setCustomBots(updatedBots);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('customBots', JSON.stringify(updatedBots));
    }
  };

  return {
    customBots,
    addCustomBot,
    removeCustomBot,
    updateCustomBot,
  };
} 