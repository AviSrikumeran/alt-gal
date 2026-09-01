'use client';
import type { Phase } from '@/types/phase';
import { usePhaseStore } from '@/stores/phaseStore';
import { useUIStore } from '@/stores/uiStore';
import { TOKENS_REQUIRED_FOR_PHASE_2 } from '@/utils/defaults';
import { useTokenStore } from '@/stores/tokenStore';
import { emitStudio } from './events';
import { S } from './strings';

/**
 * D-149. One card per phase, each naming the specific thing that unlocks the next one — the same
 * information `get_current_state` gives the agent, in the same words, so human and agent are never
 * looking at two different explanations of the same gate.
 */
export default function EmptyState({ phase, onAddComponent }: { phase: Phase; onAddComponent: () => void }) {
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);
  const missing = usePhaseStore.getState().nextPhase()?.missing ?? []; // fresh array; see PhaseIndicator
  const defined = useTokenStore((s) => s.getDefinedTokenCount());

  if (phase === 0) {
    return (
      <div className="alt-empty">
        <h2 className="alt-empty__title">{S.empty0Title}</h2>
        <p className="alt-empty__body">{S.empty0Body}</p>
        <div className="alt-empty__actions">
          <button type="button" className="alt-btn" data-kind="primary" onClick={() => emitStudio('alt:focus-primary')}>
            {S.empty0Primary}
          </button>
          <button type="button" className="alt-btn" onClick={() => setInspectorOpen(true)}>
            {S.empty0Secondary}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 1) {
    const remaining = Math.max(0, TOKENS_REQUIRED_FOR_PHASE_2 - defined);
    return (
      <div className="alt-empty">
        <h2 className="alt-empty__title">{S.empty1Body(remaining)}</h2>
        {missing.length > 0 && (
          <ul className="alt-empty__chips">
            {missing.map((m) => (
              <li key={m} className="alt-chip alt-mono">
                {m}
              </li>
            ))}
          </ul>
        )}
        <div className="alt-empty__actions">
          <button
            type="button"
            className="alt-btn"
            data-kind="primary"
            onClick={() => emitStudio('alt:fill-from-primary')}
          >
            {S.fillFromPrimary}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="alt-empty">
      <h2 className="alt-empty__title">{S.empty2Title}</h2>
      <p className="alt-empty__body">{S.empty2Body}</p>
      <div className="alt-empty__actions">
        <button type="button" className="alt-btn" data-kind="primary" onClick={onAddComponent}>
          {S.addComponent}
        </button>
      </div>
    </div>
  );
}
