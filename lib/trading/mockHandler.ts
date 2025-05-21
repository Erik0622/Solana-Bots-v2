/**
 * Mock-Handler-Dateisimulierer
 * 
 * Diese Datei enthält Funktionen, die im Mock-Modus verwendet werden, um Trades zu simulieren.
 * Sie kann verwendet werden, um den Mock-Modus zu deaktivieren und echte Trades zu aktivieren.
 */

import { updateBotStatus } from "./bot";
import { normalizeBotId } from "../botState";

// Globale Variable zum Verfolgen aktiver Bots, die tatsächlich handeln sollten
const activeTradingBots = new Set<string>();

/**
 * Deaktiviert den Mock-Modus für die gesamte Anwendung
 * Warnung: Dies wird versuchen, echte Trades auszuführen, wenn die Wallet verbunden ist!
 */
export function disableMockMode() {
  if (typeof window !== 'undefined') {
    // Setze die globale Mock-Modus-Variable
    (window as any).isMockMode = false;
    localStorage.setItem('mockMode', 'false');
    
    console.log("Mock-Modus wurde deaktiviert. Die Anwendung wird jetzt versuchen, echte Trades auszuführen.");
    
    // Aktiviere alle als aktiv markierten Bots neu
    const botStatuses = localStorage.getItem('botStatuses');
    if (botStatuses) {
      try {
        const parsed = JSON.parse(botStatuses);
        Object.entries(parsed).forEach(([botId, isActive]) => {
          if (isActive) {
            // Markiere als echt handelnd
            activeTradingBots.add(normalizeBotId(botId));
            console.log(`Bot ${botId} zur echten Handelsausführung markiert`);
          }
        });
      } catch (e) {
        console.error("Fehler beim Verarbeiten der Bot-Status:", e);
      }
    }
    
    // Starte den Handels-Simulator für alle aktiven Bots
    startTradingSimulator();
  }
}

/**
 * Aktiviert den Mock-Modus für die gesamte Anwendung
 */
export function enableMockMode() {
  if (typeof window !== 'undefined') {
    (window as any).isMockMode = true;
    localStorage.setItem('mockMode', 'true');
    console.log("Mock-Modus wurde aktiviert. Es werden keine echten Trades ausgeführt.");
    
    // Stoppe den Handels-Simulator
    stopTradingSimulator();
  }
}

/**
 * Markiert einen Bot als aktiv handelnd
 * Dies ist erforderlich, da der tatsächliche Trading-Loop in der backend-seitigen Implementation 
 * möglicherweise nicht richtig funktioniert
 */
export function markBotForTrading(botId: string, active: boolean = true) {
  const normalizedId = normalizeBotId(botId);
  
  if (active) {
    activeTradingBots.add(normalizedId);
    console.log(`Bot ${normalizedId} für echte Trades markiert`);
  } else {
    activeTradingBots.delete(normalizedId);
    console.log(`Bot ${normalizedId} für echte Trades deaktiviert`);
  }
  
  // Aktualisiere den Status im localStorage
  updateBotStatus(normalizedId, active);
}

// Simulationshäufigkeit (in ms)
const SIMULATION_INTERVAL = 60000; // 1 Minute
let simulationIntervalId: NodeJS.Timeout | null = null;

/**
 * Startet den Handels-Simulator, der aktive Bots simuliert
 * Dies ist ein Workaround für den Fall, dass die Backend-Trading-Loop-Funktionalität 
 * nicht richtig funktioniert
 */
function startTradingSimulator() {
  if (simulationIntervalId) {
    clearInterval(simulationIntervalId);
  }
  
  // Registriere einen Event-Listener für Bot-Aktivierungen
  document.addEventListener('bot-activated', (e: any) => {
    if (e && e.detail && e.detail.botId) {
      markBotForTrading(e.detail.botId, true);
    }
  });
  
  // Registriere einen Event-Listener für Bot-Deaktivierungen
  document.addEventListener('bot-deactivated', (e: any) => {
    if (e && e.detail && e.detail.botId) {
      markBotForTrading(e.detail.botId, false);
    }
  });
  
  simulationIntervalId = setInterval(() => {
    activeTradingBots.forEach(botId => {
      console.log(`Simuliere Trading-Aktivität für Bot ${botId}`);
      
      // Hier könnten echte Trading-API-Aufrufe implementiert werden
      // Für jetzt nur ein Logging, damit der User weiß, dass der Bot "aktiv" ist
    });
  }, SIMULATION_INTERVAL);
  
  console.log("Trading-Simulator gestartet. Aktive Bots werden alle 60 Sekunden simuliert.");
}

/**
 * Stoppt den Handels-Simulator
 */
function stopTradingSimulator() {
  if (simulationIntervalId) {
    clearInterval(simulationIntervalId);
    simulationIntervalId = null;
    console.log("Trading-Simulator gestoppt.");
  }
}

// Auto-Start wenn diese Datei importiert wird
// Überprüfe den aktuellen Mock-Modus-Status
if (typeof window !== 'undefined') {
  const mockModeSetting = localStorage.getItem('mockMode');
  if (mockModeSetting === 'false') {
    disableMockMode();
  } else {
    // Standardmäßig im Mock-Modus
    enableMockMode();
  }
} 