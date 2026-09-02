'use client';
// WebMCPStatusBar — the 28px bottom bar (D-158). It answers one question honestly at all
// times: could an agent reach this page right now, and how many tools would it see (D-014,
// D-016). Strings are the D-160 microcopy table verbatim; Stream 5 lifts them into strings.ts.
import { useComponentStore } from '@/stores/componentStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useTokenStore } from '@/stores/tokenStore';
import { useUIStore } from '@/stores/uiStore';
import { useWebMCPStatusStore } from '@/stores/webmcpStatusStore';
import type { WebMCPSource } from '@/webmcp/detect';
import { S } from './strings';
import './webmcp-panels.css';

/** D-247: 'detecting' is the ~1.5s poll window; it is not a verdict, and must not read as one. */
type StatusSource = WebMCPSource | 'detecting';

const sourceText = (source: StatusSource, n: number): string => {
  if (source === 'detecting') return S.statusDetecting;
  if (source === 'native') return S.statusNative(n);
  if (source === 'polyfill') return S.statusPolyfill(n);
  return S.statusNone;
};

export default function WebMCPStatusBar() {
  const source = useWebMCPStatusStore<StatusSource>((s) => (s.resolved ? s.source : 'detecting'));
  const toolCount = useWebMCPStatusStore((s) => s.toolCount);
  const degraded = useWebMCPStatusStore((s) => s.degraded);
  const failures = useWebMCPStatusStore((s) => s.failures);
  const tokens = useTokenStore((s) => s.getDefinedTokenCount());
  const components = useComponentStore((s) => s.components.length);
  const pages = useLayoutStore((s) => s.renderedPages.length);
  const inspectorOpen = useUIStore((s) => s.inspectorOpen);
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);

  return (
    <footer className="alt-status" aria-label="WebMCP status">
      <span className="alt-status__source">
        <span className="alt-status__dot" data-source={source} aria-hidden="true" />
        <span aria-live="polite">{sourceText(source, toolCount)}</span>
      </span>
      {/* D-015: a host that rejects registerTool degrades the agent surface, not the studio. */}
      {degraded && (
        <span className="alt-status__degraded">
          {failures.length} tool{failures.length === 1 ? '' : 's'} failed to register
        </span>
      )}
      <span className="alt-status__counts">
        {tokens} tokens · {components} components · {pages} pages
      </span>
      <button
        type="button"
        className="alt-status__toggle"
        aria-pressed={inspectorOpen}
        onClick={() => setInspectorOpen(!inspectorOpen)}
      >
        Tool Inspector
      </button>
    </footer>
  );
}
