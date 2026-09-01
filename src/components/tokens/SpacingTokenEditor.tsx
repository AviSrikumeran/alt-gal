'use client';
/**
 * D-082: the human edits `spacing.unit` and nothing else. The ten multipliers are the point of a
 * spacing system; letting anyone set --spacing-3 to 13px is how systems die. The ruler below shows
 * what the unit produces.
 */
import { useTokenStore } from '@/stores/tokenStore';
import { SPACING_SCALE } from '@/utils/defaults';
import { useTokenEditor } from './_commit';
import { useAgentTouchedTokens } from './_agentFlash';
import { Row, Segmented } from './_controls';
import LockToggle from './LockToggle';

const UNITS = [2, 4, 6, 8].map((n) => ({ value: n, label: String(n) }));

export default function SpacingTokenEditor() {
  const unit = useTokenStore((s) => s.spacing.unit);
  const locked = useTokenStore((s) => s.locked.includes('spacing.unit'));
  const editor = useTokenEditor('spacing.unit');
  const flashing = useAgentTouchedTokens();

  return (
    <div className="tk-spacing">
      <Row token="spacing.unit" locked={locked} flashing={flashing.has('spacing.unit')}>
        <span className="tk-role">Unit</span>
        <Segmented
          label="Unit"
          value={unit}
          options={UNITS}
          disabled={locked}
          onChange={(n) => editor.set(String(n))}
        />
        <LockToggle locked={locked} onChange={editor.setLocked} />
      </Row>
      <ul className="tk-ruler" aria-label="Spacing steps">
        {SPACING_SCALE.map((m) => (
          <li key={m} className="tk-ruler-step">
            <span className="tk-ruler-bar" style={{ width: `${m * unit}px` }} />
            <span className="tk-ruler-label">
              {m} · {m * unit}px
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
