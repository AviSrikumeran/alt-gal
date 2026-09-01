// remove_token — phases 1, 2, 3, 4 (mutating). D-025, D-028.
// Absent in phase 0: there is nothing set to remove, and offering it there would invite
// the agent to "clear" tokens instead of setting the first one.
import type { ToolDefinition } from '@/types/webmcp';
import { TOKEN_CATEGORIES } from '@/types/tokens';
import { useTokenStore } from '@/stores/tokenStore';
import { useComponentStore } from '@/stores/componentStore';
import { getTokenMapping } from '@/engine/componentRenderer';
import { ok } from '@/webmcp/results';
import { lockedToken } from '@/webmcp/outcomes';
import { guard, keysForCategory, resolveTokenPath } from '@/webmcp/validate';

interface RemoveTokenData {
  token: string;
  previous: string | null;
  dependents: string[];
}

const tool: ToolDefinition<Record<string, unknown>, RemoveTokenData> = {
  name: 'remove_token',
  title: 'Remove Token',
  description:
    "Clear a token back to undefined. Components referencing it fall back to the studio's unset style. Prefer set_token with a new value unless the human explicitly wants the token gone.",
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: [...TOKEN_CATEGORIES],
        description: "Which family the token belongs to, e.g. 'color'.",
      },
      key: { type: 'string', description: "The token within the category, e.g. 'accent'." },
    },
    required: ['category', 'key'],
    additionalProperties: false,
  },
  phases: [1, 2, 3, 4],
  readOnly: false,
  untrusted: false,
  execute: (input) =>
    guard(() => {
      const path = resolveTokenPath(input);
      const tokens = useTokenStore.getState();

      if (tokens.isLocked(path)) {
        const group = path.split('.')[0]!;
        const unlocked = keysForCategory(input.category as string)
          .map((k) => `${group}.${k}`)
          .filter((p) => !tokens.locked.includes(p as typeof path));
        return lockedToken(path, unlocked);
      }

      const previous = tokens.getToken(path);
      // D-109/8.1: deletion is never blocked; the agent is told what it affects instead.
      const dependents = useComponentStore
        .getState()
        .list()
        .filter((spec) => getTokenMapping(spec).some((m) => m.token === path))
        .map((spec) => spec.id);

      tokens.removeToken(path);
      return ok(
        `Cleared ${path}${previous ? ` (was ${previous})` : ''}.` +
          (dependents.length
            ? ` ${dependents.length} component${dependents.length === 1 ? '' : 's'} referenced it and now render unset.`
            : ''),
        { token: path, previous, dependents },
        { kind: 'restore_token', path, value: previous },
      );
    }),
};
export default tool;
