import { create } from 'zustand';
import type { WebMCPSource, WebMCPUnavailableReason } from '@/webmcp/detect';

interface WebMCPStatusState {
  source: WebMCPSource;
  /**
   * D-244: false until `ensureModelContext()` has settled once. `source` starts at 'none', so
   * without this the first ~1.5s of every page load is indistinguishable from a host that will
   * never arrive — and the studio has to say two different things about those two situations.
   */
  resolved: boolean;
  /** Why `source` is 'none'; null otherwise. */
  reason: WebMCPUnavailableReason | null;
  toolCount: number;
  toolNames: string[];
  degraded: boolean;
  failures: { tool: string; error: string }[];
  lastChangeAt: number | null;
}
interface WebMCPStatusActions {
  setSource(source: WebMCPSource, reason?: WebMCPUnavailableReason | null): void;
  /** Back to "detecting" for a retry. */
  beginDetection(): void;
  setTools(names: string[]): void;
  markDegraded(tool: string, error: unknown): void;
}
export const useWebMCPStatusStore = create<WebMCPStatusState & WebMCPStatusActions>((set) => ({
  source: 'none',
  resolved: false,
  reason: null,
  toolCount: 0,
  toolNames: [],
  degraded: false,
  failures: [],
  lastChangeAt: null,
  setSource: (source, reason = null) => set({ source, reason: source === 'none' ? reason : null, resolved: true }),
  beginDetection: () => set({ resolved: false, reason: null }),
  setTools: (names) => set({ toolNames: names, toolCount: names.length, lastChangeAt: Date.now() }),
  markDegraded: (tool, error) =>
    set((s) => ({
      degraded: true,
      failures: [...s.failures, { tool, error: error instanceof Error ? error.message : String(error) }],
    })),
}));
