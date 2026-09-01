import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // tsconfig sets jsx: 'preserve' for the Next compiler (a frozen boundary file); the test runner
  // has no Next compiler, so it is told to transform JSX itself.
  oxc: { jsx: { runtime: 'automatic', importSource: 'react' } },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // jsdom everywhere: the token editors mount with Testing Library and the stores
    // persist through localStorage (D-068), which the pure-node environment lacks.
    environment: 'jsdom',
    // localStorage needs a real origin; without a url jsdom hands back a storage object with no
    // setItem and every persisted store (D-068) throws on its first write.
    environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
