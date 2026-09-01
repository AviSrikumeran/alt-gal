import { defineConfig } from '@playwright/test';

/**
 * D-198: the webmcp smoke runs on main, against a real Next dev server with a fake WebMCP
 * host injected before load. Vitest owns `*.test.ts`; Playwright owns `*.e2e.ts`.
 */
export default defineConfig({
  testDir: './src',
  testMatch: '**/*.e2e.ts',
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
