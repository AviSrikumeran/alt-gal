/**
 * The engine seam for Stream 3's tools: the entry points the tools call that other streams own.
 *
 * Every export here was `null` while the owners were still in flight, and each caller degraded to
 * an honest "not wired yet" envelope. I-9: all seven owners have landed, so this module now binds
 * the real implementations and adapts the two whose shapes differ from the tool-facing contract.
 * The `NOT_WIRED` guards in the tools are gone with them.
 */
import type { ComponentSpec } from '@/types/components';
import type { ExportFile } from '@/types/export';
import type { ExportFormat } from '@/engine/export/snapshot';
import { collectExport } from '@/engine/export/snapshot';
import { buildExport } from '@/engine/export';
import { exportComponent } from '@/engine/export/react';

export type { AuditFinding, AuditScope } from '@/engine/accessibilityAuditor';
export { AUDIT_SCOPES, auditAccessibility } from '@/engine/accessibilityAuditor';

/**
 * The agent-facing format vocabulary, which is not the engine's: the tool's schema has said
 * `json` since Turn 1 (D-175) and the engine calls the same exporter `dtcg`. Renaming either
 * would change a published contract, so the two names are mapped here and nowhere else.
 */
export type TokenExportFormat = 'css' | 'json' | 'tailwind' | 'scss';
export const TOKEN_EXPORT_FORMATS: readonly TokenExportFormat[] = ['css', 'json', 'tailwind', 'scss'] as const;
const ENGINE_FORMAT: Record<TokenExportFormat, ExportFormat> = {
  css: 'css',
  json: 'dtcg',
  tailwind: 'tailwind',
  scss: 'scss',
};

export const exportTokens = (formats: TokenExportFormat[]): ExportFile[] =>
  buildExport(
    collectExport(),
    'tokens',
    formats.map((f) => ENGINE_FORMAT[f]),
  );

export const exportComponents = (): ExportFile[] => buildExport(collectExport(), 'components');

/** The engine's `page` scope emits every rendered page; the tool exports the one it was asked for. */
export const exportPage = (pageId: string): ExportFile[] => {
  const snap = collectExport();
  return buildExport({ ...snap, pages: snap.pages.filter((p) => p.id === pageId) }, 'page');
};

export const exportFullSystem = (): ExportFile[] => buildExport(collectExport(), 'everything');

/** `get_component_code` wants one file for one spec; the exporter is keyed by type (D-189). */
export const componentCode = (spec: ComponentSpec): { filename: string; code: string } => {
  const file = exportComponent(spec.type, collectExport().productName);
  return { filename: file.path.split('/').pop() ?? file.path, code: file.contents };
};
