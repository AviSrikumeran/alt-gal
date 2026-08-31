'use client';
import { useEffect, useState } from 'react';
import type { JSX } from 'react'; // React 19: the global JSX namespace was removed
import { ensureModelContext } from '@/webmcp/detect';
import { useWebMCPStatusStore } from '@/stores/webmcpStatusStore';
import { useWebMCPRegistration } from '@/webmcp/useWebMCPRegistration';

function Registrar(): null {
  useWebMCPRegistration();
  return null;
}

/** Mounted once in app/layout.tsx as a sibling of {children}. Renders nothing. */
export default function WebMCPBridge(): JSX.Element | null {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    void ensureModelContext().then((source) => {
      if (!live) return;
      useWebMCPStatusStore.getState().setSource(source);
      if (source !== 'none') setReady(true);
    });
    return () => {
      live = false;
    };
  }, []);
  return ready ? <Registrar /> : null;
}
