import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * D-074: vitest for `utils/**` and `engine/**`, plus the component tests in Turn 3 §3.7.
 * Tests live in `src/**\/__tests__/`. Playwright (`pnpm e2e`) owns `webmcp/**` and is excluded here.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    css: false,
    restoreMocks: true,
  },
});
