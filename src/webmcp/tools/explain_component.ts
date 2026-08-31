// explain_component — phases 2, 3, 4 (read-only). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'explain_component',
  title: 'Explain Component',
  description:
    "Describe how a component is styled: which token drives each visual property and that token's current value. Use it to answer why something looks the way it does.",
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [2, 3, 4],
  readOnly: true,
  untrusted: true,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'explain_component is not implemented yet.' }), // STREAM 3
};
export default tool;
