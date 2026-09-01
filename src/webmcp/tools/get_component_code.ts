// get_component_code — phases 2, 3, 4 (read-only, untrusted content). D-025, D-028, D-171.
// Shares the component window because it emits one component's source; the whole-library
// version is export_components at phase 4. Untrusted: the code carries authored content.
import type { ToolDefinition } from '@/types/webmcp';
import { useComponentStore } from '@/stores/componentStore';
import { componentCode } from '@/webmcp/pending';
import { ok } from '@/webmcp/results';
import { notFound } from '@/webmcp/outcomes';
import { guard, requireString } from '@/webmcp/validate';

interface GetComponentCodeData {
  id: string;
  filename: string;
  code: string;
}

const tool: ToolDefinition<Record<string, unknown>, GetComponentCodeData> = {
  name: 'get_component_code',
  title: 'Component Code',
  description:
    'Return the standalone React/TSX source for one component, styled with CSS variables. Use it when the human asks to see or copy the code.',
  inputSchema: {
    type: 'object',
    properties: { componentId: { type: 'string', description: "The component's id, e.g. 'comp_a1b2c3d4'." } },
    required: ['componentId'],
    additionalProperties: false,
  },
  phases: [2, 3, 4],
  readOnly: true,
  untrusted: true,
  execute: (input) =>
    guard(() => {
      const id = requireString(input, 'componentId');
      const components = useComponentStore.getState();
      const spec = components.get(id);
      if (!spec) return notFound('component', id, components.ids(), 'list_components');

      const { filename, code } = componentCode(spec);
      return ok(`${filename} — ${code.split('\n').length} lines of TSX for ${spec.type} ${id}.`, {
        id,
        filename,
        code,
      });
    }),
};
export default tool;
