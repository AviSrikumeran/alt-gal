// list_rules — phases 1, 2, 3, 4 (read-only). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'list_rules',
  title: 'List Rules',
  description: 'List active design rules in plain language with their ids and any current violations.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [1, 2, 3, 4],
  readOnly: true,
  untrusted: false,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'list_rules is not implemented yet.' }), // STREAM 3
};
export default tool;
