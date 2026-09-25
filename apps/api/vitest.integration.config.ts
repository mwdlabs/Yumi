import { defineConfig } from 'vitest/config';

// Tests d'intégration : nécessitent PostgreSQL (docker compose up -d).
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    // Une seule base de test partagée : on évite l'exécution parallèle des fichiers.
    fileParallelism: false,
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? 'postgresql://yumi:yumi@localhost:5432/yumi_test',
    },
  },
});
