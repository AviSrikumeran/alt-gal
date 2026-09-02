'use client';
import { useEffect } from 'react';
import type { JSX } from 'react'; // React 19: the global JSX namespace was removed
import { ensureModelContext, unavailableReason } from '@/webmcp/detect';
import { useWebMCPStatusStore } from '@/stores/webmcpStatusStore';
import { useWebMCPRegistration } from '@/webmcp/useWebMCPRegistration';

function Registrar(): null {
  useWebMCPRegistration();
  return null;
}

/** Mounted once in app/layout.tsx as a sibling of {children}. Renders nothing. */
export default function WebMCPBridge(): JSX.Element | null {
  // D-244: the store, not local state, decides whether the Registrar is mounted — the banner's
  // Retry button re-detects and writes the result there, and this remounts off the same value.
  const source = useWebMCPStatusStore((s) => s.source);
  const resolved = useWebMCPStatusStore((s) => s.resolved);

  useEffect(() => {
    let live = true;
    void ensureModelContext().then((next) => {
      if (live) useWebMCPStatusStore.getState().setSource(next, unavailableReason());
    });
    return () => {
      live = false;
    };
  }, []);

  return resolved && source !== 'none' ? <Registrar /> : null;
}
