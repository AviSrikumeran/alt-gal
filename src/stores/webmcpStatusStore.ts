import { create } from 'zustand';
import type { WebMCPSource } from '@/webmcp/detect';

interface WebMCPStatusState {
  source: WebMCPSource;
  toolCount: number;
  toolNames: string[];
  degraded: boolean;
  failures: { tool: string; error: string }[];
  lastChangeAt: number | null;
}
interface WebMCPStatusActions {
  setSource(source: WebMCPSource): void;
  setTools(names: string[]): void;
  markDegraded(tool: string, error: unknown): void;
}
export const useWebMCPStatusStore = create<WebMCPStatusState & WebMCPStatusActions>((set) => ({
  source: 'none',
  toolCount: 0,
  toolNames: [],
  degraded: false,
  failures: [],
  lastChangeAt: null,
  setSource: (source) => set({ source }),
  setTools: (names) => set({ toolNames: names, toolCount: names.length, lastChangeAt: Date.now() }),
  markDegraded: (tool, error) =>
    set((s) => ({
      degraded: true,
      failures: [...s.failures, { tool, error: error instanceof Error ? error.message : String(error) }],
    })),
}));
