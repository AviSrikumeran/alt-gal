'use client';
/**
 * D-147: a token row the AGENT just changed flashes and scrolls into view. Rows the human changed
 * do not — the human already knows. The signal is the log, not the token store: only the log knows
 * who wrote a value.
 */
import { useEffect, useState } from 'react';
import type { AgentLogEntry } from '@/types/log';
import type { TokenPath } from '@/types/tokens';
import { SEMANTIC_COLOR_ROLES } from '@/types/tokens';
import { useLogStore } from '@/stores/logStore';

const FLASH_MS = 900;

/** Which token paths an agent entry touched, read from the tool input it was logged with. */
function pathsIn(entry: AgentLogEntry): TokenPath[] {
  if (entry.actor !== 'agent') return [];
  const input = entry.input;
  if (entry.tool === 'suggest_palette') return SEMANTIC_COLOR_ROLES.map((r) => `color.${r}` as TokenPath);
  if (entry.tool !== 'set_token' && entry.tool !== 'remove_token') return [];
  const category = typeof input.category === 'string' ? input.category : null;
  const key = typeof input.key === 'string' ? input.key : null;
  if (!category || !key) return [];
  // set_token's input is {category, key, value}; CATEGORY_TO_GROUP maps it back to a path (D-044).
  const group =
    category === 'color'
      ? 'color'
      : category === 'font-family'
        ? 'font'
        : category === 'font-size'
          ? 'fontSize'
          : category === 'font-weight'
            ? 'fontWeight'
            : category === 'line-height'
              ? 'lineHeight'
              : category === 'spacing-unit'
                ? 'spacing'
                : category === 'radius'
                  ? 'radius'
                  : category === 'elevation'
                    ? 'elevation'
                    : 'animation';
  return [`${group}.${key}` as TokenPath];
}

export function useAgentTouchedTokens(): ReadonlySet<TokenPath> {
  const [flashing, setFlashing] = useState<ReadonlySet<TokenPath>>(new Set());

  useEffect(() => {
    let timer = 0;
    const unsubscribe = useLogStore.subscribe((state, previous) => {
      if (state.entries.length <= previous.entries.length) return;
      const latest = state.entries[state.entries.length - 1];
      if (!latest) return;
      const paths = pathsIn(latest);
      if (paths.length === 0) return;
      setFlashing(new Set(paths));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setFlashing(new Set()), FLASH_MS);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  return flashing;
}
