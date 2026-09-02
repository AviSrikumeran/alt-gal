import { create } from 'zustand';
import type { Phase, NextPhaseInfo } from '@/types/phase';
import { PHASE_DEFINITIONS } from '@/types/phase';
import type { TokenStore } from '@/stores/tokenStore';
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
  nextPhase: () => nextPhaseFrom(get().currentPhase, useTokenStore.getState(), useComponentStore.getState().count()),
}));

/**
 * The body of `nextPhase()`, over values a component can subscribe to (D-246).
 *
 * `.missing` shrinks as tokens accumulate *within* phase 1, so a caller that only re-reads when
 * the phase changes shows a stale hint for the whole climb. Callers that need it live pass
 * subscribed state; `nextPhase()` passes `getState()` and is unchanged in behaviour.
 */
export function nextPhaseFrom(phase: Phase, tokens: TokenStore, componentCount: number): NextPhaseInfo | null {
  if (phase === 4) return null;
  const def = PHASE_DEFINITIONS[phase]!;
  const missing: string[] = [];
  if (phase === 0) missing.push('1 token');
  if (phase === 1) {
    const need = TOKENS_REQUIRED_FOR_PHASE_2 - tokens.getDefinedTokenCount();
    if (need > 0) missing.push(`${need} more token${need === 1 ? '' : 's'}`);
    missing.push(...tokens.getMissingForPhase2());
  }
  if (phase === 2) {
    const need = COMPONENTS_REQUIRED_FOR_PHASE_3 - componentCount;
    if (need > 0) missing.push(`${need} more component${need === 1 ? '' : 's'}`);
  }
  if (phase === 3) missing.push('1 rendered page');
  return { phase: (phase + 1) as Phase, requirement: def.requirement, missing };
}

// D-049: synchronous recalculation on every relevant store change, installed once at module load.
if (typeof window !== 'undefined') {
  const recalc = () => usePhaseStore.getState().recalculatePhase();
  useTokenStore.subscribe(recalc);
  useComponentStore.subscribe(recalc);
  useLayoutStore.subscribe(recalc);
  recalc(); // after persisted state hydrates synchronously on first import
}
