// add_rule — phases 1, 2, 3, 4 (mutating). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'add_rule',
  title: 'Add Rule',
  description:
    'Add a design constraint the human wants enforced, e.g. no danger-variant buttons or minimum radius 8px. Rules reject future generations and edits that violate them. Add rules only when the human asks for a constraint.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [1, 2, 3, 4],
  readOnly: false,
  untrusted: false,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'add_rule is not implemented yet.' }), // STREAM 3
};
export default tool;
