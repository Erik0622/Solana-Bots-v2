'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { CustomBot } from './useCustomBots';

export function useFavoriteBots() {
  const { publicKey } = useWallet();
  const [favoriteBots, setFavoriteBots] = useState<string[]>([]);

  useEffect(() => {
    // Load favorite bots from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('favoriteBots');
      if (saved) {
        try {
          setFavoriteBots(JSON.parse(saved));
        } catch (error) {
          console.error('Error loading favorite bots:', error);
        }
      }
    }
  }, []);

  const toggleFavorite = (botId: string) => {
    const updatedFavorites = favoriteBots.includes(botId)
      ? favoriteBots.filter(id => id !== botId)
      : [...favoriteBots, botId];
    
    setFavoriteBots(updatedFavorites);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('favoriteBots', JSON.stringify(updatedFavorites));
    }
  };

  const isBotFavorite = (botId: string) => {
    return favoriteBots.includes(botId);
  };

  const addFavorite = (botId: string) => {
    if (!favoriteBots.includes(botId)) {
      const updatedFavorites = [...favoriteBots, botId];
      setFavoriteBots(updatedFavorites);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('favoriteBots', JSON.stringify(updatedFavorites));
      }
    }
  };

  const removeFavorite = (botId: string) => {
    const updatedFavorites = favoriteBots.filter(id => id !== botId);
    setFavoriteBots(updatedFavorites);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('favoriteBots', JSON.stringify(updatedFavorites));
    }
  };

  return {
    favoriteBots,
    toggleFavorite,
    isBotFavorite,
    addFavorite,
    removeFavorite,
  };
} 