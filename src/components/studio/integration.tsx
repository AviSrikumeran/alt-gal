'use client';
import { useEffect, useState } from 'react';
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

/** The `alt-wf-out` box animation: 220ms, staggered 30ms per box, held to a third of a second. */
const EXIT_MS = (sections: number): number => Math.min(220 + Math.max(0, sections - 1) * 30, 360);

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

type RenderStage = 'idle' | 'out' | 'in';

/**
 * D-137, the half that was never wired. `WireframePreview` has always accepted `exiting` and
 * `canvas.css` has always carried both keyframes, but no caller passed it, so the boxes never
 * played out; and the page hardcoded `data-rendering="in"`, so the page-in half fired on every
 * mount — a plain reload included — rather than on the render it exists to celebrate.
 *
 * A *fresh* render is the only trigger: the wireframe's page id going from absent to present.
 * A page already on screen at mount does not animate (the ref is seeded with it), and a
 * re-render — page id to a different page id — skips the exit, because there are no gray boxes
 * on screen to play out.
 */
function useRenderStage(pageId: string | null, sectionCount: number): RenderStage {
  // Seeded with the current page id, which is what makes a page that was already rendered at
  // mount — a plain reload — not a render. `seen` is state, not a ref, because it is read during
  // render: this is React's "adjusting state when a prop changes", not an effect that would
  // commit the wireframe once more before the exit could start.
  const [seen, setSeen] = useState<string | null>(pageId);
  const [stage, setStage] = useState<RenderStage>('idle');

  if (pageId !== seen) {
    setSeen(pageId);
    if (pageId === null)
      setStage('idle'); // the human deleted the page; the wireframe comes back with no animation
    else if (seen !== null || prefersReducedMotion())
      setStage('in'); // a re-render has no boxes on screen to play out
    else setStage('out');
  }

  // The only thing left for an effect: end the hold.
  useEffect(() => {
    if (stage !== 'out') return;
    const timer = setTimeout(() => setStage('in'), EXIT_MS(sectionCount));
    return () => clearTimeout(timer);
  }, [stage, sectionCount]);

  return stage;
}

/**
 * Stream 4 — §4.1, §4.4. One slot for the two states of a wireframe: once it has been rendered
 * the page replaces it in place (D-137), which is the moment the studio is built around.
 */
export function WireframeViewSlot({ wireframe, page }: { wireframe: Wireframe; page?: RenderedPage }) {
  const stage = useRenderStage(page?.id ?? null, wireframe.sections.length);
  // `stage === 'out'` is the hold: the page exists in the store, and the boxes are still leaving.
  if (!page || stage === 'out') return <WireframePreview wireframe={wireframe} exiting={stage === 'out'} />;
  // Keyed by page id so a re-render remounts and replays the page-in rather than swapping in place.
  return <PagePreview key={page.id} page={page} entering={stage === 'in'} />;
}
