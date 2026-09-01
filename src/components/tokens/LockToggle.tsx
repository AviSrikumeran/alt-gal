'use client';
/**
 * D-056, D-127: a padlock on every token row. The lock constrains the AGENT — `set_token`,
 * `remove_token`, and `suggest_palette` refuse a locked path — never the human and never undo.
 * The store does not enforce it (D-112); tools and this panel do.
 */
export default function LockToggle({
  locked,
  onChange,
  hidden,
}: {
  locked: boolean;
  onChange(next: boolean): void;
  hidden?: boolean;
}) {
  if (hidden) return <span className="tk-lock-spacer" aria-hidden="true" />;
  return (
    <button
      type="button"
      className="tk-lock"
      aria-pressed={locked}
      title={locked ? 'Unlock' : "Lock — the agent can't change this"}
      aria-label={locked ? 'Unlock' : "Lock — the agent can't change this"}
      onClick={() => onChange(!locked)}
    >
      <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
        <rect x="3" y="6.5" width="8" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path
          d={locked ? 'M5 6.5 V4.5 a2 2 0 0 1 4 0 V6.5' : 'M5 6.5 V4.5 a2 2 0 0 1 4 0'}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      </svg>
    </button>
  );
}
