export type WebMCPSource = 'native' | 'polyfill' | 'none';

const hasContext = (): boolean =>
  typeof document !== 'undefined' && !!document.modelContext && 'registerTool' in document.modelContext;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Resolves the model context source exactly once per page.
 * Order: native → wait briefly for an extension-injected context → polyfill.
 */
let resolved: Promise<WebMCPSource> | null = null;
export function ensureModelContext(): Promise<WebMCPSource> {
  if (resolved) return resolved;
  resolved = (async () => {
    if (typeof window === 'undefined' || !window.isSecureContext) return 'none';
    if (hasContext()) return 'native';
    for (let i = 0; i < 3; i++) {
      await sleep(500);
      if (hasContext()) return 'native';
    }
    const { initializeWebMCPPolyfill } = await import('@mcp-b/webmcp-polyfill');
    initializeWebMCPPolyfill();
    return hasContext() ? 'polyfill' : 'none';
  })();
  return resolved;
}

export const getModelContext = (): WebMCP.ModelContext | null =>
  hasContext() ? (document.modelContext as WebMCP.ModelContext) : null;
