// remove_rule — phases 1, 2, 3, 4 (mutating). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'remove_rule',
  title: 'Remove Rule',
  description: 'Delete a design rule by id. Use list_rules to find ids. Existing components are not changed.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [1, 2, 3, 4],
  readOnly: false,
  untrusted: false,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'remove_rule is not implemented yet.' }), // STREAM 3
};
export default tool;
