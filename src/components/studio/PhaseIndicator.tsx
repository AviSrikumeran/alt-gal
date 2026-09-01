'use client';
import { PHASE_DEFINITIONS } from '@/types/phase';
import { usePhaseStore } from '@/stores/phaseStore';
import { useWebMCPStatusStore } from '@/stores/webmcpStatusStore';
import { ALL_TOOL_NAMES } from '@/webmcp/toolPhaseMap';
import { PHASE_STEPS, S, WORDMARK } from './strings';

/**
 * D-153. Wordmark, the five-step stepper, and the live tool count read back from `getTools()`
 * (D-016) — the count is never tracked by hand, which is the whole point: the number the human
 * sees is the browser's answer, not ours.
 */
export default function PhaseIndicator() {
  const phase = usePhaseStore((s) => s.currentPhase);
  // Read, don't subscribe: nextPhase() builds a fresh object, which useSyncExternalStore would
  // read as a changed snapshot on every render. It only ever changes when the phase does.
  const next = usePhaseStore.getState().nextPhase();
  const toolCount = useWebMCPStatusStore((s) => s.toolCount);
  const source = useWebMCPStatusStore((s) => s.source);

  return (
    <header className="alt-phasebar" role="banner">
      <div className="alt-phasebar__brand">
        <span className="alt-phasebar__dot" aria-hidden="true" />
        <span className="alt-mono">{WORDMARK}</span>
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
                {state === 'done' && (
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                    <path d="M1.5 5.2l2.2 2.2L8.5 2.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                )}
                {name}
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
