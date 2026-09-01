// render_page — phases 3, 4 (mutating). D-025, D-028, D-053, D-140.
// The moment the studio is built around, so it is gated behind a wireframe the human has
// seen. Rendering a wireframe that already has a page re-renders it (D-140).
import type { ToolDefinition } from '@/types/webmcp';
import type { RenderedPage } from '@/types/layouts';
import { generateId } from '@/utils/idGenerator';
import { useComponentStore } from '@/stores/componentStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { NOT_WIRED, renderWireframe } from '@/webmcp/pending';
import { ok } from '@/webmcp/results';
import { fail, notFound } from '@/webmcp/outcomes';
import { guard, requireString } from '@/webmcp/validate';

interface RenderPageData {
  pageId: string;
  wireframeId: string;
  componentIds: string[];
  reRendered: boolean;
}

const tool: ToolDefinition<Record<string, unknown>, RenderPageData> = {
  name: 'render_page',
  title: 'Render Page',
  description:
    "Turn an approved wireframe into a fully styled page built from the human's tokens and component library. Call it only after the human has approved the wireframe.",
  inputSchema: {
    type: 'object',
    properties: { wireframeId: { type: 'string', description: "The wireframe's id, e.g. 'wf_a1b2c3d4'." } },
    required: ['wireframeId'],
    additionalProperties: false,
  },
  phases: [3, 4],
  readOnly: false,
  untrusted: false,
  execute: (input) =>
    guard(() => {
      const wireframeId = requireString(input, 'wireframeId');
      const layouts = useLayoutStore.getState();
      const wireframe = layouts.getWireframe(wireframeId);
      if (!wireframe)
        return notFound(
          'wireframe',
          wireframeId,
          layouts.wireframes.map((w) => w.id),
          'get_current_state',
        );
      if (!wireframe.sections.length)
        return fail('INVALID_INPUT', `"${wireframe.title}" has no sections to render.`, {
          hint: 'Add sections with modify_layout, or sketch a new wireframe.',
        });

      if (!renderWireframe)
        return fail('INTERNAL', NOT_WIRED('Page rendering', 'Stream 4'), {
          hint: 'The human can still see the wireframe on the canvas; components generated so far are unaffected.',
        });

      // D-140: an existing page means re-render — drop the old page and its components first.
      const existing = layouts.renderedPages.find((p) => p.wireframeId === wireframeId);
      if (existing) {
        useComponentStore.getState().removeMany(existing.sections.flatMap((s) => s.componentIds));
        layouts.removeRenderedPage(existing.id);
      }

      const pageId = generateId('page');
      const render = renderWireframe(wireframe, pageId);
      for (const spec of render.specs) useComponentStore.getState().add(spec);

      const page: RenderedPage = {
        id: pageId,
        wireframeId,
        pageType: wireframe.pageType,
        title: wireframe.title,
        sections: render.sections,
        createdAt: Date.now(),
      };
      layouts.addRenderedPage(page);
      layouts.setWireframeStatus(wireframeId, 'rendered');

      const componentIds = render.specs.map((s) => s.id);
      return ok(
        `${existing ? 'Re-rendered' : 'Rendered'} "${wireframe.title}" as ${page.sections.length} styled section${page.sections.length === 1 ? '' : 's'} built from ${componentIds.length} component${componentIds.length === 1 ? '' : 's'}.`,
        { pageId, wireframeId, componentIds, reRendered: Boolean(existing) },
        { kind: 'unrender_page', pageId, wireframeId, componentIds },
      );
    }),
};
export default tool;
