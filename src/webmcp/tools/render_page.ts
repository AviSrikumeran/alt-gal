// render_page — phases 3, 4 (mutating). D-025, D-028, D-053, D-140.
// The moment the studio is built around, so it is gated behind a wireframe the human has
// seen. Rendering a wireframe that already has a page re-renders it (D-140).
import type { ToolDefinition } from '@/types/webmcp';
import { useLayoutStore } from '@/stores/layoutStore';
import { renderPage } from '@/engine/layoutEngine';
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

      // I-9: Stream 4's engine owns the whole render, including D-140's implicit unrender of a
      // page the wireframe already had. It returns null only for an unknown wireframe id, which
      // the notFound above has already ruled out.
      const { page, componentIds, replaced } = renderPage(wireframeId, 'agent')!;

      return ok(
        `${replaced ? 'Re-rendered' : 'Rendered'} "${wireframe.title}" as ${page.sections.length} styled section${page.sections.length === 1 ? '' : 's'} built from ${componentIds.length} component${componentIds.length === 1 ? '' : 's'}.`,
        { pageId: page.id, wireframeId, componentIds, reRendered: replaced !== null },
        { kind: 'unrender_page', pageId: page.id, wireframeId, componentIds },
      );
    }),
};
export default tool;
