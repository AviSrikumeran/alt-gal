// list_components — phases 2, 3, 4 (read-only, untrusted content). D-025, D-028.
// Shares generate_component's window: before phase 2 there is nothing to list. Marked
// untrusted because the labels it echoes were written by the human or by another agent.
import type { ToolDefinition } from '@/types/webmcp';
import type { ComponentSummary } from '@/types/components';
import { COMPONENT_TYPES } from '@/types/components';
import { useComponentStore } from '@/stores/componentStore';
import { ok } from '@/webmcp/results';
import { guard, optionalEnum } from '@/webmcp/validate';

interface ListComponentsData {
  components: ComponentSummary[];
}

const tool: ToolDefinition<Record<string, unknown>, ListComponentsData> = {
  name: 'list_components',
  title: 'List Components',
  description:
    'List every component on the canvas with id, type, variant, size, and label. Use it to find ids before modify_component or remove_component.',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: [...COMPONENT_TYPES],
        description: 'Limit the result to one component type. Omit for all of them.',
      },
    },
    additionalProperties: false,
  },
  phases: [2, 3, 4],
  readOnly: true,
  untrusted: true,
  execute: (input) =>
    guard(() => {
      const type = input.type === undefined ? null : optionalEnum(input, 'type', COMPONENT_TYPES, 'button');
      const all = useComponentStore.getState().summaries();
      const components = type ? all.filter((c) => c.type === type) : all;
      const inPages = components.filter((c) => c.pageId !== null).length;
      return ok(
        components.length
          ? `${components.length} component${components.length === 1 ? '' : 's'}` +
              (inPages ? `, ${inPages} of them inside a rendered page.` : ' on the canvas.')
          : 'No components yet.',
        { components },
        null,
      );
    }),
};
export default tool;
