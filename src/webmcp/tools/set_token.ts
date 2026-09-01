// set_token — phases 0, 1, 2, 3, 4 (mutating). D-025, D-027, D-028.
// Available from phase 0 because it is one of the two ways out of it (the other is the
// declarative set_primary_color form); gating it would leave the agent unable to help.
import type { ToolDefinition } from '@/types/webmcp';
import { TOKEN_CATEGORIES } from '@/types/tokens';
import { useTokenStore } from '@/stores/tokenStore';
import { ok } from '@/webmcp/results';
import { fail, lockedToken } from '@/webmcp/outcomes';
import { guard, keysForCategory, requireString, resolveTokenPath } from '@/webmcp/validate';

interface SetTokenData {
  token: string;
  value: string;
  previous: string | null;
}

const tool: ToolDefinition<Record<string, unknown>, SetTokenData> = {
  name: 'set_token',
  title: 'Set Token',
  description:
    "Set one design token, e.g. color 'primary' to 'hsl(250, 84%, 60%)'. Use it to define or change colors, fonts, type sizes, spacing, radius, elevation, or animation. Ask the human for their brand color before setting 'primary'; locked tokens cannot be changed.",
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: [...TOKEN_CATEGORIES],
        description: "Which family the token belongs to, e.g. 'color', 'font-family', 'font-size'.",
      },
      key: {
        type: 'string',
        description:
          "The token within the category, e.g. 'primary' for color, 'heading' for font-family, 'base' for font-size.",
      },
      value: {
        type: 'string',
        description:
          "The new value. Colors accept hsl(), rgb() or hex, e.g. 'hsl(250, 84%, 60%)' or '#7c5cff'. Sizes are numbers of pixels, e.g. '16'. Fonts are family names, e.g. 'Inter'.",
      },
    },
    required: ['category', 'key', 'value'],
    additionalProperties: false,
  },
  phases: [0, 1, 2, 3, 4],
  readOnly: false,
  untrusted: false,
  execute: (input) =>
    guard(() => {
      const path = resolveTokenPath(input);
      const value = requireString(input, 'value');
      const tokens = useTokenStore.getState();

      if (tokens.isLocked(path)) {
        const group = path.split('.')[0]!;
        const unlocked = keysForCategory(input.category as string)
          .map((k) => `${group}.${k}`)
          .filter((p) => !tokens.locked.includes(p as typeof path));
        return lockedToken(path, unlocked);
      }

      const previous = tokens.getToken(path);
      if (!tokens.setToken(path, value))
        return fail('INVALID_INPUT', `"${value}" is not a valid value for ${path}.`, {
          hint: path.startsWith('color.')
            ? "Colors must be hsl(), rgb() or hex with no alpha, e.g. 'hsl(250, 84%, 60%)'."
            : 'Sizes, weights, line heights and durations are plain numbers; fonts and easings are strings.',
        });

      const stored = useTokenStore.getState().getToken(path) ?? value;
      return ok(
        `Set ${path} to ${stored}${previous ? ` (was ${previous})` : ''}.`,
        { token: path, value: stored, previous },
        { kind: 'restore_token', path, value: previous },
      );
    }),
};
export default tool;
