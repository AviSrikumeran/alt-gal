// remove_wireframe — phases 3, 4 (mutating). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'remove_wireframe',
  title: 'Remove Wireframe',
  description:
    "Delete a wireframe by id. A wireframe with a rendered page can't be removed until the human deletes the page.",
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [3, 4],
  readOnly: false,
  untrusted: false,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'remove_wireframe is not implemented yet.' }), // STREAM 3
};
export default tool;
