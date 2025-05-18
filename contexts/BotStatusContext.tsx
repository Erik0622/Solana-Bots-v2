'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type BotStatus = 'active' | 'paused';
type BotStatusMap = Record<string, BotStatus>;

interface BotStatusContextType {
  botStatuses: BotStatusMap;
  updateBotStatus: (botId: string, status: BotStatus) => void;
  fetchAllBotStatuses: (walletAddress?: string) => Promise<void>;
  isBotActive: (botId: string) => boolean;
  isClientHydrated: boolean;
}

const BotStatusContext = createContext<BotStatusContextType | undefined>(undefined);

// DEFINE KNOWN BOT IDS (use normalized versions)
// Diese sollten idealerweise aus einer zentralen Konfiguration kommen oder dynamisch, aber stabil geladen werden.
const KNOWN_BOT_IDS = ['volume-tracker', 'trend-surfer', 'dip-hunter'];

// Normalisiere Bot-IDs, um eine einheitliche Darstellung sicherzustellen
// Diese Funktion muss hier bleiben, da sie vor dem Context existiert.
function normalizeBotId(botId: string): string {
  const idMapping: Record<string, string> = {
    'vol-tracker': 'volume-tracker',
    'volume-tracker': 'volume-tracker', // explizit für Klarheit
    'trend-surfer': 'trend-surfer',
    'momentum-bot': 'trend-surfer', // Alias für trend-surfer
    'arb-finder': 'dip-hunter',
    'dip-hunter': 'dip-hunter' // explizit für Klarheit
  };
  return idMapping[botId.toLowerCase()] || botId; // Immer Kleinschreibung für den Key verwenden
}

// Helper to create default statuses
const getDefaultStatuses = (): BotStatusMap => {
  const statuses: BotStatusMap = {};
  KNOWN_BOT_IDS.forEach(id => {
    statuses[normalizeBotId(id)] = 'paused'; // Stelle sicher, dass normalisierte IDs verwendet werden
  });
  return statuses;
};

export function BotStatusProvider({ children }: { children: React.ReactNode }) {
  const [botStatuses, setBotStatuses] = useState<BotStatusMap>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedStatus = localStorage.getItem('botStatuses');
        if (savedStatus) {
          console.log('Initial load from localStorage for useState:', savedStatus);
          const parsed = JSON.parse(savedStatus);
          const normalized: BotStatusMap = {};
          let allKnownBotsCovered = true;
          // Normalisiere und validiere geladene Status
          Object.entries(parsed).forEach(([key, value]) => {
            const normId = normalizeBotId(key);
            if (KNOWN_BOT_IDS.includes(normId)) {
              normalized[normId] = value as BotStatus;
            }
          });
          // Stelle sicher, dass alle bekannten Bots einen Status haben
          KNOWN_BOT_IDS.forEach(id => {
            if (normalized[id] === undefined) {
              normalized[id] = 'paused'; // Default für fehlende bekannte Bots
              allKnownBotsCovered = false; 
            }
          });
          // Nur zurückgeben, wenn alle bekannten Bots abgedeckt sind oder es gültig aussieht
          // Dies verhindert das Zurückgeben eines leeren oder unvollständigen Objekts, falls localStorage korrupt ist.
          if (Object.keys(normalized).length > 0 && allKnownBotsCovered) {
            return normalized;
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden von localStorage für Initialwert:', error);
      }
    }
    console.log('Initial load: using default statuses for SSR or empty/invalid localStorage.');
    return getDefaultStatuses();
  });

  const [isClientHydrated, setIsClientHydrated] = useState(false);

  useEffect(() => {
    setIsClientHydrated(true);
    console.log('BotStatusProvider: Client hydrated. Initial statuses from useState:', botStatuses);
    // Optional: Erneutes Laden/Validieren aus localStorage hier, falls nötig.
    // Zum Beispiel, wenn `useState`-Initialisierung nicht ausreicht.
    // Fürs Erste verlassen wir uns auf die `useState`-Initialisierungslogik.
  }, []);

  // Speichere in localStorage, wenn sich botStatuses ändert UND Client hydriert ist
  useEffect(() => {
    if (isClientHydrated && typeof window !== 'undefined') {
      console.log('Speichere Bot-Status in localStorage (isClientHydrated):', JSON.stringify(botStatuses));
      localStorage.setItem('botStatuses', JSON.stringify(botStatuses));
    }
  }, [botStatuses, isClientHydrated]);

  const updateBotStatus = useCallback((botId: string, status: BotStatus) => {
    const normalizedId = normalizeBotId(botId);
    if (!KNOWN_BOT_IDS.includes(normalizedId)) {
      console.warn(`BotStatusContext: Versuch, unbekannte botId zu aktualisieren: ${botId} (normalisiert: ${normalizedId})`);
      return;
    }
    console.log(`BotStatusContext: updateBotStatus für ${normalizedId} zu ${status}`);
    setBotStatuses(prev => {
      if (prev[normalizedId] === status) return prev;
      return { ...prev, [normalizedId]: status };
    });
  }, []); // normalizeBotId ist eine Top-Level-Funktion, KNOWN_BOT_IDS ist ein Top-Level const

  const fetchAllBotStatuses = useCallback(async (walletAddress?: string) => {
    if (!walletAddress || !isClientHydrated) {
      console.log('fetchAllBotStatuses: Übersprungen (kein Wallet / nicht hydriert / kein PublicKey)');
      return;
    }
    console.log('fetchAllBotStatuses: Abrufen für Wallet', walletAddress);
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/bots?wallet=${walletAddress}&_=${timestamp}`, {
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        cache: 'no-store'
      });

      if (!response.ok) {
        console.error('Fehler beim Abrufen der Bot-Status API:', response.status, await response.text());
        return;
      }
      const data = await response.json();

      if (Array.isArray(data)) {
        console.log('fetchAllBotStatuses: API Antwortdaten:', data);
        setBotStatuses(prevLocalStatuses => {
          const newStatusesFromApi: BotStatusMap = {};
          let hasRelevantChanges = false;

          data.forEach(botFromApi => {
            const normalizedId = normalizeBotId(botFromApi.id);
            if (KNOWN_BOT_IDS.includes(normalizedId)) {
              newStatusesFromApi[normalizedId] = botFromApi.status as BotStatus;
            }
          });

          const nextState = { ...prevLocalStatuses }; // Kopie des aktuellen lokalen Zustands

          KNOWN_BOT_IDS.forEach(botId => {
            const apiStatus = newStatusesFromApi[botId]; // Status von API für diesen Bot
            const localStatus = prevLocalStatuses[botId] || 'paused'; // Aktueller lokaler Status, default 'paused'

            if (apiStatus !== undefined) { // Wenn API einen Status für diesen Bot geliefert hat
              if (localStatus !== apiStatus) {
                nextState[botId] = apiStatus;
                hasRelevantChanges = true;
              }
            } else { // API hat diesen Bot nicht geliefert
              // Behalte lokalen Status oder setze auf 'paused', falls er undefiniert war
              if (nextState[botId] === undefined ) {
                 nextState[botId] = 'paused';
                 // Nur als Änderung markieren, wenn der lokale Status nicht schon 'paused' war
                 if (localStatus !== 'paused') hasRelevantChanges = true;
              }
            }
          });
          
          if (hasRelevantChanges) {
            console.log('fetchAllBotStatuses: Wende API-Status an:', nextState);
            return nextState;
          }
          console.log('fetchAllBotStatuses: Keine relevanten Änderungen durch API-Daten.');
          return prevLocalStatuses;
        });
      } else {
        console.warn('fetchAllBotStatuses: API-Antwort war kein Array:', data);
         // Hier könnte man entscheiden, den lokalen Status nicht zu ändern oder auf Default zurückzusetzen
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Bot-Status (Exception):', error);
    }
  }, [isClientHydrated]); // normalizeBotId ist stabil

  const isBotActive = useCallback((botId: string): boolean => {
    const normalizedId = normalizeBotId(botId);
    return botStatuses[normalizedId] === 'active';
  }, [botStatuses]); // Hängt von botStatuses ab

  return (
    <BotStatusContext.Provider value={{ botStatuses, updateBotStatus, fetchAllBotStatuses, isBotActive, isClientHydrated }}>
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