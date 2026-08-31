// suggest_palette — phases 0, 1, 2, 3, 4 (mutating). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'suggest_palette',
  title: 'Suggest Palette',
  description:
    'Derive and apply a full 13-role color palette from one primary color using a harmony strategy. Use it when the human has a brand color and wants the rest filled in. Locked tokens are left unchanged.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [0, 1, 2, 3, 4],
  readOnly: false,
  untrusted: false,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'suggest_palette is not implemented yet.' }), // STREAM 3
};
export default tool;
