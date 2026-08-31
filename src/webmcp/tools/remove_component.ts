// remove_component — phases 2, 3, 4 (mutating). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'remove_component',
  title: 'Remove Component',
  description: 'Delete a component by id. If it sits inside a rendered page, that page slot is emptied.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [2, 3, 4],
  readOnly: false,
  untrusted: false,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'remove_component is not implemented yet.' }), // STREAM 3
};
export default tool;
