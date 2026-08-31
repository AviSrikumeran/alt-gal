// set_token — phases 0, 1, 2, 3, 4 (mutating). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'set_token',
  title: 'Set Token',
  description:
    "Set one design token, e.g. color 'primary' to 'hsl(250, 84%, 60%)'. Use it to define or change colors, fonts, type sizes, spacing, radius, elevation, or animation. Ask the human for their brand color before setting 'primary'; locked tokens cannot be changed.",
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [0, 1, 2, 3, 4],
  readOnly: false,
  untrusted: false,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'set_token is not implemented yet.' }), // STREAM 3
};
export default tool;
