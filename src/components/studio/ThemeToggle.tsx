'use client';
import { useTokenStore } from '@/stores/tokenStore';
import { useUIStore } from '@/stores/uiStore';
import { deriveDarkTheme } from '@/utils/colorUtils';
import { commitHuman } from '@/engine/commit';
import { pushToast } from './toastStore';
import { S } from './strings';

/**
 * D-148 theme toggle plus D-189's `Generate dark theme` button — the UI path that keeps
 * `generate_dark_theme` a shared capability rather than an agent-only one.
 * The class itself is applied to the canvas root, never `<html>` (D-081).
 */
export default function ThemeToggle() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const hasDark = useTokenStore((s) => s.dark !== null);

  const generate = () => {
    const store = useTokenStore.getState();
    try {
      const previous = store.dark;
      const derived = deriveDarkTheme(store.colors);
      commitHuman('ui.generate_dark_theme', () => {
        useTokenStore.getState().setDark(derived);
        return { kind: 'restore_dark', previous };
      });
      setTheme('dark');
    } catch (error) {
      pushToast({ message: `Dark theme could not be derived: ${String(error)}`, tone: 'warn' });
    }
  };

  return (
    <div className="alt-group">
      <button
        type="button"
        className="alt-btn"
        data-icon="true"
        disabled={!hasDark}
        title={hasDark ? (theme === 'dark' ? S.themeLight : S.themeDark) : S.themeDisabled}
        aria-label={theme === 'dark' ? S.themeLight : S.themeDark}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <path
              d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M13 3l-1.5 1.5M4.5 11.5L3 13"
              stroke="currentColor"
              strokeWidth="1.3"
            />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M13 9.5A5.5 5.5 0 016.5 3a5.5 5.5 0 106.5 6.5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
            />
          </svg>
        )}
      </button>
      <button type="button" className="alt-btn" onClick={generate}>
        {hasDark ? S.regenerateDark : S.generateDark}
      </button>
    </div>
  );
}
