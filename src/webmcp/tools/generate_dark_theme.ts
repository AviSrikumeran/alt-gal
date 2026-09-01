// generate_dark_theme — phases 3, 4 (mutating). D-025, D-028, D-057, D-164.
// Gated to phase 3: a dark set derived from a half-finished palette would be repaired
// against colors the human has not chosen yet. Writes tokenStore.dark, never uiStore.theme.
import type { ToolDefinition } from '@/types/webmcp';
import type { SemanticColorRole } from '@/types/tokens';
import { ON_COLOR_ROLES } from '@/types/tokens';
import { contrastRatio, deriveDarkTheme, onColor, parseColor } from '@/utils/colorUtils';
import { useTokenStore } from '@/stores/tokenStore';
import { ok } from '@/webmcp/results';
import { fail } from '@/webmcp/outcomes';
import { guard } from '@/webmcp/validate';

interface GenerateDarkThemeData {
  tokens: Record<string, string>;
  contrastFailures: string[];
}

const tool: ToolDefinition<Record<string, unknown>, GenerateDarkThemeData> = {
  name: 'generate_dark_theme',
  title: 'Dark Theme',
  description:
    'Derive a dark-mode token set from the current light tokens and enable the theme toggle. Use it when the human asks for dark mode; contrast is preserved automatically.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  phases: [3, 4],
  readOnly: false,
  untrusted: false,
  execute: () =>
    guard(() => {
      const tokens = useTokenStore.getState();
      const light = tokens.colors;
      if (!light.background || !light['text-primary'])
        return fail('INVALID_INPUT', 'There is no light palette to derive a dark theme from.', {
          hint: 'Set color.background and color.text-primary first, or call suggest_palette.',
        });

      const previous = tokens.dark;
      const dark = deriveDarkTheme(light);
      tokens.setDark(dark);

      // Report what the repair loop could not fix rather than silently shipping it (D-164).
      const contrastFailures: string[] = [];
      for (const role of ON_COLOR_ROLES) {
        const value = dark[role as SemanticColorRole];
        const parsed = value ? parseColor(value) : null;
        if (!parsed || !value) continue;
        if (contrastRatio(onColor(parsed), value) < 4.5) contrastFailures.push(`color.${role}`);
      }

      const set = Object.entries(dark).filter(([, v]) => v !== null);
      return ok(
        `Derived ${set.length} dark color${set.length === 1 ? '' : 's'} from the light palette. The human can switch themes from the canvas toolbar.` +
          (contrastFailures.length ? ` Still short of 4.5:1 on their own text: ${contrastFailures.join(', ')}.` : ''),
        { tokens: Object.fromEntries(set) as Record<string, string>, contrastFailures },
        { kind: 'restore_dark', previous },
      );
    }),
};
export default tool;
