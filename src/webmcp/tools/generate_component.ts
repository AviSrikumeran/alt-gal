// generate_component — phases 2, 3, 4 (mutating). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'generate_component',
  title: 'Generate Component',
  description:
    "Create a component on the canvas — button, card, input, hero, navbar, pricing card and more — styled entirely from the human's tokens. Supply real content (label, headline, body) rather than relying on defaults. Rejected with alternatives if a rule forbids the request.",
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [2, 3, 4],
  readOnly: false,
  untrusted: false,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'generate_component is not implemented yet.' }), // STREAM 3
};
export default tool;
