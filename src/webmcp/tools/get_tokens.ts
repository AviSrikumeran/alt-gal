// get_tokens — phases 0, 1, 2, 3, 4 (read-only). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'get_tokens',
  title: 'Get Tokens',
  description:
    "List every design token with its current value, optionally one category. Use it before proposing changes so you build on the human's choices instead of overwriting them.",
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [0, 1, 2, 3, 4],
  readOnly: true,
  untrusted: false,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'get_tokens is not implemented yet.' }), // STREAM 3
};
export default tool;
