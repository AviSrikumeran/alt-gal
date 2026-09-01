import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * D-074/D-198. Node environment: the studio's render test uses `react-dom/server`, so no DOM
 * dependency is needed (jsdom would be a new package, and D-073 forbids that without a ledger entry).
 */
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', 'src/webmcp/__tests__/**/*.e2e.ts'],
  },
});
