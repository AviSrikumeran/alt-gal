'use client';
/**
 * Three font rows, the two-control type scale, five weights, three line heights (D-105, D-122).
 *
 * The scale has nine steps in the store and two controls on screen: changing Base size or Ratio
 * recomputes all nine as round(base x ratio^n), n = -2..6, in ONE setMany so the panel and the phase
 * counter both see a single change. Individual steps stay agent-addressable through `set_token`.
 */
import { useRef, useState } from 'react';
import type { FontWeightKey, LineHeightKey, TokenPath, TypeScaleKey } from '@/types/tokens';
import type { FontCategory } from '@/utils/fonts';
import { FONT_CATALOG, FONT_CATEGORY_LABEL, FONT_GROUPS, fontStack } from '@/utils/fonts';
import { useTokenStore } from '@/stores/tokenStore';
import { commitTokens, useTokenEditor } from './useTokenEditor';
import { useAgentTouchedTokens } from './_agentFlash';
import { Row, Segmented, Slider } from './_controls';
import LockToggle from './LockToggle';

const SCALE_KEYS: readonly TypeScaleKey[] = ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
/** n in round(base x ratio^n). 'base' is n = 0. */
const SCALE_STEPS: readonly number[] = [-2, -1, 0, 1, 2, 3, 4, 5, 6];
const RATIOS = [
  { value: 1.125, label: '1.125 Major second' },
  { value: 1.2, label: '1.2 Minor third' },
  { value: 1.25, label: '1.25 Major third' },
  { value: 1.333, label: '1.333 Perfect fourth' },
] as const;
const WEIGHT_ROWS: readonly { key: FontWeightKey; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'regular', label: 'Regular' },
  { key: 'medium', label: 'Medium' },
  { key: 'semibold', label: 'Semibold' },
  { key: 'bold', label: 'Bold' },
];
const WEIGHT_OPTIONS = [300, 400, 500, 600, 700].map((w) => ({ value: w, label: String(w) }));
const LINE_ROWS: readonly { key: LineHeightKey; label: string }[] = [
  { key: 'tight', label: 'Tight' },
  { key: 'normal', label: 'Normal' },
  { key: 'relaxed', label: 'Relaxed' },
];
const FAMILY_ROWS = [
  { key: 'heading', label: 'Heading' },
  { key: 'body', label: 'Body' },
  { key: 'mono', label: 'Mono' },
] as const;

/** Nearest shipped ratio to the current scale, so the segmented control reflects reality. */
function inferRatio(base: number, next: number): number {
  const actual = next / base;
  let best: number = RATIOS[2].value;
  for (const r of RATIOS) if (Math.abs(r.value - actual) < Math.abs(best - actual)) best = r.value;
  return best;
}

export default function TypographyTokenEditor() {
  const typography = useTokenStore((s) => s.typography);
  const flashing = useAgentTouchedTokens();
  const base = typography.scale.base;
  const ratio = inferRatio(base, typography.scale.md);

  const rebuildScale = (nextBase: number, nextRatio: number) => {
    const values: Partial<Record<TokenPath, string>> = {};
    SCALE_KEYS.forEach((key, i) => {
      values[`fontSize.${key}`] = String(Math.round(nextBase * Math.pow(nextRatio, SCALE_STEPS[i] as number)));
    });
    commitTokens('ui.set_type_scale', values);
  };

  return (
    <div className="tk-typography">
      {FAMILY_ROWS.map((row) => (
        <FontRow key={row.key} path={`font.${row.key}`} label={row.label} flashing={flashing.has(`font.${row.key}`)} />
      ))}

      <div className="tk-field">
        <label className="tk-label" htmlFor="tk-base-size">
          Base size
        </label>
        <input
          id="tk-base-size"
          className="tk-number"
          type="number"
          min={12}
          max={24}
          value={base}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (next >= 12 && next <= 24) rebuildScale(next, ratio);
          }}
        />
      </div>
      <div className="tk-field">
        <span className="tk-label">Ratio</span>
        <Segmented
          label="Ratio"
          value={ratio}
          options={RATIOS.map((r) => ({ value: r.value, label: r.label.split(' ')[0] as string }))}
          onChange={(next) => rebuildScale(base, next)}
        />
      </div>
      <ul className="tk-chips">
        {SCALE_KEYS.map((key) => (
          <li key={key} className="tk-chip" data-token={`fontSize.${key}`}>
            <span className="tk-chip-key">{key}</span>
            {typography.scale[key]}px
          </li>
        ))}
      </ul>

      {WEIGHT_ROWS.map((row) => (
        <WeightRow key={row.key} weightKey={row.key} label={row.label} value={typography.weights[row.key]} />
      ))}

      {LINE_ROWS.map((row) => (
        <LineHeightRow key={row.key} lineKey={row.key} label={row.label} value={typography.lineHeights[row.key]} />
      ))}
    </div>
  );
}

/** Grouped listbox, each option in its own face (D-122). Faces load lazily; the prefetch is in TokenPanel. */
function FontRow({ path, label, flashing }: { path: TokenPath; label: string; flashing: boolean }) {
  const value = useTokenStore((s) => s.getToken(path)) ?? '';
  const locked = useTokenStore((s) => s.locked.includes(path));
  const editor = useTokenEditor(path);
  const [open, setOpen] = useState(false);
  const list = useRef<HTMLUListElement>(null);

  const move = (delta: number) => {
    const index = FONT_CATALOG.findIndex((f) => f.family === value);
    const next = FONT_CATALOG[Math.min(FONT_CATALOG.length - 1, Math.max(0, index + delta))];
    if (next) editor.set(next.family);
  };

  return (
    <Row token={path} locked={locked} flashing={flashing}>
      <span className="tk-role">{label}</span>
      <button
        type="button"
        className="tk-font-trigger"
        style={{ fontFamily: fontStack(value) }}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={locked}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            move(1);
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            move(-1);
          }
        }}
      >
        {value}
      </button>
      <LockToggle locked={locked} onChange={editor.setLocked} />
      {open ? (
        <ul className="tk-listbox" role="listbox" aria-label={`${label} font`} ref={list}>
          {(Object.keys(FONT_GROUPS) as FontCategory[]).map((category) => (
            <li key={category} role="presentation">
              <span className="tk-listbox-group">{FONT_CATEGORY_LABEL[category]}</span>
              <ul role="group">
                {FONT_GROUPS[category].map((font) => (
                  <li
                    key={font.family}
                    role="option"
                    aria-selected={font.family === value}
                    tabIndex={0}
                    className="tk-listbox-option"
                    style={{ fontFamily: fontStack(font.family) }}
                    onClick={() => {
                      editor.set(font.family);
                      setOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        editor.set(font.family);
                        setOpen(false);
                      }
                    }}
                  >
                    {font.family}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
    </Row>
  );
}

function WeightRow({ weightKey, label, value }: { weightKey: FontWeightKey; label: string; value: number }) {
  const path: TokenPath = `fontWeight.${weightKey}`;
  const editor = useTokenEditor(path);
  return (
    <Row token={path}>
      <span className="tk-role">{label}</span>
      <Segmented label={label} value={value} options={WEIGHT_OPTIONS} onChange={(n) => editor.set(String(n))} />
    </Row>
  );
}

function LineHeightRow({ lineKey, label, value }: { lineKey: LineHeightKey; label: string; value: number }) {
  const path: TokenPath = `lineHeight.${lineKey}`;
  const editor = useTokenEditor(path);
  return (
    <Row token={path}>
      <Slider
        label={label}
        value={value}
        min={0.8}
        max={3}
        step={0.05}
        onBegin={editor.begin}
        onInput={(n) => editor.live(String(n))}
        onEnd={editor.end}
      />
    </Row>
  );
}
