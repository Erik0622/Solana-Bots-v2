import { PrismaClient } from '@prisma/client';

// Globale Typdeklaration für PrismaClient
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Konfiguriere die Prisma URL für die Datenbankverbindung mit Supabase
const databaseUrl = process.env.DATABASE_URL || 
  "postgresql://postgres.ssxbtzoygnvpzuogpwbk:[Pieseczek0616!]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";

// PrismaClient ist an Ihre Datenbank angepasst
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
} else {
  // In der Entwicklung um wiederholte Instanziierung des PrismaClient zu vermeiden
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
  }
  prisma = global.prisma;
}

export default prisma; 