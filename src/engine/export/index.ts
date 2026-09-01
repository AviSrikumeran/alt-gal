import type { ExportFile } from '@/types/export';
import type { ExportFormat, ExportScope, ExportSnapshot } from '@/engine/export/snapshot';
import { EXPORT_FORMATS, collectExport } from '@/engine/export/snapshot';
import { exportCss } from '@/engine/export/css';
import { exportDtcg } from '@/engine/export/dtcg';
import { exportTailwind } from '@/engine/export/tailwind';
import { exportScss } from '@/engine/export/scss';
import { exportComponents } from '@/engine/export/react';
import { exportPages } from '@/engine/export/page';
import { exportPackageJson, exportReadme } from '@/engine/export/readme';

export type { ExportFormat, ExportScope, ExportSnapshot } from '@/engine/export/snapshot';
export { EXPORT_FORMATS, EXPORT_SCOPES, collectExport, slugify, pascal, typesPresent } from '@/engine/export/snapshot';
export { downloadZip } from '@/engine/export/zip';
export { highlight } from '@/engine/export/highlight';

const TOKEN_EXPORTERS: Record<ExportFormat, (snap: ExportSnapshot) => ExportFile> = {
  css: exportCss,
  dtcg: exportDtcg,
  tailwind: exportTailwind,
  scss: exportScss,
};

/**
 * The one entry point every export path uses — the panel's tabs, the ZIP, and the four `export_*`
 * tools (D-175). Pure: it reads only the snapshot it is handed.
 *
 * Scope widens outward: components need the tokens that style them, a page needs the components
 * it composes. `tokens.css` is therefore present in every scope but `tokens` with css unchecked.
 */
export function buildExport(
  snap: ExportSnapshot,
  scope: ExportScope = 'everything',
  formats: readonly ExportFormat[] = EXPORT_FORMATS,
): ExportFile[] {
  const files: ExportFile[] = [];
  const wantsTokenFiles = scope === 'tokens' || scope === 'everything';

  if (wantsTokenFiles) {
    for (const format of EXPORT_FORMATS) if (formats.includes(format)) files.push(TOKEN_EXPORTERS[format](snap));
  } else {
    files.push(exportCss(snap)); // components and pages are unreadable without the variables
  }

  if (scope === 'components' || scope === 'page' || scope === 'everything') files.push(...exportComponents(snap));
  if (scope === 'page' || scope === 'everything') files.push(...exportPages(snap));

  files.push(exportReadme(snap), exportPackageJson(snap));
  return files;
}

/** Convenience for the `export_*` tools: collect, build, and report line counts (D-175). */
export function buildExportFromStores(
  scope: ExportScope = 'everything',
  formats: readonly ExportFormat[] = EXPORT_FORMATS,
): { files: ExportFile[]; totalLines: number } {
  const files = buildExport(collectExport(), scope, formats);
  return { files, totalLines: totalLines(files) };
}

export const linesOf = (file: ExportFile): number => file.contents.split('\n').length;
export const totalLines = (files: ExportFile[]): number => files.reduce((n, f) => n + linesOf(f), 0);
