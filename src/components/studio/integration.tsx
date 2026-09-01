'use client';
import type { RenderedPage, Wireframe } from '@/types/layouts';
import { PagePreview } from '@/components/canvas/PagePreview';
import { WireframePreview } from '@/components/canvas/WireframePreview';

/**
 * Cross-stream mounting points.
 *
 * Stream 5 owns the composition; the panels themselves belong to other streams. Each slot was a
 * placeholder naming the import that replaces it, so that integration would be one mechanical,
 * reviewable diff instead of edits scattered through StudioShell and Canvas. All six are now
 * wired to their real components; the indirection stays because StudioShell and Canvas are
 * written against these names.
 */

/** Stream 1 — D-108. */
export { default as TokenStyleInjectorSlot } from '@/components/studio/TokenStyleInjector';

/** Stream 1 — §5.2. */
export { default as TokenPanelSlot } from '@/components/tokens/TokenPanel';

/** Stream 3 — D-031. */
export { default as ToolInspectorSlot } from '@/components/studio/ToolInspector';

/** Stream 3 — D-158. The counts the placeholder carried live in the status bar itself. */
export { default as StatusBarSlot } from '@/components/studio/WebMCPStatusBar';

/** Stream 2 — D-096. ComponentGrid selects the loose components from the store itself. */
export { ComponentGrid as ComponentGridSlot } from '@/components/canvas/ComponentGrid';

/**
 * Stream 4 — §4.1, §4.4. One slot for the two states of a wireframe: once it has been rendered
 * the page replaces it in place (D-137), which is the moment the studio is built around.
 */
export function WireframeViewSlot({ wireframe, page }: { wireframe: Wireframe; page?: RenderedPage }) {
  return page ? <PagePreview page={page} /> : <WireframePreview wireframe={wireframe} />;
}
