// explain_component — phases 2, 3, 4 (read-only, untrusted content). D-025, D-028.
// The answer to "why does it look like this": every styled property, the token behind it,
// and that token's current value. Untrusted because it echoes authored content.
import type { ToolDefinition } from '@/types/webmcp';
import type { ComponentType } from '@/types/components';
import { getTokenMapping } from '@/engine/componentRenderer';
import { useComponentStore } from '@/stores/componentStore';
import { ok } from '@/webmcp/results';
import { notFound } from '@/webmcp/outcomes';
import { guard, requireString } from '@/webmcp/validate';

interface ExplainComponentData {
  id: string;
  type: ComponentType;
  properties: { property: string; token: string; value: string | null }[];
}

const tool: ToolDefinition<Record<string, unknown>, ExplainComponentData> = {
  name: 'explain_component',
  title: 'Explain Component',
  description:
    "Describe how a component is styled: which token drives each visual property and that token's current value. Use it to answer why something looks the way it does.",
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

      const properties = getTokenMapping(spec).map((m) => ({
        property: `${m.part}.${m.cssProperty}`,
        token: m.token,
        value: m.resolvedValue,
      }));
      const unset = properties.filter((p) => p.value === null).length;
      return ok(
        `${spec.variant} ${spec.size} ${spec.type} ${id} is styled by ${properties.length} token reference${properties.length === 1 ? '' : 's'}` +
          `${unset ? `, ${unset} of them still unset` : ''}.`,
        { id, type: spec.type, properties },
        null,
      );
    }),
};
export default tool;
