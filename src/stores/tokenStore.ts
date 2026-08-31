import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SemanticColorRole, TokenMap, TokenPath, TokenState } from '@/types/tokens';
import { DEFAULT_TOKENS } from '@/utils/defaults';

/** Owns every design token, the derived dark set, locks, and the "touched" list that drives phase counting. */
export interface TokenActions {
  /** Normalizes colors via parseColor/toHSLString; numbers for px/ms groups; rejects invalid with false. */
  setToken(path: TokenPath, value: string): boolean;
  /** Colors → null; other groups → default value and removed from touched. */
  removeToken(path: TokenPath): void;
  setMany(values: Partial<Record<TokenPath, string>>): void;
  setLocked(path: TokenPath, locked: boolean): void;
  setDark(dark: Record<SemanticColorRole, string | null> | null): void;
  reset(): void;
  // reads
  getToken(path: TokenPath): string | null;
  getTokenMap(): TokenMap;
  getDefinedTokenCount(): number; // D-047
  getMissingForPhase2(): string[]; // D-048; [] when satisfied
  isLocked(path: TokenPath): boolean;
}
export type TokenStore = TokenState & TokenActions;

export const useTokenStore = create<TokenStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_TOKENS,
      setToken: () => {
        /* STREAM 1: implement */ return false;
      },
      removeToken: () => {
        /* STREAM 1: implement */
      },
      setMany: () => {
        /* STREAM 1: implement */
      },
      setLocked: (path, locked) =>
        set((s) => ({ locked: locked ? [...new Set([...s.locked, path])] : s.locked.filter((p) => p !== path) })),
      setDark: (dark) => set({ dark }),
      reset: () => set({ ...DEFAULT_TOKENS }),
      getToken: () => /* STREAM 1: implement */ null,
      getTokenMap: () => /* STREAM 1: implement */ ({}) as TokenMap,
      getDefinedTokenCount: () => {
        const s = get();
        return Object.values(s.colors).filter(Boolean).length + s.touched.length;
      },
      getMissingForPhase2: () => /* STREAM 1: implement */ [],
      isLocked: (path) => get().locked.includes(path),
    }),
    {
      name: 'altgal.tokens.v1',
      version: 1,
      partialize: (s) => ({
        colors: s.colors,
        dark: s.dark,
        typography: s.typography,
        spacing: s.spacing,
        radius: s.radius,
        elevation: s.elevation,
        animation: s.animation,
        touched: s.touched,
        locked: s.locked,
      }),
    },
  ),
);
