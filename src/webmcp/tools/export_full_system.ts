// export_full_system — phases 4 (read-only). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'export_full_system',
  title: 'Export System',
  description:
    'Export everything — tokens in all formats, components, pages, README, package.json — as one downloadable bundle. Files open in the export panel; you receive a summary.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [4],
  readOnly: true,
  untrusted: true,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'export_full_system is not implemented yet.' }), // STREAM 3
};
export default tool;
