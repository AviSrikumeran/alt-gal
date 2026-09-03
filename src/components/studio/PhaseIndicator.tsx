'use client';
import { PHASE_DEFINITIONS } from '@/types/phase';
import { useComponentStore } from '@/stores/componentStore';
import { nextPhaseFrom, usePhaseStore } from '@/stores/phaseStore';
import { useTokenStore } from '@/stores/tokenStore';
import { useWebMCPStatusStore } from '@/stores/webmcpStatusStore';
import { ALL_TOOL_NAMES } from '@/webmcp/toolPhaseMap';
import StationLockup from './StationMark';
import { clearance, PHASE_STEPS, S } from './strings';

/**
 * The station masthead (ALT_GAL_REBRAND.md §E, D-263). Mission patch and wordmark on the left, the
 * clearance ladder across the middle, station status on the right. The systems count is still read
 * back from `getTools()` (D-016) and never tracked by hand — the number on the console is the
 * browser's answer, not ours; the rebrand only changes how it is spoken.
 */
export default function PhaseIndicator() {
  const phase = usePhaseStore((s) => s.currentPhase);
  // D-246: `.missing` shrinks as tokens accumulate *within* phase 1, so this can't be a read of
  // `nextPhase()` off getState — the "Missing: …" hint stayed stale for the whole climb. It is
  // still not a selector either, because nextPhase() builds a fresh object that
  // useSyncExternalStore would see as a changed snapshot every render. Instead: subscribe to the
  // values it reads, and compute from those.
  const tokens = useTokenStore();
  const componentCount = useComponentStore((s) => s.components.length);
  const next = nextPhaseFrom(phase, tokens, componentCount);
  const toolCount = useWebMCPStatusStore((s) => s.toolCount);
  // D-247: until detection settles the source is not yet 'none' in any meaningful sense.
  const source = useWebMCPStatusStore((s) => (s.resolved ? s.source : 'detecting'));

  return (
    <header className="alt-phasebar" role="banner">
      <div className="alt-phasebar__brand">
        <StationLockup />
      </div>

      <ol className="alt-stepper" aria-label="Phase">
        {PHASE_STEPS.map((name, i) => {
          const state = i < phase ? 'done' : i === phase ? 'current' : 'future';
          const def = PHASE_DEFINITIONS[i];
          const tip =
            state === 'future' && next && i === next.phase
              ? `${def?.requirement ?? ''}${next.missing.length ? ` Missing: ${next.missing.join(', ')}.` : ''}`.trim()
              : def?.requirement || undefined;
          return (
            <li
              key={name}
              className="alt-step"
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span className="alt-step__pill" title={tip}>
                <span className="alt-step__level" aria-hidden="true">
                  {state === 'done' ? (
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <path d="M1.5 5.2l2.2 2.2L8.5 2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  ) : (
                    clearance(i)
                  )}
                </span>
                <span className="alt-step__name">{name}</span>
              </span>
              {i < PHASE_STEPS.length - 1 && (
                <span className="alt-step__rule" data-filled={i < phase} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>

      <div className="alt-phasebar__status">
        <span aria-live="polite">{S.toolCount(toolCount, ALL_TOOL_NAMES.length)}</span>
        <span className="alt-source" data-source={source}>
          <span className="alt-source__dot" aria-hidden="true" />
          {S.source[source]}
        </span>
      </div>
    </header>
  );
}
