import { defineConfig } from 'vitest/config';

// Tests unitaires : aucun service externe requis.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
