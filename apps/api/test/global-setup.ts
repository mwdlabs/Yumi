import { execSync } from 'node:child_process';

/**
 * Applique les migrations en attente sur la base de test (non destructif).
 * Chaque fichier de test vide ensuite les tables via `resetDatabase`.
 */
export default function setup(): void {
  const databaseUrl =
    process.env.TEST_DATABASE_URL ?? 'postgresql://yumi:yumi@localhost:5432/yumi_test';
  execSync('prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
