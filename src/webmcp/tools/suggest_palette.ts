// suggest_palette — phases 0, 1, 2, 3, 4 (mutating). D-025, D-027, D-028, D-104.
// Never gated: filling 13 roles from one brand color is the fastest human-approved route
// out of phase 0, and it may jump 0 -> 2 in a single call (D-104). Locked roles are skipped.
import type { ToolDefinition } from '@/types/webmcp';
import type { SemanticColorRole, TokenPath } from '@/types/tokens';
import { SEMANTIC_COLOR_ROLES } from '@/types/tokens';
import { PALETTE_STRATEGIES, generatePalette, parseColor } from '@/utils/colorUtils';
import { useTokenStore } from '@/stores/tokenStore';
import { ok } from '@/webmcp/results';
import { fail } from '@/webmcp/outcomes';
import { guard, optionalEnum, optionalString } from '@/webmcp/validate';

interface SuggestPaletteData {
  primary: string;
  strategy: string;
  applied: Record<string, string>;
  skippedLocked: string[];
}

const tool: ToolDefinition<Record<string, unknown>, SuggestPaletteData> = {
  name: 'suggest_palette',
  title: 'Suggest Palette',
  description:
    'Derive and apply a full 13-role color palette from one primary color using a harmony strategy. Use it when the human has a brand color and wants the rest filled in. Locked tokens are left unchanged.',
  inputSchema: {
    type: 'object',
    properties: {
      primary: {
        type: 'string',
        description:
          "The brand color to build from, e.g. 'hsl(250, 84%, 60%)' or '#7c5cff'. Omit to use the primary already set.",
      },
      strategy: {
        type: 'string',
        enum: [...PALETTE_STRATEGIES],
        description:
          'How the partner colors relate to the primary: complementary (opposite), analogous (neighbouring, the default), triadic (evenly spaced), monochromatic (one hue).',
      },
    },
    additionalProperties: false,
  },
  phases: [0, 1, 2, 3, 4],
  readOnly: false,
  untrusted: false,
  execute: (input) =>
    guard(() => {
      const strategy = optionalEnum(input, 'strategy', PALETTE_STRATEGIES, 'analogous');
      const tokens = useTokenStore.getState();
      const raw = optionalString(input, 'primary') ?? tokens.getToken('color.primary');
      if (!raw)
        return fail('INVALID_INPUT', 'No primary color to build from.', {
          hint: "Ask the human for their brand color and pass it as `primary`, e.g. 'hsl(250, 84%, 60%)'.",
        });

      const parsed = parseColor(raw);
      if (!parsed)
        return fail('INVALID_INPUT', `"${raw}" is not a color this studio can read.`, {
          hint: "Use hsl(), rgb() or hex with no alpha, e.g. 'hsl(250, 84%, 60%)' or '#7c5cff'.",
        });

      const palette = generatePalette(parsed, strategy);
      const snapshot: Partial<Record<TokenPath, string | null>> = {};
      const values: Partial<Record<TokenPath, string>> = {};
      const applied: Record<string, string> = {};
      const skippedLocked: string[] = [];

      for (const role of SEMANTIC_COLOR_ROLES) {
        const path = `color.${role}` as TokenPath;
        if (tokens.isLocked(path)) {
          skippedLocked.push(path);
          continue;
        }
        snapshot[path] = tokens.getToken(path);
        values[path] = palette[role as SemanticColorRole];
        applied[path] = palette[role as SemanticColorRole];
      }
      tokens.setMany(values);

      const count = Object.keys(applied).length;
      return ok(
        `Applied a ${strategy} palette from ${raw}: ${count} color role${count === 1 ? '' : 's'} set` +
          `${skippedLocked.length ? `, ${skippedLocked.length} left locked` : ''}.`,
        { primary: raw, strategy, applied, skippedLocked },
        { kind: 'restore_tokens', snapshot },
      );
    }),
};
export default tool;
