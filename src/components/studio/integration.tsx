'use client';
import type { ComponentSpec } from '@/types/components';
import type { Wireframe } from '@/types/layouts';
import { ComponentPreview } from '@/components/canvas/ComponentPreview';
import { useComponentStore } from '@/stores/componentStore';
import { useLayoutStore } from '@/stores/layoutStore';

/**
 * Cross-stream mounting points.
 *
 * Stream 5 owns the composition; the panels themselves belong to other streams and are not on this
 * branch (merge order: seed → 1 ∥ 2 → 3 ∥ 4 → 5, §11.3). Each slot names the import that replaces
 * it at integration. Keeping them in one file makes that a mechanical, reviewable diff instead of
 * edits scattered through StudioShell.
 */

/** Stream 1 — `@/components/studio/TokenStyleInjector` (D-108). */
export function TokenStyleInjectorSlot(): null {
  return null;
}

/** Stream 1 — `@/components/tokens/TokenPanel` (§5.2). */
export function TokenPanelSlot() {
  return (
    <aside className="alt-panel alt-panel--tokens" aria-label="Tokens">
      <h2 className="alt-panel__title">Tokens</h2>
      <p className="alt-slot">The token panel mounts here.</p>
    </aside>
  );
}

/** Stream 3 — `@/components/studio/ToolInspector` (D-031). */
export function ToolInspectorSlot(): null {
  return null;
}

/** Stream 3 — `@/components/studio/WebMCPStatusBar` (D-158). Counts are rendered here meanwhile. */
export function StatusBarSlot() {
  const components = useComponentStore((s) => s.components.length);
  const pages = useLayoutStore((s) => s.renderedPages.length);
  return (
    <footer className="alt-statusbar" aria-label="Status">
      <span className="alt-slot">WebMCP status mounts here.</span>
      <span className="alt-statusbar__counts">
        {components} components · {pages} {pages === 1 ? 'page' : 'pages'}
      </span>
    </footer>
  );
}

/** Stream 4 — `@/components/canvas/WireframePreview` and `PagePreview` (§4.1, §4.4). */
export function WireframeViewSlot({ wireframe }: { wireframe: Wireframe }) {
  return (
    <div className="alt-slot alt-slot--canvas">
      {wireframe.title} · {wireframe.sections.length} sections · {wireframe.status}
      <br />
      The wireframe and page previews mount here.
    </div>
  );
}

/** Stream 2 — `@/components/canvas/ComponentGrid` (D-096). ComponentPreview already ships. */
export function ComponentGridSlot({ specs }: { specs: ComponentSpec[] }) {
  return (
    <div className="alt-specimens">
      {specs.map((spec) => (
        <ComponentPreview key={spec.id} spec={spec} />
      ))}
    </div>
  );
}
