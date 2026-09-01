// remove_component — phases 2, 3, 4 (mutating). D-025, D-028, D-138.
// Removing the second-to-last component can drop the studio back to phase 1, which is the
// point: the tool surface follows the state, and nothing is deleted to make that happen.
import type { ToolDefinition } from '@/types/webmcp';
import { useComponentStore } from '@/stores/componentStore';
import { detachComponentFromPage } from '@/webmcp/pending';
import { ok } from '@/webmcp/results';
import { notFound } from '@/webmcp/outcomes';
import { guard, requireString } from '@/webmcp/validate';

interface RemoveComponentData {
  id: string;
  wasInPage: string | null;
}

const tool: ToolDefinition<Record<string, unknown>, RemoveComponentData> = {
  name: 'remove_component',
  title: 'Remove Component',
  description: 'Delete a component by id. If it sits inside a rendered page, that page slot is emptied.',
  inputSchema: {
    type: 'object',
    properties: { componentId: { type: 'string', description: "The component's id, e.g. 'comp_a1b2c3d4'." } },
    required: ['componentId'],
    additionalProperties: false,
  },
  phases: [2, 3, 4],
  readOnly: false,
  untrusted: false,
  execute: (input) =>
    guard(() => {
      const id = requireString(input, 'componentId');
      const components = useComponentStore.getState();
      const index = components.list().findIndex((c) => c.id === id);
      if (index < 0) return notFound('component', id, components.ids(), 'list_components');

      const spec = components.remove(id)!;
      // D-138: the section keeps its shape and renders as emptied until the page is re-rendered.
      if (spec.pageId) detachComponentFromPage?.(spec.pageId, id);

      return ok(
        `Removed ${spec.type} ${id}.` +
          (spec.pageId ? ' Its page section is now empty until the page is re-rendered.' : ''),
        { id, wasInPage: spec.pageId },
        { kind: 'restore_component', spec, index },
      );
    }),
};
export default tool;
