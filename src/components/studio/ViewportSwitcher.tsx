'use client';
import type { Viewport } from '@/stores/uiStore';
import { useUIStore, VIEWPORT_WIDTHS } from '@/stores/uiStore';
import { S } from './strings';

const LABELS: Record<Viewport, string> = {
  desktop: S.viewportDesktop,
  tablet: S.viewportTablet,
  mobile: S.viewportMobile,
};

const ICONS: Record<Viewport, string> = {
  desktop: 'M2 4h12v7H2zM6 13h4',
  tablet: 'M4 2h8v12H4zM7 12h2',
  mobile: 'M5 2h6v12H5zM7 12h2',
};

/**
 * D-098: this only sets the canvas root's width. No component reads the viewport — the library
 * adapts through container queries against that root, so 375px in the studio behaves exactly like
 * 375px in a browser.
 */
export default function ViewportSwitcher() {
  const viewport = useUIStore((s) => s.viewport);
  const setViewport = useUIStore((s) => s.setViewport);

  return (
    <div className="alt-group" role="group" aria-label="Viewport">
      {(Object.keys(VIEWPORT_WIDTHS) as Viewport[]).map((v) => (
        <button
          key={v}
          type="button"
          className="alt-btn"
          data-icon="true"
          data-active={viewport === v}
          aria-pressed={viewport === v}
          title={`${LABELS[v]} ${VIEWPORT_WIDTHS[v]}`}
          aria-label={LABELS[v]}
          onClick={() => setViewport(v)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d={ICONS[v]} fill="none" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
      ))}
    </div>
  );
}
