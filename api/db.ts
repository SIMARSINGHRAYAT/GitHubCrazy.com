import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
const prismaOptions = databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(prismaOptions);
} else {
  // Avoid instantiating multiple PrismaClient instances in development
  const globalForPrisma = global as unknown as { prisma: PrismaClient };
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient(prismaOptions);
  }
  prisma = globalForPrisma.prisma;
}

export default prisma;
