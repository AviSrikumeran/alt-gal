'use client';
/**
 * One color slot's swatch. Empty slot = dashed outline, no fill (D-146); a locked slot carries the
 * padlock inside the swatch (D-127). Ghost proposals render at 50% with a dashed edge (D-107).
 */
export default function TokenSwatch({
  value,
  ghost,
  locked,
  label,
  onClick,
}: {
  value: string | null;
  ghost?: string | null;
  locked?: boolean;
  label: string;
  onClick?(): void;
}) {
  const shown = value ?? ghost ?? null;
  const state = value ? 'set' : ghost ? 'ghost' : 'empty';
  const style = shown ? { backgroundColor: shown } : undefined;
  if (!onClick) return <span className="tk-swatch" data-state={state} style={style} aria-hidden="true" />;
  return (
    <button type="button" className="tk-swatch" data-state={state} style={style} aria-label={label} onClick={onClick}>
      {locked ? (
        <svg viewBox="0 0 14 14" width="10" height="10" aria-hidden="true">
          <rect x="3" y="6.5" width="8" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 6.5 V4.5 a2 2 0 0 1 4 0 V6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ) : null}
    </button>
  );
}
