'use client';
/**
 * Five shadow rows with a live preview card each, plus a Soft/Regular/Strong intensity that rewrites
 * all five from preset sets. Regular is the default set, so switching back to it un-touches the
 * tokens and the phase count drops accordingly (D-047).
 */
import type { ElevationKey, TokenPath } from '@/types/tokens';
import { useTokenStore } from '@/stores/tokenStore';
import { DEFAULT_TOKENS } from '@/utils/defaults';
import { commitTokens, useTokenEditor } from './_commit';
import { useAgentTouchedTokens } from './_agentFlash';
import { Row, Segmented } from './_controls';
import LockToggle from './LockToggle';

const ROWS: readonly { key: ElevationKey; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'sm', label: 'Small' },
  { key: 'md', label: 'Medium' },
  { key: 'lg', label: 'Large' },
  { key: 'xl', label: 'Extra large' },
];

type Intensity = 'soft' | 'regular' | 'strong';
const INTENSITY_SETS: Record<Intensity, Record<ElevationKey, string>> = {
  soft: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0,0,0,0.03)',
    md: '0 3px 6px -2px rgba(0,0,0,0.06), 0 1px 3px -1px rgba(0,0,0,0.05)',
    lg: '0 8px 12px -4px rgba(0,0,0,0.07), 0 3px 5px -3px rgba(0,0,0,0.05)',
    xl: '0 16px 20px -6px rgba(0,0,0,0.08), 0 6px 8px -5px rgba(0,0,0,0.05)',
  },
  regular: DEFAULT_TOKENS.elevation,
  strong: {
    none: 'none',
    sm: '0 1px 3px 0 rgba(0,0,0,0.09)',
    md: '0 6px 10px -1px rgba(0,0,0,0.16), 0 3px 6px -2px rgba(0,0,0,0.14)',
    lg: '0 14px 22px -3px rgba(0,0,0,0.18), 0 6px 10px -4px rgba(0,0,0,0.14)',
    xl: '0 26px 34px -5px rgba(0,0,0,0.2), 0 12px 16px -6px rgba(0,0,0,0.15)',
  },
};
const INTENSITY_OPTIONS = [
  { value: 'soft' as const, label: 'Soft' },
  { value: 'regular' as const, label: 'Regular' },
  { value: 'strong' as const, label: 'Strong' },
];

function currentIntensity(elevation: Record<ElevationKey, string>): Intensity {
  for (const name of ['soft', 'regular', 'strong'] as Intensity[]) {
    if (ROWS.every((r) => INTENSITY_SETS[name][r.key] === elevation[r.key])) return name;
  }
  return 'regular';
}

export default function ElevationTokenEditor() {
  const elevation = useTokenStore((s) => s.elevation);
  const flashing = useAgentTouchedTokens();

  const applyIntensity = (next: Intensity) => {
    const set = INTENSITY_SETS[next];
    const values: Partial<Record<TokenPath, string>> = {};
    for (const row of ROWS) values[`elevation.${row.key}`] = set[row.key];
    commitTokens('ui.set_elevation_intensity', values);
  };

  return (
    <div className="tk-elevation">
      <div className="tk-field">
        <span className="tk-label">Shadow intensity</span>
        <Segmented
          label="Shadow intensity"
          value={currentIntensity(elevation)}
          options={INTENSITY_OPTIONS}
          onChange={applyIntensity}
        />
      </div>
      {ROWS.map((row) => (
        <ElevationRow
          key={row.key}
          elevationKey={row.key}
          label={row.label}
          value={elevation[row.key]}
          flashing={flashing.has(`elevation.${row.key}`)}
        />
      ))}
    </div>
  );
}

function ElevationRow({
  elevationKey,
  label,
  value,
  flashing,
}: {
  elevationKey: ElevationKey;
  label: string;
  value: string;
  flashing: boolean;
}) {
  const path: TokenPath = `elevation.${elevationKey}`;
  const locked = useTokenStore((s) => s.locked.includes(path));
  const editor = useTokenEditor(path);
  return (
    <Row token={path} locked={locked} flashing={flashing}>
      <span className="tk-preview-card" style={{ boxShadow: value }} aria-hidden="true" />
      <span className="tk-role">{label}</span>
      <input
        className="tk-shadow-input"
        type="text"
        spellCheck={false}
        aria-label={`${label} shadow`}
        defaultValue={value}
        key={value}
        disabled={locked}
        onBlur={(e) => editor.set(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') editor.set(e.currentTarget.value);
        }}
      />
      <LockToggle locked={locked} onChange={editor.setLocked} />
    </Row>
  );
}
