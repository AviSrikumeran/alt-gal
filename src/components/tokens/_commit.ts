'use client';
/**
 * Local `commitHuman` shim (D-077, §11.2 Stream 1). Stream 5 ships `@/engine/commit` and DELETES this
 * file at integration; the import sites change, the call shape does not — the signature here is the
 * ledger's, two arguments and nothing else.
 *
 * Stores never log (D-077). Human UI mutations are logged here; tool calls are logged by the
 * registration wrapper.
 */
import { useRef } from 'react';
import type { InverseAction } from '@/types/log';
import type { TokenPath } from '@/types/tokens';
import { useLogStore } from '@/stores/logStore';
import { applyToken, useTokenStore } from '@/stores/tokenStore';

export function commitHuman(action: string, mutate: () => InverseAction | null): void {
  const started = Date.now();
  const inverse = mutate();
  useLogStore.getState().addEntry({
    actor: 'human',
    tool: action,
    input: {},
    result: null,
    status: 'ok',
    durationMs: Date.now() - started,
    inverse,
  });
}

export interface TokenEditor {
  /** Capture the pre-drag value. Call on pointerdown/focus. */
  begin(): void;
  /** Mutate without logging — legal only while a drag is in progress (D-110, D-111). */
  live(value: string): void;
  /** Log the whole drag as one entry. Call on pointerup/blur/Enter. */
  end(): void;
  /** A discrete change: mutate and log in one step. Returns false if the value was rejected. */
  set(value: string): boolean;
  /** Clear back to unset (colors) or to the default (everything else). */
  remove(): void;
  /** Lock/unlock. Locks constrain the agent, not undo, so the entry carries no inverse (D-112). */
  setLocked(locked: boolean): void;
}

/** One token's write path. Every mutation in the panel goes through this. */
export function useTokenEditor(path: TokenPath): TokenEditor {
  const start = useRef<string | null>(null);
  const dragging = useRef(false);

  const restore = (value: string | null): InverseAction => ({ kind: 'restore_token', path, value });

  return {
    begin() {
      start.current = useTokenStore.getState().getToken(path);
      dragging.current = true;
    },
    live(value) {
      useTokenStore.getState().setToken(path, value);
    },
    end() {
      if (!dragging.current) return;
      dragging.current = false;
      const previous = start.current;
      start.current = null;
      if (useTokenStore.getState().getToken(path) === previous) return;
      commitHuman('ui.set_token', () => restore(previous));
    },
    set(value) {
      const store = useTokenStore.getState();
      const previous = store.getToken(path);
      if (!applyToken(store, path, value)) return false;
      commitHuman('ui.set_token', () => {
        useTokenStore.getState().setToken(path, value);
        return restore(previous);
      });
      return true;
    },
    remove() {
      const previous = useTokenStore.getState().getToken(path);
      commitHuman('ui.remove_token', () => {
        useTokenStore.getState().removeToken(path);
        return restore(previous);
      });
    },
    setLocked(locked) {
      commitHuman(locked ? 'ui.lock_token' : 'ui.unlock_token', () => {
        useTokenStore.getState().setLocked(path, locked);
        return null;
      });
    },
  };
}

/** Many tokens, one log entry — "Fill from primary" and "Load example tokens" (D-104, D-157). */
export function commitTokens(action: string, values: Partial<Record<TokenPath, string>>): void {
  const before = useTokenStore.getState();
  const snapshot: Partial<Record<TokenPath, string | null>> = {};
  for (const path of Object.keys(values) as TokenPath[]) snapshot[path] = before.getToken(path);
  commitHuman(action, () => {
    useTokenStore.getState().setMany(values);
    return { kind: 'restore_tokens', snapshot };
  });
}
