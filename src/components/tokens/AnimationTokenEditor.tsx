'use client';
/**
 * Three duration sliders and three easing selects, with a dot that runs the current curve on every
 * change so the numbers mean something.
 */
import type { AnimationKey, TokenPath } from '@/types/tokens';
import { useTokenStore } from '@/stores/tokenStore';
import { useTokenEditor } from './useTokenEditor';
import { useAgentTouchedTokens } from './_agentFlash';
import { Row, Slider } from './_controls';
import LockToggle from './LockToggle';

const DURATIONS: readonly { key: AnimationKey; label: string }[] = [
  { key: 'durationFast', label: 'Fast' },
  { key: 'durationNormal', label: 'Normal' },
  { key: 'durationSlow', label: 'Slow' },
];
const EASINGS: readonly { key: AnimationKey; label: string }[] = [
  { key: 'easingDefault', label: 'Easing' },
  { key: 'easingIn', label: 'Easing in' },
  { key: 'easingOut', label: 'Easing out' },
];
const EASING_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'linear', label: 'linear' },
  { value: 'ease', label: 'ease' },
  { value: 'ease-in', label: 'ease-in' },
  { value: 'ease-out', label: 'ease-out' },
  { value: 'ease-in-out', label: 'ease-in-out' },
  { value: 'cubic-bezier(0.4, 0, 0.2, 1)', label: 'Standard' },
  { value: 'cubic-bezier(0.4, 0, 1, 1)', label: 'Accelerate' },
  { value: 'cubic-bezier(0, 0, 0.2, 1)', label: 'Decelerate' },
];

export default function AnimationTokenEditor() {
  const animation = useTokenStore((s) => s.animation);
  const flashing = useAgentTouchedTokens();
  const duration = Number(animation.durationNormal);
  const easing = String(animation.easingDefault);
  // The dot replays by re-mounting: every distinct duration/easing pair is a new key, so the
  // preview restarts on change without a tick in state.
  const replayKey = `${duration}-${easing}`;

  return (
    <div className="tk-motion">
      {DURATIONS.map((row) => (
        <DurationRow
          key={row.key}
          animationKey={row.key}
          label={row.label}
          value={Number(animation[row.key])}
          flashing={flashing.has(`animation.${row.key}`)}
        />
      ))}
      {EASINGS.map((row) => (
        <EasingRow
          key={row.key}
          animationKey={row.key}
          label={row.label}
          value={String(animation[row.key])}
          flashing={flashing.has(`animation.${row.key}`)}
        />
      ))}
      <div className="tk-motion-preview" aria-hidden="true">
        <span
          key={replayKey}
          className="tk-motion-dot"
          style={{ animationDuration: `${duration}ms`, animationTimingFunction: easing }}
        />
      </div>
    </div>
  );
}

function DurationRow({
  animationKey,
  label,
  value,
  flashing,
}: {
  animationKey: AnimationKey;
  label: string;
  value: number;
  flashing: boolean;
}) {
  const path: TokenPath = `animation.${animationKey}`;
  const locked = useTokenStore((s) => s.locked.includes(path));
  const editor = useTokenEditor(path);
  return (
    <Row token={path} locked={locked} flashing={flashing}>
      <Slider
        label={label}
        value={value}
        min={0}
        max={1000}
        step={10}
        suffix="ms"
        disabled={locked}
        onBegin={editor.begin}
        onInput={(n) => editor.live(String(n))}
        onEnd={editor.end}
      />
      <LockToggle locked={locked} onChange={editor.setLocked} />
    </Row>
  );
}

function EasingRow({
  animationKey,
  label,
  value,
  flashing,
}: {
  animationKey: AnimationKey;
  label: string;
  value: string;
  flashing: boolean;
}) {
  const path: TokenPath = `animation.${animationKey}`;
  const locked = useTokenStore((s) => s.locked.includes(path));
  const editor = useTokenEditor(path);
  const known = EASING_OPTIONS.some((o) => o.value === value);
  return (
    <Row token={path} locked={locked} flashing={flashing}>
      <span className="tk-role">{label}</span>
      <select
        className="tk-select"
        aria-label={label}
        value={known ? value : ''}
        disabled={locked}
        onChange={(e) => editor.set(e.target.value)}
      >
        {known ? null : <option value="">{value}</option>}
        {EASING_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <LockToggle locked={locked} onChange={editor.setLocked} />
    </Row>
  );
}
