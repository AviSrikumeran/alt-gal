import { create } from 'zustand';
import type { Phase, NextPhaseInfo } from '@/types/phase';
import { PHASE_DEFINITIONS } from '@/types/phase';
import { useTokenStore } from '@/stores/tokenStore';
import { useComponentStore } from '@/stores/componentStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { TOKENS_REQUIRED_FOR_PHASE_2, COMPONENTS_REQUIRED_FOR_PHASE_3 } from '@/utils/defaults';

/** Owns the current phase. Derived, never set directly. The only store that imports other stores. */
export interface PhaseState {
  currentPhase: Phase;
}
export interface PhaseActions {
  recalculatePhase(): void; // installed as a subscriber below; never call from tools or UI
  nextPhase(): NextPhaseInfo | null;
}
export type PhaseStore = PhaseState & PhaseActions;

export function computePhase(): Phase {
  const tokens = useTokenStore.getState();
  const components = useComponentStore.getState().count();
  const pages = useLayoutStore.getState().renderedPages.length;
  if (pages >= 1) return 4;
  if (components >= COMPONENTS_REQUIRED_FOR_PHASE_3) return 3;
  if (tokens.getDefinedTokenCount() >= TOKENS_REQUIRED_FOR_PHASE_2 && tokens.getMissingForPhase2().length === 0)
    return 2;
  if (tokens.getDefinedTokenCount() >= 1) return 1;
  return 0;
}

export const usePhaseStore = create<PhaseStore>()((set, get) => ({
  currentPhase: 0,
  recalculatePhase: () => {
    const next = computePhase();
    if (next !== get().currentPhase) set({ currentPhase: next });
  },
  nextPhase: () => {
    const p = get().currentPhase;
    if (p === 4) return null;
    const def = PHASE_DEFINITIONS[p]!;
    const missing: string[] = [];
    const t = useTokenStore.getState();
    if (p === 0) missing.push('1 token');
    if (p === 1) {
      const need = TOKENS_REQUIRED_FOR_PHASE_2 - t.getDefinedTokenCount();
      if (need > 0) missing.push(`${need} more token${need === 1 ? '' : 's'}`);
      missing.push(...t.getMissingForPhase2());
    }
    if (p === 2) {
      const need = COMPONENTS_REQUIRED_FOR_PHASE_3 - useComponentStore.getState().count();
      if (need > 0) missing.push(`${need} more component${need === 1 ? '' : 's'}`);
    }
    if (p === 3) missing.push('1 rendered page');
    return { phase: (p + 1) as Phase, requirement: def.requirement, missing };
  },
}));

// D-049: synchronous recalculation on every relevant store change, installed once at module load.
if (typeof window !== 'undefined') {
  const recalc = () => usePhaseStore.getState().recalculatePhase();
  useTokenStore.subscribe(recalc);
  useComponentStore.subscribe(recalc);
  useLayoutStore.subscribe(recalc);
  recalc(); // after persisted state hydrates synchronously on first import
}
