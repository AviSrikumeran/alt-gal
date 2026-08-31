// get_current_state — phases 0, 1, 2, 3, 4 (read-only). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'get_current_state',
  title: 'Studio State',
  description:
    'Report where the design system stands: phase, defined tokens, components, wireframes, pages, active rules, locked tokens, and exactly which tools are available right now. Call it first in a session, and again whenever a tool you expected is missing.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [0, 1, 2, 3, 4],
  readOnly: true,
  untrusted: false,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'get_current_state is not implemented yet.' }), // STREAM 3
};
export default tool;
