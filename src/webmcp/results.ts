import type { ToolErrorCode, ToolOutcome, ToolResult } from '@/types/webmcp';
import type { Phase } from '@/types/phase';
import type { InverseAction } from '@/types/log';
import { toolsForPhase } from '@/webmcp/toolPhaseMap';

/** The error half of ToolOutcome — what `fail` and its helpers return. */
export type ToolError = Extract<ToolOutcome, { kind: 'error' }>;

/** Converts a tool outcome into the envelope the agent reads. Pure. */
export function toResult(outcome: ToolOutcome, phaseBefore: Phase, phaseAfter: Phase): ToolResult {
  if (outcome.kind === 'error') {
    return {
      ok: false,
      phase: phaseAfter,
      code: outcome.code,
      error: outcome.message,
      hint: outcome.hint,
      alternatives: outcome.alternatives,
    };
  }
  const before = new Set(toolsForPhase(phaseBefore));
  const after = new Set(toolsForPhase(phaseAfter));
  const newTools = [...after].filter((t) => !before.has(t));
  const removedTools = [...before].filter((t) => !after.has(t));
  const phaseChanged = phaseBefore !== phaseAfter;
  const summary = phaseChanged
    ? `${outcome.summary} Phase ${phaseBefore} → ${phaseAfter}. ${newTools.length ? `New tools: ${newTools.join(', ')}.` : ''}${removedTools.length ? ` Removed tools: ${removedTools.join(', ')}.` : ''}`.trim()
    : outcome.summary;
  return { ok: true, phase: phaseAfter, phaseChanged, newTools, removedTools, summary, data: outcome.data };
}

export const serialize = (r: ToolResult): string => JSON.stringify(r);

/**
 * The one error constructor (D-007). `outcomes.ts` re-exports this rather than defining a second.
 *
 * I-5: `code` was typed `ToolResult extends { code: infer C } ? C : never`. `ToolResult` is a
 * union and its ok-branch has no `code`, so the conditional collapsed to `never` and every call
 * was a type error — the reason Stream 3 wrote its own copy.
 */
export const fail = (
  code: ToolErrorCode,
  message: string,
  extra?: { hint?: string; alternatives?: string[] },
): ToolError => ({ kind: 'error', code, message, ...extra });

export const ok = <T>(summary: string, data?: T, inverse?: InverseAction | null): ToolOutcome<T> => ({
  kind: 'ok',
  summary,
  data,
  inverse: inverse ?? null,
});
