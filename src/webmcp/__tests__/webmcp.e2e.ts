/**
 * Stream 3 smoke test (§11.2, D-198): open the studio with a fake WebMCP host installed
 * before load, set five tokens through the page's own registered `set_token` tool, and
 * watch `getTools()` grow from 4 to 14 as the studio crosses phase 0 → 1 → 2.
 *
 * This is the demo's central claim, tested: the tool surface is the state.
 *
 * Runs against the real registration wrapper (`useWebMCPRegistration.ts`), so it needs
 * two things this branch does not carry:
 *   - Stream 1's `tokenStore.setToken` implementation (the seed stub returns false);
 *   - Stream 5's `app/layout.tsx` mounting `<WebMCPBridge />` (D-017).
 * Until both land it fails at the first assertion, by design — `pnpm test` is the gate on
 * this branch and `pnpm e2e` runs on main (D-198).
 */
import { expect, test } from '@playwright/test';

/** The fixture from `fixtures/fakeModelContext.ts`, inlined for `addInitScript`. */
const FAKE_HOST = `
window.__altgalTools = new Map();
const target = new EventTarget();
const context = {
  addEventListener: target.addEventListener.bind(target),
  removeEventListener: target.removeEventListener.bind(target),
  dispatchEvent: target.dispatchEvent.bind(target),
  ontoolchange: null,
  registerTool(tool, options) {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    window.__altgalTools.set(tool.name, tool);
    options?.signal?.addEventListener('abort', () => {
      if (window.__altgalTools.get(tool.name) === tool) {
        window.__altgalTools.delete(tool.name);
        target.dispatchEvent(new Event('toolchange'));
      }
    }, { once: true });
    target.dispatchEvent(new Event('toolchange'));
    return Promise.resolve();
  },
  getTools() {
    return Promise.resolve([...window.__altgalTools.values()].map((t) => ({
      name: t.name, title: t.title, description: t.description,
      inputSchema: t.inputSchema, annotations: t.annotations, origin: location.origin,
    })));
  },
  executeTool(tool, input) {
    const registered = window.__altgalTools.get(tool.name);
    if (!registered) throw new DOMException('not a RegisteredTool', 'InvalidStateError');
    const parsed = typeof input === 'string' ? JSON.parse(input) : input;
    return Promise.resolve(registered.execute(parsed, { signal: new AbortController().signal }));
  },
};
Object.defineProperty(document, 'modelContext', { configurable: true, value: context });
`;

const toolCount = () => window.__altgalTools?.size ?? 0;

const callTool = ([name, input]: [string, Record<string, unknown>]): Promise<string> => {
  const tool = window.__altgalTools.get(name);
  if (!tool) throw new Error(`${name} is not registered`);
  // D-005: every execute returns JSON.stringify(ToolResult).
  return Promise.resolve(tool.execute(input, { signal: new AbortController().signal })) as unknown as Promise<string>;
};

test('the tool surface grows with the state, 4 → 14', async ({ page }) => {
  await page.addInitScript(FAKE_HOST);
  await page.goto('/');

  // Phase 0: get_current_state, set_token, get_tokens, suggest_palette (D-028).
  await expect.poll(() => page.evaluate(toolCount)).toBe(4);

  const first = JSON.parse(
    await page.evaluate(callTool, ['set_token', { category: 'color', key: 'primary', value: 'hsl(250, 84%, 60%)' }] as [
      string,
      Record<string, unknown>,
    ]),
  );
  expect(first.ok).toBe(true);
  expect(first.phase).toBe(1);
  expect(first.newTools).toContain('add_rule');

  // Phase 1 adds remove_token, add_rule, remove_rule, list_rules; registration is deferred
  // one macrotask (D-004), so poll rather than assert immediately.
  await expect.poll(() => page.evaluate(toolCount)).toBe(8);

  for (const [key, value] of [
    ['background', 'hsl(250, 10%, 98%)'],
    ['text-primary', 'hsl(250, 15%, 10%)'],
    ['surface', 'hsl(250, 10%, 100%)'],
    ['border', 'hsl(250, 12%, 88%)'],
  ] as const) {
    await page.evaluate(callTool, ['set_token', { category: 'color', key, value }] as [
      string,
      Record<string, unknown>,
    ]);
  }

  // Five tokens including primary, background and text-primary: phase 2 (D-048).
  await expect.poll(() => page.evaluate(toolCount)).toBe(14);
  const state = JSON.parse(
    await page.evaluate(callTool, ['get_current_state', {}] as [string, Record<string, unknown>]),
  );
  expect(state.data.phase).toBe(2);
  expect(state.data.availableTools).toContain('generate_component');
});

declare global {
  interface Window {
    __altgalTools: Map<string, WebMCP.ModelContextTool>;
  }
}
