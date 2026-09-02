/**
 * "Fill from primary" (D-104, D-107) as one function.
 *
 * The Colors-section button and the phase-1 empty-state CTA (`alt:fill-from-primary`) are the
 * same design action, so they are the same code path: the palette algorithm, the lock filter,
 * and the single log entry live here and are called twice, never forked.
 */
import { SEMANTIC_COLOR_ROLES } from '@/types/tokens';
import type { PaletteStrategy } from '@/utils/colorUtils';
import { generatePalette, parseColor } from '@/utils/colorUtils';
import { paletteToValues, useTokenStore } from '@/stores/tokenStore';
import { commitTokens } from './useTokenEditor';

/** false when there is no primary to fill from; the caller says so in its own voice. */
export function fillFromPrimary(strategy: PaletteStrategy = 'analogous'): boolean {
  const store = useTokenStore.getState();
  const primary = store.colors.primary ? parseColor(store.colors.primary) : null;
  if (!primary) return false;

  const locked = new Set(store.locked);
  const values = paletteToValues(generatePalette(primary, strategy));
  for (const role of SEMANTIC_COLOR_ROLES) {
    // The human's locks bind the fill too — one click should never overwrite a padlocked slot.
    if (locked.has(`color.${role}`)) delete values[`color.${role}`];
  }
  commitTokens('ui.fill_from_primary', values);
  return true;
}
