// get_tokens — phases 0, 1, 2, 3, 4 (read-only). D-025, D-027, D-028.
// Never gated: reading what the human already chose is the precondition for not
// overwriting it, and that matters most in phase 0 when almost nothing is set.
import type { ToolDefinition } from '@/types/webmcp';
import type { TokenPath } from '@/types/tokens';
import { CATEGORY_TO_GROUP, TOKEN_CATEGORIES } from '@/types/tokens';
import { useTokenStore } from '@/stores/tokenStore';
import { ok } from '@/webmcp/results';
import { guard, keysForCategory, optionalEnum } from '@/webmcp/validate';

interface GetTokensData {
  tokens: Record<string, string | null>;
}

const tool: ToolDefinition<Record<string, unknown>, GetTokensData> = {
  name: 'get_tokens',
  title: 'Get Tokens',
  description:
    'List every design token with its current value, optionally one category. Use it before proposing changes so you build on the human choices instead of overwriting them.',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: [...TOKEN_CATEGORIES],
        description: 'Limit the result to one family of tokens. Omit for all of them.',
      },
    },
    additionalProperties: false,
  },
  phases: [0, 1, 2, 3, 4],
  readOnly: true,
  untrusted: false,
  execute: (input) =>
    guard(() => {
      const category = input.category === undefined ? null : optionalEnum(input, 'category', TOKEN_CATEGORIES, 'color');
      const all = useTokenStore.getState().getTokenMap();
      const tokens: Record<string, string | null> = {};
      if (category) {
        const group = CATEGORY_TO_GROUP[category]!;
        for (const key of keysForCategory(category)) {
          const path = `${group}.${key}` as TokenPath;
          tokens[path] = all[path] ?? null;
        }
      } else {
        Object.assign(tokens, all);
      }
      const defined = Object.values(tokens).filter(Boolean).length;
      return ok(
        `${defined} of ${Object.keys(tokens).length} ${category ?? 'design'} tokens are set.`,
        { tokens },
        null,
      );
    }),
};
export default tool;
