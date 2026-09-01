import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Vitest needs the `@/` alias from tsconfig (D-036) resolved at runtime. Nothing else is
 * configured: unit tests run in the default node environment, and the Playwright e2e file
 * (`*.e2e.ts`) is outside vitest's `**\/*.{test,spec}.*` include by name.
 */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
