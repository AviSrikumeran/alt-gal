// export_tokens — phases 4 (read-only). D-025, D-028.
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'export_tokens',
  title: 'Export Tokens',
  description:
    "Export tokens as CSS variables, DTCG JSON, Tailwind config, or SCSS. Files open in the studio's export panel for the human to download; you receive a summary.",
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [4],
  readOnly: true,
  untrusted: false,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'export_tokens is not implemented yet.' }), // STREAM 3
};
export default tool;
