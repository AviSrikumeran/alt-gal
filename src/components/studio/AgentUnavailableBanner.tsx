'use client';
/**
 * D-244. When `ensureModelContext()` resolves 'none' nothing registers, there is no retry, and
 * every agent moment is gone — but the only thing that said so was a one-word chip reading
 * "unavailable" in a 28px status bar. This is the loud version: it names which of the two causes
 * fired, says what still works, and offers the retry the memoised detection did not have.
 *
 * It is deliberately not dismissible. The condition is total, and it is one a human can fix.
 */
import { useState } from 'react';
import { retryModelContext, unavailableReason } from '@/webmcp/detect';
import { useWebMCPStatusStore } from '@/stores/webmcpStatusStore';
import { S } from './strings';

export default function AgentUnavailableBanner() {
  const source = useWebMCPStatusStore((s) => s.source);
  const resolved = useWebMCPStatusStore((s) => s.resolved);
  const reason = useWebMCPStatusStore((s) => s.reason);
  const [retrying, setRetrying] = useState(false);

  // Nothing to say until detection has settled — that window is the "detecting" state, not this.
  if (!resolved || source !== 'none') return null;

  const retry = async () => {
    setRetrying(true);
    useWebMCPStatusStore.getState().beginDetection();
    try {
      const next = await retryModelContext();
      useWebMCPStatusStore.getState().setSource(next, unavailableReason());
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="alt-unavailable" role="alert">
      <div className="alt-unavailable__text">
        <strong className="alt-unavailable__title">{S.unavailableTitle}</strong>
        <span className="alt-unavailable__cause">{S.unavailableCause[reason ?? 'unknown']}</span>
        <span className="alt-unavailable__note">{S.unavailableConsequence}</span>
      </div>
      <button type="button" className="alt-btn" onClick={retry} disabled={retrying}>
        {retrying ? S.unavailableRetrying : S.unavailableRetry}
      </button>
    </div>
  );
}
