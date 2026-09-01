// export_tokens — phase 4 (read-only). D-025, D-028, D-175.
// The four export tools appear only once a page exists: exporting a design system before
// anything is built with it is the failure mode this studio is arguing against.
import type { ToolDefinition } from '@/types/webmcp';
import type { ExportSummary } from '@/webmcp/outcomes';
import { TOKEN_EXPORT_FORMATS, exportTokens } from '@/webmcp/pending';
import type { TokenExportFormat } from '@/webmcp/pending';
import { exportDelivery } from '@/webmcp/outcomes';
import { guard, optionalStringArray } from '@/webmcp/validate';
import { ToolInputError } from '@/types/webmcp';

const tool: ToolDefinition<Record<string, unknown>, ExportSummary> = {
  name: 'export_tokens',
  title: 'Export Tokens',
  description:
    'Export tokens as CSS variables, DTCG JSON, Tailwind config, or SCSS. Files open in the studio export panel for the human to download; you receive a summary.',
  inputSchema: {
    type: 'object',
    properties: {
      formats: {
        type: 'array',
        items: { type: 'string', enum: [...TOKEN_EXPORT_FORMATS] },
        description:
          'Which formats to write: css (CSS custom properties), json (DTCG), tailwind (tailwind.config.ts), scss. Defaults to all four.',
      },
    },
    additionalProperties: false,
  },
  phases: [4],
  readOnly: true,
  untrusted: false,
  execute: (input) =>
    guard(() => {
      const requested = optionalStringArray(input, 'formats', 4);
      for (const f of requested ?? [])
        if (!TOKEN_EXPORT_FORMATS.includes(f as TokenExportFormat))
          throw new ToolInputError(`"formats" must contain only: ${TOKEN_EXPORT_FORMATS.join(', ')} — got "${f}".`, [
            ...TOKEN_EXPORT_FORMATS,
          ]);
      const formats = (requested as TokenExportFormat[] | undefined) ?? [...TOKEN_EXPORT_FORMATS];

      return exportDelivery(exportTokens(formats), `tokens as ${formats.join(', ')}`);
    }),
};
export default tool;
