'use client';
/**
 * The four controls the token panel repeats: a collapsible section, a segmented picker, a slider
 * with a numeric readout, and a lock-aware row. Studio chrome only — none of this reads user tokens.
 */
import type { ReactNode } from 'react';
import { useId } from 'react';
import type { PanelSection } from '@/stores/uiStore';
import { useUIStore } from '@/stores/uiStore';

export function Section({
  id,
  title,
  children,
  actions,
}: {
  id: PanelSection;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const open = useUIStore((s) => s.panelSections[id]);
  const setPanelSection = useUIStore((s) => s.setPanelSection);
  const bodyId = `tk-section-${id}`;
  return (
    <section className="tk-section" data-section={id}>
      <div className="tk-section-bar">
        <button
          type="button"
          className="tk-section-header"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setPanelSection(id, !open)}
        >
          <svg className="tk-chevron" viewBox="0 0 12 12" aria-hidden="true" width="12" height="12">
            <path d="M4 2.5 L8 6 L4 9.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          {title}
        </button>
        {actions}
      </div>
      <div id={bodyId} className="tk-section-body" hidden={!open}>
        {children}
      </div>
    </section>
  );
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange(next: T): void;
  disabled?: boolean;
}) {
  return (
    <div className="tk-segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className="tk-segment"
          aria-pressed={o.value === value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  disabled,
  onBegin,
  onInput,
  onEnd,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
  onBegin(): void;
  onInput(next: number): void;
  onEnd(): void;
}) {
  const id = useId();
  return (
    <div className="tk-slider-row">
      <label className="tk-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="tk-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={`${value}${suffix}`}
        onPointerDown={onBegin}
        onKeyDown={onBegin}
        // D-110: no debounce. Every input event writes through; only the log is coalesced (D-111).
        onChange={(e) => onInput(Number(e.target.value))}
        onPointerUp={onEnd}
        onBlur={onEnd}
      />
      <output className="tk-readout" htmlFor={id}>
        {value}
        {suffix}
      </output>
    </div>
  );
}

export function Row({
  children,
  locked,
  flashing,
  token,
}: {
  children: ReactNode;
  locked?: boolean;
  flashing?: boolean;
  token: string;
}) {
  return (
    <div
      className="tk-row"
      data-token={token}
      data-locked={locked ? 'true' : undefined}
      data-flash={flashing ? 'true' : undefined}
    >
      {children}
    </div>
  );
}
