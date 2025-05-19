'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { CustomBot } from './useCustomBots';

export const useFavoriteBots = () => {
  const { publicKey } = useWallet();
  const [favoriteBots, setFavoriteBots] = useState<string[]>([]);

  // Lade favorisierte Bots beim Start und wenn sich die Wallet ändert
  useEffect(() => {
    if (publicKey) {
      const storedFavorites = localStorage.getItem(`favoriteBots_${publicKey.toString()}`);
      if (storedFavorites) {
        setFavoriteBots(JSON.parse(storedFavorites));
      }
    } else {
      setFavoriteBots([]);
    }
  }, [publicKey]);

  // Überprüfe, ob ein Bot favorisiert ist
  const isBotFavorite = (botId: string): boolean => {
    return favoriteBots.includes(botId);
  };

  // Bot zu Favoriten hinzufügen oder entfernen
  const toggleFavorite = (botId: string) => {
    if (!publicKey) return;

    let updatedFavorites: string[];
    
    if (favoriteBots.includes(botId)) {
      // Bot entfernen
      updatedFavorites = favoriteBots.filter(id => id !== botId);
    } else {
      // Bot hinzufügen
      updatedFavorites = [...favoriteBots, botId];
    }
    
    setFavoriteBots(updatedFavorites);
    localStorage.setItem(`favoriteBots_${publicKey.toString()}`, JSON.stringify(updatedFavorites));
  };

  return {
    favoriteBots,
    isBotFavorite,
    toggleFavorite
  };
}; 