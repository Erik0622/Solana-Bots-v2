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

// Normalisiere Bot-IDs, um eine einheitliche Darstellung sicherzustellen
function normalizeBotId(botId: string): string {
  // Zuordnungstabelle für Kurzform zu Langform
  const idMapping: Record<string, string> = {
    'vol-tracker': 'volume-tracker',
    'trend-surfer': 'trend-surfer', // Bereits gleich
    'arb-finder': 'dip-hunter', // arb-finder ist eine alternative ID für dip-hunter
  };

  // Wenn eine Kurzform-ID vorliegt, in Langform umwandeln
  return idMapping[botId] || botId;
}

export function BotStatusProvider({ children }: { children: React.ReactNode }) {
  const [botStatuses, setBotStatuses] = useState<BotStatusMap>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Normalisiere den Status im localStorage
  const normalizeStoredStatuses = (storedStatuses: Record<string, BotStatus>): BotStatusMap => {
    const normalized: BotStatusMap = {};
    
    Object.entries(storedStatuses).forEach(([botId, status]) => {
      const normalizedId = normalizeBotId(botId);
      normalized[normalizedId] = status;
    });
    
    return normalized;
  };

  // Beim ersten Rendern Status aus localStorage laden
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedStatus = localStorage.getItem('botStatuses');
        if (savedStatus) {
          console.log('Lade Bot-Status aus localStorage:', savedStatus);
          const parsed = JSON.parse(savedStatus);
          
          // Normalisiere alle IDs beim Laden
          const normalizedStatuses = normalizeStoredStatuses(parsed);
          setBotStatuses(normalizedStatuses);
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
    // Normalisiere die Bot-ID bei jedem Update
    const normalizedId = normalizeBotId(botId);
    console.log(`BotStatusContext: Status für Bot ${normalizedId} aktualisiert auf ${status}`);
    
    setBotStatuses(prev => ({
      ...prev,
      [normalizedId]: status
    }));
  };

  const isBotActive = (botId: string): boolean => {
    // Normalisiere die Bot-ID bei jeder Abfrage
    const normalizedId = normalizeBotId(botId);
    return botStatuses[normalizedId] === 'active';
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
          // Normalisiere die Bot-ID von der API
          const normalizedId = normalizeBotId(bot.id);
          newStatuses[normalizedId] = bot.status;
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