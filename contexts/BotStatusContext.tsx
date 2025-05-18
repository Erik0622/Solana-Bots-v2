'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type BotStatus = 'active' | 'paused';
type BotStatusMap = Record<string, BotStatus>;

interface BotStatusContextType {
  botStatuses: BotStatusMap;
  updateBotStatus: (botId: string, status: BotStatus) => void;
  fetchAllBotStatuses: (walletAddress?: string) => Promise<void>;
  isBotActive: (botId: string) => boolean;
}

const BotStatusContext = createContext<BotStatusContextType | undefined>(undefined);

export function BotStatusProvider({ children }: { children: React.ReactNode }) {
  const [botStatuses, setBotStatuses] = useState<BotStatusMap>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Beim ersten Rendern Status aus localStorage laden
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedStatus = localStorage.getItem('botStatuses');
        if (savedStatus) {
          console.log('Lade Bot-Status aus localStorage:', savedStatus);
          setBotStatuses(JSON.parse(savedStatus));
        }
        setIsInitialized(true);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Bot-Status aus localStorage:', error);
      setIsInitialized(true);
    }
  }, []);

  // Bei Änderungen im Status in localStorage speichern
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      console.log('Speichere Bot-Status in localStorage:', JSON.stringify(botStatuses));
      localStorage.setItem('botStatuses', JSON.stringify(botStatuses));
    }
  }, [botStatuses, isInitialized]);

  const updateBotStatus = (botId: string, status: BotStatus) => {
    console.log(`BotStatusContext: Status für Bot ${botId} aktualisiert auf ${status}`);
    setBotStatuses(prev => ({
      ...prev,
      [botId]: status
    }));
  };

  const isBotActive = (botId: string): boolean => {
    return botStatuses[botId] === 'active';
  };

  const fetchAllBotStatuses = async (walletAddress?: string) => {
    if (!walletAddress) return;

    try {
      // Cache-Busting durch Timestamp
      const timestamp = Date.now();
      const response = await fetch(`/api/bots?wallet=${walletAddress}&_=${timestamp}`, {
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        console.error('Fehler beim Abrufen der Bot-Status:', response.status);
        return;
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        // Update botStatuses basierend auf der API-Antwort
        const newStatuses: BotStatusMap = {};
        data.forEach(bot => {
          newStatuses[bot.id] = bot.status;
        });

        // Nur aktualisieren, wenn es tatsächlich Änderungen gibt
        setBotStatuses(prev => {
          const hasChanges = Object.keys(newStatuses).some(
            id => newStatuses[id] !== prev[id]
          );
          return hasChanges ? { ...prev, ...newStatuses } : prev;
        });
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Bot-Status:', error);
    }
  };

  return (
    <BotStatusContext.Provider value={{ botStatuses, updateBotStatus, fetchAllBotStatuses, isBotActive }}>
      {children}
    </BotStatusContext.Provider>
  );
}

export function useBotStatus() {
  const context = useContext(BotStatusContext);
  if (context === undefined) {
    throw new Error('useBotStatus muss innerhalb eines BotStatusProvider verwendet werden');
  }
  return context;
} 