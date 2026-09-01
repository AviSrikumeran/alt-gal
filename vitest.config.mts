import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// D-074: vitest for utils/** and engine/**; tests live in src/**/__tests__/.
// No jsdom in the seed dependency list (D-073), so component tests render with
// react-dom/server rather than a DOM.
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/__tests__/**/*.test.{ts,tsx}'] },
});
