// list_components — phases 2, 3, 4 (read-only). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'list_components',
  title: 'List Components',
  description:
    'List every component on the canvas with id, type, variant, size, and label. Use it to find ids before modify_component or remove_component.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [2, 3, 4],
  readOnly: true,
  untrusted: true,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'list_components is not implemented yet.' }), // STREAM 3
};
export default tool;
