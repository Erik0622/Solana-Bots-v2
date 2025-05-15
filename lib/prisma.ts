import { PrismaClient } from '@prisma/client';

// Globale Typdeklaration für PrismaClient
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// PrismaClient ist an Ihre Datenbank angepasst: Wenn Sie Ihre Datenbank-Schema in schema.prisma aktualisieren,
// müssen Sie auch das @prisma/client-Paket aktualisieren
// Siehe: https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/instantiate-prisma-client

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // In der Entwicklung um wiederholte Instanziierung des PrismaClient zu vermeiden
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default prisma; 