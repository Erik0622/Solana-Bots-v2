// Einfache Library zur Verwaltung des Bot-Status
// Verwendet direkt localStorage ohne React Context

export type BotStatus = 'active' | 'paused';
export type BotId = 'volume-tracker' | 'trend-surfer' | 'dip-hunter';

// Standardisierte Bot-IDs für Konsistenz
export const BOT_IDS: BotId[] = ['volume-tracker', 'trend-surfer', 'dip-hunter'];

// Normalisierung der IDs, damit immer dieselben verwendet werden
export function normalizeBotId(id: string): BotId {
  const idMap: Record<string, BotId> = {
    'vol-tracker': 'volume-tracker',
    'volume-tracker': 'volume-tracker',
    'trend-surfer': 'trend-surfer',
    'momentum-bot': 'trend-surfer',
    'arb-finder': 'dip-hunter',
    'dip-hunter': 'dip-hunter',
  };
  
  return idMap[id.toLowerCase()] as BotId || id as BotId;
}

// Initialer Status: Alle Bots pausiert
const DEFAULT_STATUS: Record<BotId, BotStatus> = {
  'volume-tracker': 'paused',
  'trend-surfer': 'paused',
  'dip-hunter': 'paused',
};

// Standard-Risiko-Einstellungen für jeden Bot
const DEFAULT_RISK_SETTINGS: Record<BotId, number> = {
  'volume-tracker': 15,
  'trend-surfer': 15,
  'dip-hunter': 15,
};

// Lade den Status aus localStorage
export function getBotStatus(botId: string): BotStatus {
  try {
    if (typeof window === 'undefined') return 'paused'; // Serverside rendering
    
    const normalizedId = normalizeBotId(botId);
    const savedStatus = localStorage.getItem('simpleBot');
    
    if (savedStatus) {
      const parsed = JSON.parse(savedStatus) as Record<BotId, BotStatus>;
      return parsed[normalizedId] || 'paused';
    }
    
    return 'paused';
  } catch (error) {
    console.error('Fehler beim Laden des Bot-Status:', error);
    return 'paused';
  }
}

// Lade alle Bot-Status
export function getAllBotStatus(): Record<BotId, BotStatus> {
  try {
    if (typeof window === 'undefined') return DEFAULT_STATUS; // Serverside rendering
    
    const savedStatus = localStorage.getItem('simpleBot');
    
    if (savedStatus) {
      const parsed = JSON.parse(savedStatus) as Record<BotId, BotStatus>;
      
      // Stelle sicher, dass alle bekannten Bots einen Status haben
      const result = {...DEFAULT_STATUS};
      
      // Übernehme nur gültige Status für bekannte Bots
      BOT_IDS.forEach(id => {
        if (parsed[id] === 'active' || parsed[id] === 'paused') {
          result[id] = parsed[id];
        }
      });
      
      return result;
    }
    
    return DEFAULT_STATUS;
  } catch (error) {
    console.error('Fehler beim Laden der Bot-Status:', error);
    return DEFAULT_STATUS;
  }
}

// Setze den Status eines einzelnen Bots
export function setBotStatus(botId: string, status: BotStatus): void {
  try {
    if (typeof window === 'undefined') return; // Serverside rendering
    
    const normalizedId = normalizeBotId(botId);
    const currentStatus = getAllBotStatus();
    
    // Aktualisiere den Status des angegebenen Bots
    currentStatus[normalizedId] = status;
    
    // Speichere alles im localStorage
    localStorage.setItem('simpleBot', JSON.stringify(currentStatus));
    
    console.log(`Bot ${normalizedId} Status geändert: ${status}`);
  } catch (error) {
    console.error('Fehler beim Speichern des Bot-Status:', error);
  }
}

// Ist der Bot aktiv?
export function isBotActive(botId: string): boolean {
  return getBotStatus(botId) === 'active';
}

// Toggle den Status eines Bots zwischen active und paused
export function toggleBotStatus(botId: string): BotStatus {
  const currentStatus = getBotStatus(botId);
  const newStatus: BotStatus = currentStatus === 'active' ? 'paused' : 'active';
  setBotStatus(botId, newStatus);
  return newStatus;
}

// Risiko-Einstellungen speichern und abrufen

// Speichere das Risiko-Level für einen Bot
export function saveBotRisk(botId: string, riskLevel: number): void {
  try {
    if (typeof window === 'undefined') return; // Serverside rendering
    
    const normalizedId = normalizeBotId(botId);
    const currentRiskLevels = getBotRiskLevels();
    
    // Aktualisiere das Risiko des angegebenen Bots
    currentRiskLevels[normalizedId] = riskLevel;
    
    // Speichere alles im localStorage
    localStorage.setItem('botRiskLevels', JSON.stringify(currentRiskLevels));
    
    console.log(`Bot ${normalizedId} Risiko geändert: ${riskLevel}%`);
  } catch (error) {
    console.error('Fehler beim Speichern des Bot-Risikos:', error);
  }
}

// Lade das Risiko-Level für einen Bot
export function getBotRisk(botId: string): number {
  try {
    if (typeof window === 'undefined') return DEFAULT_RISK_SETTINGS[normalizeBotId(botId)]; // Serverside rendering
    
    const normalizedId = normalizeBotId(botId);
    const savedRiskLevels = localStorage.getItem('botRiskLevels');
    
    if (savedRiskLevels) {
      const parsed = JSON.parse(savedRiskLevels) as Record<BotId, number>;
      return parsed[normalizedId] || DEFAULT_RISK_SETTINGS[normalizedId];
    }
    
    return DEFAULT_RISK_SETTINGS[normalizedId];
  } catch (error) {
    console.error('Fehler beim Laden des Bot-Risikos:', error);
    return DEFAULT_RISK_SETTINGS[normalizeBotId(botId)];
  }
}

// Lade alle Risiko-Level für alle Bots
export function getBotRiskLevels(): Record<BotId, number> {
  try {
    if (typeof window === 'undefined') return DEFAULT_RISK_SETTINGS; // Serverside rendering
    
    const savedRiskLevels = localStorage.getItem('botRiskLevels');
    
    if (savedRiskLevels) {
      const parsed = JSON.parse(savedRiskLevels) as Record<BotId, number>;
      
      // Stelle sicher, dass alle bekannten Bots ein Risiko-Level haben
      const result = {...DEFAULT_RISK_SETTINGS};
      
      // Übernehme nur gültige Risiko-Level für bekannte Bots
      BOT_IDS.forEach(id => {
        if (parsed[id] && typeof parsed[id] === 'number' && parsed[id] >= 1 && parsed[id] <= 50) {
          result[id] = parsed[id];
        }
      });
      
      return result;
    }
    
    return DEFAULT_RISK_SETTINGS;
  } catch (error) {
    console.error('Fehler beim Laden der Bot-Risiko-Level:', error);
    return DEFAULT_RISK_SETTINGS;
  }
} 