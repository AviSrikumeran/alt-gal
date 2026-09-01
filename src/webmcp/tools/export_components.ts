// export_components — phase 4 (read-only, untrusted content). D-025, D-028, D-171, D-175.
// Phase 4 for the same reason as the other exports; untrusted because the emitted TSX
// carries the content the human and the agent wrote.
import type { ToolDefinition } from '@/types/webmcp';
import type { ExportSummary } from '@/webmcp/outcomes';
import { exportComponents } from '@/webmcp/pending';
import { useComponentStore } from '@/stores/componentStore';
import { exportDelivery, fail } from '@/webmcp/outcomes';
import { guard } from '@/webmcp/validate';

const tool: ToolDefinition<Record<string, unknown>, ExportSummary> = {
  name: 'export_components',
  title: 'Export Components',
  description:
    'Export every generated component as standalone React/TSX files using CSS variables. Files open in the export panel; you receive a file list.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  phases: [4],
  readOnly: true,
  untrusted: true,
  execute: () =>
    guard(() => {
      if (!useComponentStore.getState().count())
        return fail('INVALID_INPUT', 'There are no components to export.', {
          hint: 'Generate components first, or export_tokens for the token layer alone.',
        });
      return exportDelivery(exportComponents(), 'the component library');
    }),
};
export default tool;
