import type { AgentLogEntry, InverseAction } from '@/types/log';
import { useLogStore } from '@/stores/logStore';

/**
 * The single path for every human UI mutation (D-077).
 *
 * `mutate` performs the store change and returns the inverse that undoes it (or null when the
 * action is not undoable, e.g. deleting a rendered page — D-184). Stores never log; tools are
 * logged by the registration wrapper; the human is logged here, once, with the same envelope
 * shape the log renders for both parties.
 */
export function commitHuman(
  action: string,
  mutate: () => InverseAction | null,
  input: Record<string, unknown> = {},
): AgentLogEntry {
  const startedAt = Date.now();
  const inverse = mutate();
  return useLogStore.getState().addEntry({
    actor: 'human',
    tool: action.startsWith('ui.') ? action : `ui.${action}`,
    input,
    result: null,
    status: 'ok',
    durationMs: Date.now() - startedAt,
    inverse,
  });
}
