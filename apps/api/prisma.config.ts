// Configuration de la CLI Prisma (migrations, génération du client).
import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Prisma 7 ne charge plus .env automatiquement.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Vide lors d'un simple `prisma generate` (CI, postinstall) : la connexion n'est pas requise.
    url: process.env.DATABASE_URL ?? '',
  },
});
