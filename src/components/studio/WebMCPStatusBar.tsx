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
import './webmcp-panels.css';

const sourceText = (source: WebMCPSource, n: number): string => {
  if (source === 'native') return `${n} agent tools active · native`;
  if (source === 'polyfill')
    return `${n} tools registered · polyfill — no agent is connected. Open in ChatGPT's browser or enable chrome://flags/#enable-webmcp-testing.`;
  return 'Agent tools unavailable — this page must be served over HTTPS.';
};

export default function WebMCPStatusBar() {
  const source = useWebMCPStatusStore((s) => s.source);
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
