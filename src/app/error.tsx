'use client';
import { useEffect } from 'react';
import { S } from '@/components/studio/strings';

const PERSISTED_KEYS = [
  'altgal.tokens.v1',
  'altgal.components.v1',
  'altgal.layouts.v1',
  'altgal.rules.v1',
  'altgal.log.v1',
  'altgal.ui.v1',
];

/**
 * D-205. The studio's work is in localStorage, so a crash is recoverable by reload; Reset is the
 * escape hatch when the persisted state itself is the problem (D-176 handles the readable cases).
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[alt.gal] studio error', error);
  }, [error]);

  const resetWorkspace = () => {
    if (!window.confirm(S.resetConfirm)) return;
    for (const key of PERSISTED_KEYS) window.localStorage.removeItem(key);
    window.location.reload();
  };

  return (
    <div className="alt-sheet">
      <div className="alt-sheet__panel" role="alert">
        <h2 className="alt-panel__title">{S.errorTitle}</h2>
        <p style={{ margin: '8px 0 16px', color: 'var(--studio-text-muted)', fontSize: 12 }}>{S.errorBody}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="alt-btn" data-kind="primary" onClick={reset}>
            {S.errorReload}
          </button>
          <button type="button" className="alt-btn" onClick={resetWorkspace}>
            {S.errorReset}
          </button>
        </div>
      </div>
    </div>
  );
}
