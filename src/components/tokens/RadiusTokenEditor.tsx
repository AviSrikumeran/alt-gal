'use client';
/**
 * Six radius rows, each a slider with a live corner preview. `full` is a pill, fixed at 9999 —
 * a slider there would only let someone break it.
 */
import type { RadiusKey, TokenPath } from '@/types/tokens';
import { useTokenStore } from '@/stores/tokenStore';
import { useTokenEditor } from './_commit';
import { useAgentTouchedTokens } from './_agentFlash';
import { Row, Slider } from './_controls';
import LockToggle from './LockToggle';

const ROWS: readonly { key: RadiusKey; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'sm', label: 'Small' },
  { key: 'md', label: 'Medium' },
  { key: 'lg', label: 'Large' },
  { key: 'xl', label: 'Extra large' },
  { key: 'full', label: 'Full' },
];

export default function RadiusTokenEditor() {
  const radius = useTokenStore((s) => s.radius);
  const flashing = useAgentTouchedTokens();
  return (
    <div className="tk-radius">
      {ROWS.map((row) => (
        <RadiusRow
          key={row.key}
          radiusKey={row.key}
          label={row.label}
          value={radius[row.key]}
          flashing={flashing.has(`radius.${row.key}`)}
        />
      ))}
    </div>
  );
}

function RadiusRow({
  radiusKey,
  label,
  value,
  flashing,
}: {
  radiusKey: RadiusKey;
  label: string;
  value: number;
  flashing: boolean;
}) {
  const path: TokenPath = `radius.${radiusKey}`;
  const locked = useTokenStore((s) => s.locked.includes(path));
  const editor = useTokenEditor(path);
  return (
    <Row token={path} locked={locked} flashing={flashing}>
      <span className="tk-preview-square" style={{ borderRadius: `${Math.min(value, 12)}px` }} aria-hidden="true" />
      {radiusKey === 'full' ? (
        <>
          <span className="tk-role">{label}</span>
          <span className="tk-readout">pill</span>
        </>
      ) : (
        <Slider
          label={label}
          value={value}
          min={0}
          max={32}
          suffix="px"
          disabled={locked}
          onBegin={editor.begin}
          onInput={(n) => editor.live(String(n))}
          onEnd={editor.end}
        />
      )}
      <LockToggle locked={locked} onChange={editor.setLocked} />
    </Row>
  );
}
