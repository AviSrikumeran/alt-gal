// export_page — phases 4 (read-only). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'export_page',
  title: 'Export Page',
  description:
    'Export a rendered page as Page.tsx composing the exported components. Files open in the export panel; you receive a summary.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [4],
  readOnly: true,
  untrusted: true,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'export_page is not implemented yet.' }), // STREAM 3
};
export default tool;
