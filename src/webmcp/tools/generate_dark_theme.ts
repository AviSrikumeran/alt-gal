// generate_dark_theme — phases 3, 4 (mutating). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'generate_dark_theme',
  title: 'Dark Theme',
  description:
    'Derive a dark-mode token set from the current light tokens and enable the theme toggle. Use it when the human asks for dark mode; contrast is preserved automatically.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [3, 4],
  readOnly: false,
  untrusted: false,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'generate_dark_theme is not implemented yet.' }), // STREAM 3
};
export default tool;
