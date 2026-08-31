// get_component_code — phases 2, 3, 4 (read-only). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'get_component_code',
  title: 'Component Code',
  description:
    'Return the standalone React/TSX source for one component, styled with CSS variables. Use it when the human asks to see or copy the code.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [2, 3, 4],
  readOnly: true,
  untrusted: true,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'get_component_code is not implemented yet.' }), // STREAM 3
};
export default tool;
