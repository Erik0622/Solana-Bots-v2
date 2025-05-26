export interface BotStatus {
  id: string;
  isActive: boolean;
  isConnected: boolean;
  balance: number;
  totalProfit: number;
  totalTrades: number;
  winRate: number;
  lastUpdated: Date;
}

export interface BotPerformance {
  id: string;
  period: '24h' | '7d' | '30d' | 'all';
  profit: number;
  trades: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

// Bot ID Type für bessere Typisierung
export type BotId = string;

// Bot-Risiko-Management
interface BotRiskData {
  [botId: string]: number;
}

let botRiskData: BotRiskData = {};

class BotStateManager {
  private botStates: Map<string, BotStatus> = new Map();
  private subscribers: Array<(states: Map<string, BotStatus>) => void> = [];

  constructor() {
    this.initializeDefaultStates();
  }

  private initializeDefaultStates() {
    const defaultBotIds = ['volume-tracker', 'trend-surfer', 'arbitrage-finder'];
    
    defaultBotIds.forEach(id => {
      this.botStates.set(id, {
        id,
        isActive: false,
        isConnected: false,
        balance: 0,
        totalProfit: 0,
        totalTrades: 0,
        winRate: 0,
        lastUpdated: new Date(),
      });
    });
  }

  getBotStatus(id: string): BotStatus | undefined {
    return this.botStates.get(id);
  }

  getAllBotStates(): Map<string, BotStatus> {
    return new Map(this.botStates);
  }

  updateBotStatus(id: string, status: Partial<BotStatus>) {
    const currentStatus = this.botStates.get(id);
    if (currentStatus) {
      const updatedStatus = {
        ...currentStatus,
        ...status,
        lastUpdated: new Date(),
      };
      this.botStates.set(id, updatedStatus);
      this.notifySubscribers();
    }
  }

  subscribe(callback: (states: Map<string, BotStatus>) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.getAllBotStates()));
  }

  activateBot(id: string) {
    this.updateBotStatus(id, { isActive: true, isConnected: true });
  }

  deactivateBot(id: string) {
    this.updateBotStatus(id, { isActive: false, isConnected: false });
  }
}

export const botStateManager = new BotStateManager();

/**
 * Normalisiert Bot-IDs für konsistente Verwendung
 */
export function normalizeBotId(botId: string): string {
  return botId.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

/**
 * Utility-Funktionen für Bot-Management
 */
export function getBotStatus(botId: string): BotStatus | undefined {
  return botStateManager.getBotStatus(botId);
}

export function setBotStatus(botId: string, status: Partial<BotStatus>) {
  botStateManager.updateBotStatus(botId, status);
}

export function getAllBotStatus(): Map<string, BotStatus> {
  return botStateManager.getAllBotStates();
}

export function toggleBotStatus(botId: string) {
  const currentStatus = getBotStatus(botId);
  if (currentStatus) {
    if (currentStatus.isActive) {
      botStateManager.deactivateBot(botId);
    } else {
      botStateManager.activateBot(botId);
    }
  }
}

export function isBotActive(botId: string): boolean {
  const status = getBotStatus(botId);
  return status?.isActive || false;
}

/**
 * Risiko-Management-Funktionen
 */
export function saveBotRisk(botId: string, riskLevel: number) {
  botRiskData[botId] = riskLevel;
  localStorage.setItem('botRiskData', JSON.stringify(botRiskData));
}

export function getBotRisk(botId: string): number {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('botRiskData');
    if (saved) {
      botRiskData = JSON.parse(saved);
    }
  }
  return botRiskData[botId] || 10; // Default 10% risk
}

export function getBotRiskLevels(): { [botId: string]: number } {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('botRiskData');
    if (saved) {
      botRiskData = JSON.parse(saved);
    }
  }
  return botRiskData;
}

export default botStateManager; 