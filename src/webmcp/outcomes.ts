import type { ToolOutcome } from '@/types/webmcp';
import type { ExportFile } from '@/types/export';
import { useUIStore } from '@/stores/uiStore';

/**
 * Shared outcome builders for tool bodies (D-007).
 *
 * I-5: `fail` and `ToolError` used to be defined here, because results.ts's `fail` typed its
 * `code` parameter as `ToolResult extends { code: infer C } ? C : never` — false for the union's
 * ok:true arm, so it collapsed to `never` and the function could not be called. results.ts now
 * types it `ToolErrorCode` and owns both; they are re-exported here so the tools' existing
 * `from '@/webmcp/outcomes'` imports keep working, and imported locally because the helpers
 * below build on them.
 */
import { fail } from '@/webmcp/results';
import type { ToolError } from '@/webmcp/results';
export type { ToolError };
export { fail };

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
