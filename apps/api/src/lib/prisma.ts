import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';

export type Database = PrismaClient;

/** Crée un client Prisma connecté à PostgreSQL via le driver `pg`. */
export function createPrisma(databaseUrl: string): Database {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}
