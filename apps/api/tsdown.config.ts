import { defineConfig } from 'tsdown';

// Bundle de production : @yumi/shared (sources TS) est intégré au bundle.
export default defineConfig({
  entry: ['src/server.ts'],
  platform: 'node',
  target: 'node24',
  format: 'esm',
  outDir: 'dist',
  deps: { alwaysBundle: ['@yumi/shared'] },
});
