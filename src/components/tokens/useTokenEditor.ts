'use client';
/**
 * The token panel's write path (D-110, D-111, D-112). Every human mutation of a token goes
 * through here and is logged once, by `commitHuman` from `@/engine/commit` (D-077).
 *
 * I-2: this was `_commit.ts`, which carried a local `commitHuman` shim until Stream 5 landed the
 * real one. The shim is gone; only the token-editor code it wrapped remains.
 */
import { useRef } from 'react';
import type { InverseAction } from '@/types/log';
import type { TokenPath } from '@/types/tokens';
import { commitHuman } from '@/engine/commit';
import { applyToken, useTokenStore } from '@/stores/tokenStore';

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
