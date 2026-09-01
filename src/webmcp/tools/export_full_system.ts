// export_full_system — phase 4 (read-only, untrusted content). D-025, D-028, D-173, D-175.
// The last tool in the last phase: tokens in every format, the component library, the
// rendered pages, a README and a package.json — the whole thing as one download.
import type { ToolDefinition } from '@/types/webmcp';
import type { ExportSummary } from '@/webmcp/outcomes';
import { exportFullSystem } from '@/webmcp/pending';
import { exportDelivery } from '@/webmcp/outcomes';
import { guard } from '@/webmcp/validate';

const tool: ToolDefinition<Record<string, unknown>, ExportSummary> = {
  name: 'export_full_system',
  title: 'Export System',
  description:
    'Export everything — tokens in all formats, components, pages, README, package.json — as one downloadable bundle. Files open in the export panel; you receive a summary.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  phases: [4],
  readOnly: true,
  untrusted: true,
  execute: () =>
    guard(() => {
      return exportDelivery(exportFullSystem(), 'the complete design system');
    }),
};
export default tool;
