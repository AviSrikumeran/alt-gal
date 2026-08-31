// modify_component — phases 2, 3, 4 (mutating). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'modify_component',
  title: 'Modify Component',
  description:
    'Change an existing component by id: variant, size, label, or content. Rules are re-checked; a violating change is rejected with alternatives.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [2, 3, 4],
  readOnly: false,
  untrusted: false,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'modify_component is not implemented yet.' }), // STREAM 3
};
export default tool;
