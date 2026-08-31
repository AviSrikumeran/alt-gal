// export_components — phases 4 (read-only). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'export_components',
  title: 'Export Components',
  description:
    'Export every generated component as standalone React/TSX files using CSS variables. Files open in the export panel; you receive a file list.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [4],
  readOnly: true,
  untrusted: true,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'export_components is not implemented yet.' }), // STREAM 3
};
export default tool;
