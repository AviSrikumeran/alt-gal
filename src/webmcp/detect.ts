export type WebMCPSource = 'native' | 'polyfill' | 'none';

/** Why `source` is 'none'. The banner names the cause, so the cause has to survive detection. */
export type WebMCPUnavailableReason = 'insecure-context' | 'polyfill-failed';

const hasContext = (): boolean =>
  typeof document !== 'undefined' && !!document.modelContext && 'registerTool' in document.modelContext;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let reason: WebMCPUnavailableReason | null = null;

/** null unless the last resolution was 'none'. */
export const unavailableReason = (): WebMCPUnavailableReason | null => reason;

async function detect(): Promise<WebMCPSource> {
  reason = null;
  if (typeof window === 'undefined' || !window.isSecureContext) {
    reason = 'insecure-context';
    return 'none';
  }
  if (hasContext()) return 'native';
  for (let i = 0; i < 3; i++) {
    await sleep(500);
    if (hasContext()) return 'native';
  }
  try {
    const { initializeWebMCPPolyfill } = await import('@mcp-b/webmcp-polyfill');
    initializeWebMCPPolyfill();
  } catch {
    // A failed import used to reject this promise, which left the bridge waiting forever on a
    // `.then` that never ran. It is a resolution — an unhappy one with a name.
    reason = 'polyfill-failed';
    return 'none';
  }
  if (hasContext()) return 'polyfill';
  reason = 'polyfill-failed';
  return 'none';
}

/**
 * Resolves the model context source exactly once per page.
 * Order: native → wait briefly for an extension-injected context → polyfill.
 */
let resolved: Promise<WebMCPSource> | null = null;
export function ensureModelContext(): Promise<WebMCPSource> {
  if (resolved) return resolved;
  resolved = detect();
  return resolved;
}

/**
 * Drops the memo and detects again — the Retry button on the unavailable banner. Detection is
 * memoised so that a hundred callers cost one probe, but that also made 'none' permanent for the
 * life of the page, and the two causes of 'none' (an insecure origin, a polyfill that did not
 * load) are both things a human can fix and then ask us to look again.
 */
export function retryModelContext(): Promise<WebMCPSource> {
  resolved = null;
  return ensureModelContext();
}

export const getModelContext = (): WebMCP.ModelContext | null =>
  hasContext() ? (document.modelContext as WebMCP.ModelContext) : null;
