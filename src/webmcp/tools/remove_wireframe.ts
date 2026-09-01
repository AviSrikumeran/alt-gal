// remove_wireframe — phases 3, 4 (mutating). D-025, D-026, D-028, D-141, D-210.
// Added to the spec's 22 so the agent can clean up a sketch it proposed. It never touches
// a rendered page: deleting a page is the human's call, so a rendered wireframe is refused.
import type { ToolDefinition } from '@/types/webmcp';
import { useLayoutStore } from '@/stores/layoutStore';
import { ok } from '@/webmcp/results';
import { fail, notFound } from '@/webmcp/outcomes';
import { guard, requireString } from '@/webmcp/validate';

interface RemoveWireframeData {
  wireframeId: string;
}

const tool: ToolDefinition<Record<string, unknown>, RemoveWireframeData> = {
  name: 'remove_wireframe',
  title: 'Remove Wireframe',
  description:
    "Delete a wireframe by id. A wireframe with a rendered page can't be removed until the human deletes the page.",
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
      const id = requireString(input, 'wireframeId');
      const layouts = useLayoutStore.getState();
      const index = layouts.wireframes.findIndex((w) => w.id === id);
      if (index < 0)
        return notFound(
          'wireframe',
          id,
          layouts.wireframes.map((w) => w.id),
          'get_current_state',
        );

      const page = layouts.renderedPages.find((p) => p.wireframeId === id);
      if (page)
        return fail('INVALID_INPUT', `"${layouts.wireframes[index]!.title}" has a rendered page (${page.id}).`, {
          hint: 'Delete the rendered page first (human action) or render a different wireframe.',
        });

      const removed = layouts.removeWireframe(id)!;
      return ok(
        `Removed the wireframe "${removed.title}".`,
        { wireframeId: id },
        {
          kind: 'restore_wireframe',
          wireframe: removed,
          index,
        },
      );
    }),
};
export default tool;
