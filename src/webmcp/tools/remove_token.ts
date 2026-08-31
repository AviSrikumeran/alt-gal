// remove_token — phases 1, 2, 3, 4 (mutating). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'remove_token',
  title: 'Remove Token',
  description:
    "Clear a token back to undefined. Components referencing it fall back to the studio's unset style. Prefer set_token with a new value unless the human explicitly wants the token gone.",
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [1, 2, 3, 4],
  readOnly: false,
  untrusted: false,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'remove_token is not implemented yet.' }), // STREAM 3
};
export default tool;
