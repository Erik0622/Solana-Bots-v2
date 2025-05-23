import { PrismaClient } from '@prisma/client';

// Globale Typdeklaration für PrismaClient
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  var isMockMode: boolean;
}

// Konfiguriere die Prisma URL für die Datenbankverbindung mit Supabase
// Verwende eine zugänglichere Datenbank-URL
const databaseUrl = process.env.DATABASE_URL || 
  "postgresql://postgres.ssxbtzoygnvpzuogpwbk:S27BqCMHOszfAVtU@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";

// Alternative/lokale Datenbank-URL als Fallback
const fallbackUrl = "postgresql://postgres:postgres@localhost:5432/postgres";

// Flag für Mock-Mode - Nur aktivieren, wenn explizit gesetzt oder in Fallback
export const isMockMode = process.env.MOCK_MODE === 'true' || false;

// PrismaClient ist an Ihre Datenbank angepasst
let prisma: PrismaClient;

try {
  if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      // Längere Timeouts für Productionsumgebung
      log: ['error', 'warn'],
      errorFormat: 'minimal',
    });
    
    // In der Produktion Mock-Mode nur aktivieren, wenn explizit gesetzt
    global.isMockMode = process.env.MOCK_MODE === 'true' || false;
    console.log("Prisma Client in Produktion initialisiert. Mock-Mode:", global.isMockMode);
  } else {
    // In der Entwicklung um wiederholte Instanziierung des PrismaClient zu vermeiden
    if (!global.prisma) {
      global.prisma = new PrismaClient({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
        log: ['query', 'error', 'warn'],
      });
      
      // Mock-Mode setzen
      global.isMockMode = isMockMode;
      console.log("Prisma Client initialisiert. Mock-Mode:", isMockMode);
    }
    prisma = global.prisma;
  }
} catch (e) {
  console.error("Fehler bei der Initialisierung des Prisma Clients:", e);
  
  if (process.env.NODE_ENV === 'production') {
    console.error("Datenbankfehler in Produktionsumgebung - keine Fallback auf Mock-Modus, um echtes Trading zu schützen");
    throw new Error("Keine Datenbankverbindung in der Produktionsumgebung möglich");
  } else {
    console.warn("Verwende Mock-Daten-Modus, da die Datenbankverbindung fehlgeschlagen ist");
    
    // Aktiviere Mock-Mode bei Verbindungsproblemen (nur in Entwicklung)
    global.isMockMode = true;
    // Erstelle trotzdem einen PrismaClient, damit die Anwendung nicht abstürzt
    prisma = new PrismaClient({
      datasources: {
        db: {
          // Versuche Fallback-URL zu verwenden
          url: fallbackUrl,
        },
      },
    });
  }
}

// Exportiere auch die Information, ob wir im Mock-Modus sind
export const getMockModeStatus = () => global.isMockMode || isMockMode;

export default prisma; 