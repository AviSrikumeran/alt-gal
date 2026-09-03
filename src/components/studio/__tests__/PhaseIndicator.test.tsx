/**
 * D-246. `.missing` shrinks as tokens accumulate within phase 1, so the stepper's "Missing: …"
 * tooltip has to follow the tokens, not just the phase.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import PhaseIndicator from '@/components/studio/PhaseIndicator';
import { useComponentStore } from '@/stores/componentStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useTokenStore } from '@/stores/tokenStore';
import { usePhaseStore } from '@/stores/phaseStore';

// The clearance node splits into a level chip and a name (D-263); the tooltip stays on the pill
// that wraps both, so read it off the nearest ancestor carrying one.
const tip = (): string => screen.getByText('POWERED FLIGHT').closest('[title]')?.getAttribute('title') ?? '';

beforeEach(() => {
  useTokenStore.getState().reset();
  useComponentStore.getState().reset();
  useLayoutStore.getState().reset();
  usePhaseStore.getState().recalculatePhase();
});

describe('PhaseIndicator', () => {
  it('updates the Missing hint as tokens accumulate inside phase 1', () => {
    act(() => {
      useTokenStore.getState().setToken('color.primary', 'hsl(250, 84%, 60%)');
    });
    render(<PhaseIndicator />);
    expect(usePhaseStore.getState().currentPhase).toBe(1);
    expect(tip()).toContain('4 more tokens');
    expect(tip()).toContain('color.background');

    act(() => {
      useTokenStore.getState().setToken('color.background', 'hsl(0, 0%, 98%)');
    });
    // Same phase, fewer things missing — this is what was stale.
    expect(usePhaseStore.getState().currentPhase).toBe(1);
    expect(tip()).toContain('3 more tokens');
    expect(tip()).not.toContain('color.background');
  });
});
