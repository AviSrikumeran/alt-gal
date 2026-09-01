import type { ToolErrorCode, ToolOutcome } from '@/types/webmcp';
import type { ExportFile } from '@/types/export';
import { useUIStore } from '@/stores/uiStore';

/**
 * Shared outcome builders for tool bodies.
 *
 * `results.ts` (seed, frozen) exports a `fail` whose first parameter resolves to `never`
 * — `ToolResult extends { code: infer C }` is false for the union's ok:true arm — so it
 * cannot be called. This is the same helper with the parameter typed as ToolErrorCode.
 * Fixing results.ts needs a ledger entry; until then tools import `fail` from here and
 * `ok` from results.ts (D-007).
 */
export type ToolError = Extract<ToolOutcome, { kind: 'error' }>;

export const fail = (
  code: ToolErrorCode,
  message: string,
  extra?: { hint?: string; alternatives?: string[] },
): ToolError => ({ kind: 'error', code, message, ...extra });

/** D-125: a missing id always answers with the current valid ids and the tool that lists them. */
export const notFound = (what: string, id: string, ids: string[], listTool: string): ToolError =>
  fail('NOT_FOUND', `There is no ${what} with id "${id}".`, {
    hint: ids.length ? `Call ${listTool} for the current ids.` : `No ${what}s exist yet.`,
    alternatives: ids,
  });

/** D-056, D-127: locked tokens answer with the unlocked paths in the same group. */
export const lockedToken = (path: string, unlocked: string[]): ToolError =>
  fail('LOCKED', `${path} is locked by the human, so it can't be changed.`, {
    hint: 'Ask the human to unlock it in the token panel, or work with another token.',
    alternatives: unlocked,
  });

/**
 * D-175: every export tool runs its exporter, stashes the files in the transient
 * `uiStore.exportFiles`, opens the panel, and returns a file list — never file contents.
 * `get_component_code` is the one tool that hands source back to the agent.
 */
export function exportDelivery(files: ExportFile[], what: string): ToolOutcome<ExportSummary> {
  const listed = files.map((f) => ({ path: f.path, lines: f.contents.split('\n').length }));
  const totalLines = listed.reduce((n, f) => n + f.lines, 0);
  useUIStore.getState().setExportFiles(files);
  useUIStore.getState().setExportOpen(true);
  return {
    kind: 'ok',
    summary: `Exported ${what}: ${listed.length} file${listed.length === 1 ? '' : 's'} (${totalLines.toLocaleString('en-US')} lines). The human can download them from the export panel.`,
    data: { files: listed, totalLines, note: 'Ready in the export panel.' },
    inverse: null,
  };
}

export interface ExportSummary {
  files: { path: string; lines: number }[];
  totalLines: number;
  note: string;
}
