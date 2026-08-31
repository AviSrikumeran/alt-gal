// modify_layout — phases 3, 4 (mutating). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'modify_layout',
  title: 'Modify Layout',
  description:
    'Reorder, add, or remove sections in a wireframe by id. Returns the resulting section order so you can confirm it.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [3, 4],
  readOnly: false,
  untrusted: false,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'modify_layout is not implemented yet.' }), // STREAM 3
};
export default tool;
