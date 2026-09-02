'use client';
/**
 * The thirteen color slots (D-045), their popover (D-106), the ghost proposals and "Fill from
 * primary" (D-104, D-107), and locks (D-127).
 *
 * Storage is normalized HSL (D-080); hex is what designers paste, so the row shows hex and the
 * popover shows HSL. Conversion happens here, never in the store and never in a tool.
 */
import { useEffect, useRef, useState } from 'react';
import type { SemanticColorRole, TokenPath } from '@/types/tokens';
import { SEMANTIC_COLOR_ROLES } from '@/types/tokens';
import type { HSL, PaletteStrategy } from '@/utils/colorUtils';
import { generatePalette, parseColor, toHSLString, toHex } from '@/utils/colorUtils';
import { useTokenStore } from '@/stores/tokenStore';
import { fillFromPrimary as applyFillFromPrimary } from './fillFromPrimary';
import { useTokenEditor } from './useTokenEditor';
import { useAgentTouchedTokens } from './_agentFlash';
import { Row } from './_controls';
import LockToggle from './LockToggle';
import TokenSwatch from './TokenSwatch';

const ROLE_LABEL: Record<SemanticColorRole, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  danger: 'Danger',
  warning: 'Warning',
  success: 'Success',
  muted: 'Muted',
  background: 'Background',
  surface: 'Surface',
  'text-primary': 'Text',
  'text-secondary': 'Text secondary',
  'text-muted': 'Text muted',
  border: 'Border',
};

/** D-106, in order. */
const PRESETS: readonly string[] = [
  'hsl(250, 84%, 60%)',
  'hsl(220, 90%, 56%)',
  'hsl(199, 89%, 48%)',
  'hsl(160, 84%, 39%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(24, 95%, 53%)',
  'hsl(0, 84%, 60%)',
  'hsl(330, 81%, 60%)',
  'hsl(0, 0%, 10%)',
];

const STRATEGIES: readonly { value: PaletteStrategy; label: string }[] = [
  { value: 'analogous', label: 'Analogous' },
  { value: 'complementary', label: 'Complementary' },
  { value: 'triadic', label: 'Triadic' },
  { value: 'monochromatic', label: 'Monochromatic' },
];

export default function ColorTokenEditor() {
  const colors = useTokenStore((s) => s.colors);
  const [strategy, setStrategy] = useState<PaletteStrategy>('analogous');
  const [openRole, setOpenRole] = useState<SemanticColorRole | null>(null);
  const flashing = useAgentTouchedTokens();

  const primary = colors.primary ? parseColor(colors.primary) : null;
  const proposals = primary ? generatePalette(primary, strategy) : null;

  // The palette algorithm, the lock filter, and the single log entry live in fillFromPrimary.ts,
  // so this button and the phase-1 empty state's CTA (`alt:fill-from-primary`) are one path.
  const fillFromPrimary = () => {
    applyFillFromPrimary(strategy);
  };

  return (
    <div className="tk-colors">
      <div className="tk-rows">
        {SEMANTIC_COLOR_ROLES.map((role) => (
          <ColorRow
            key={role}
            role={role}
            value={colors[role]}
            ghost={proposals && !colors[role] && role !== 'primary' ? proposals[role] : null}
            open={openRole === role}
            flashing={flashing.has(`color.${role}`)}
            onOpen={(next) => setOpenRole(next ? role : null)}
          />
        ))}
      </div>

      {primary ? (
        <div className="tk-fill">
          <button type="button" className="tk-button tk-button-primary" onClick={fillFromPrimary}>
            Fill from primary
          </button>
          <label className="tk-visually-hidden" htmlFor="tk-strategy">
            Palette strategy
          </label>
          <select
            id="tk-strategy"
            className="tk-select"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as PaletteStrategy)}
          >
            {STRATEGIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

function ColorRow({
  role,
  value,
  ghost,
  open,
  flashing,
  onOpen,
}: {
  role: SemanticColorRole;
  value: string | null;
  ghost: string | null;
  open: boolean;
  flashing: boolean;
  onOpen(next: boolean): void;
}) {
  const path: TokenPath = `color.${role}`;
  const locked = useTokenStore((s) => s.locked.includes(path));
  const editor = useTokenEditor(path);
  const parsed = value ? parseColor(value) : null;
  const hex = parsed ? toHex(parsed) : '';

  // Uncontrolled and keyed on the stored value: the field re-mounts whenever the store changes
  // (agent write, undo, "Fill from primary") and otherwise leaves the human's half-typed hex alone.
  const commitDraft = (field: HTMLInputElement) => {
    const text = field.value.trim();
    if (text === '') {
      if (value !== null) editor.remove();
      return;
    }
    if (!editor.set(text)) field.value = hex;
  };

  return (
    <Row token={path} locked={locked} flashing={flashing}>
      <div className="tk-swatch-cell">
        <TokenSwatch
          value={value}
          ghost={ghost}
          locked={locked}
          label={`${ROLE_LABEL[role]} color`}
          onClick={() => onOpen(!open)}
        />
        {open ? (
          <ColorPopover role={role} value={parsed} onClose={() => onOpen(false)} editor={editor} disabled={locked} />
        ) : null}
      </div>
      <span className="tk-role">{ROLE_LABEL[role]}</span>
      {ghost ? (
        <button
          type="button"
          className="tk-ghost-accept"
          title="Use this color"
          onClick={() => editor.set(ghost)}
          disabled={locked}
        >
          {toHex(parseColor(ghost) as HSL)}
        </button>
      ) : (
        <input
          key={hex}
          className="tk-hex"
          type="text"
          spellCheck={false}
          aria-label={`${ROLE_LABEL[role]} hex value`}
          placeholder="Not set"
          defaultValue={hex}
          disabled={locked}
          onBlur={(e) => commitDraft(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitDraft(e.currentTarget);
          }}
        />
      )}
      <LockToggle locked={locked} hidden={value === null} onChange={(next) => editor.setLocked(next)} />
      {role === 'primary' && value === null ? <p className="tk-hint">Set primary to begin.</p> : null}
    </Row>
  );
}

function ColorPopover({
  role,
  value,
  onClose,
  editor,
  disabled,
}: {
  role: SemanticColorRole;
  value: HSL | null;
  onClose(): void;
  editor: ReturnType<typeof useTokenEditor>;
  disabled: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const current: HSL = value ?? { h: 250, s: 84, l: 60 };

  useEffect(() => {
    box.current?.querySelector<HTMLElement>('button, input')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);

  const channel = (patch: Partial<HSL>) => toHSLString({ ...current, ...patch });
  const hueTrack = `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360]
    .map((h) => `hsl(${h}, ${current.s}%, ${current.l}%)`)
    .join(', ')})`;
  const satTrack = `linear-gradient(to right, ${channel({ s: 0 })}, ${channel({ s: 100 })})`;
  const lumTrack = `linear-gradient(to right, ${channel({ l: 0 })}, ${channel({ l: 50 })}, ${channel({ l: 100 })})`;

  return (
    <div className="tk-popover" ref={box} role="dialog" aria-label={`${role} color`}>
      <div className="tk-presets">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className="tk-preset"
            style={{ backgroundColor: preset }}
            aria-label={preset}
            disabled={disabled}
            onClick={() => {
              editor.set(preset);
              onClose();
            }}
          />
        ))}
      </div>

      <PopoverSlider
        label="Hue"
        value={Math.round(current.h)}
        max={359}
        track={hueTrack}
        disabled={disabled}
        editor={editor}
        toValue={(n) => channel({ h: n })}
      />
      <PopoverSlider
        label="Saturation"
        value={Math.round(current.s)}
        max={100}
        suffix="%"
        track={satTrack}
        disabled={disabled}
        editor={editor}
        toValue={(n) => channel({ s: n })}
      />
      <PopoverSlider
        label="Lightness"
        value={Math.round(current.l)}
        max={100}
        suffix="%"
        track={lumTrack}
        disabled={disabled}
        editor={editor}
        toValue={(n) => channel({ l: n })}
      />

      <div className="tk-popover-foot">
        <input
          className="tk-native-color"
          type="color"
          aria-label="System color picker"
          value={toHex(current)}
          disabled={disabled}
          onChange={(e) => editor.set(e.target.value)}
        />
        <span className="tk-popover-hex">{toHex(current)}</span>
      </div>
    </div>
  );
}

/** Drag writes through on every input event; the log gets one entry on release (D-110, D-111). */
function PopoverSlider({
  label,
  value,
  max,
  suffix = '',
  track,
  disabled,
  editor,
  toValue,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  track: string;
  disabled: boolean;
  editor: ReturnType<typeof useTokenEditor>;
  toValue(n: number): string;
}) {
  return (
    <label className="tk-hsl">
      <span className="tk-label">{label}</span>
      <input
        type="range"
        className="tk-slider tk-slider-track"
        style={{ backgroundImage: track }}
        min={0}
        max={max}
        value={value}
        disabled={disabled}
        aria-valuetext={`${value}${suffix}`}
        onPointerDown={editor.begin}
        onKeyDown={editor.begin}
        onChange={(e) => editor.live(toValue(Number(e.target.value)))}
        onPointerUp={editor.end}
        onBlur={editor.end}
      />
      <output className="tk-readout">
        {value}
        {suffix}
      </output>
    </label>
  );
}
