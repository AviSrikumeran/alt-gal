'use client';
/**
 * Local `commitHuman` shim, mirroring Stream 1's `components/tokens/_commit.ts`.
 *
 * D-077 puts the real executor in `src/engine/commit.ts`, which Stream 5 owns and
 * lands last. Stream 5 deletes this file at integration and repoints the two
 * imports in this directory at `@/engine/commit`. The signature is D-077's exactly,
 * so the swap is an import change and nothing else.
 */
import type { InverseAction } from '@/types/log';
import { useLogStore } from '@/stores/logStore';

export function commitHuman(action: string, mutate: () => InverseAction | null): void {
  const startedAt = Date.now();
  const inverse = mutate();
  useLogStore.getState().addEntry({
    actor: 'human',
    tool: action,
    input: {},
    result: null,
    status: 'ok',
    durationMs: Date.now() - startedAt,
    inverse,
  });
}
