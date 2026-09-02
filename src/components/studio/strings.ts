/**
 * D-160: the complete and only source of studio UI strings.
 * Voice: direct, sentence case, no exclamation points, no emoji.
 */

export const WORDMARK = 'alt.gal';

export const PHASE_STEPS = ['Empty', 'Tokens', 'Components', 'Layout', 'Export'] as const;

export const S = {
  toolCount: (n: number, total: number) => `${n} of ${total} tools`,
  source: { native: 'native', polyfill: 'polyfill', none: 'unavailable' } as const,

  // token panel
  tokensTitle: 'Tokens',
  sections: {
    colors: 'Colors',
    typography: 'Typography',
    spacing: 'Spacing & radius',
    elevation: 'Elevation',
    motion: 'Motion',
    rules: 'Rules',
  } as const,
  emptyHex: 'Not set',
  primaryHint: 'Set primary to begin.',
  fillFromPrimary: 'Fill from primary',

  // canvas toolbar
  viewportDesktop: 'Desktop',
  viewportTablet: 'Tablet',
  viewportMobile: 'Mobile',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeDisabled: 'Generate a dark theme first.',
  addComponent: '+ Component',
  newWireframe: '+ New wireframe',
  renderPage: 'Render page',
  reRender: 'Re-render',
  deletePage: 'Delete page',
  exportLabel: 'Export',
  generateDark: 'Generate dark theme',
  regenerateDark: 'Regenerate dark theme',

  // component form (D-150)
  formType: 'Type',
  formVariant: 'Variant',
  formSize: 'Size',
  formLabel: 'Label',
  formCreate: 'Create',
  formCancel: 'Cancel',

  // canvas empty states (D-149)
  empty0Title: 'Nothing to render yet',
  empty0Body:
    'Set a primary color to unlock component tools — or open this page in an agent browser and ask it what it can do.',
  empty0Primary: 'Set primary color',
  empty0Secondary: 'Open Tool Inspector',
  empty1Body: (n: number) => `${n} more token${n === 1 ? '' : 's'} to unlock components.`,
  empty2Title: 'Your tokens are ready.',
  empty2Body: 'Generate a component from the + button, or ask your agent for one.',
  banner3: 'Sketch a wireframe to compose a page.',

  // log (§5.4)
  logTitle: 'Log',
  logFilters: { all: 'All', agent: 'Agent', human: 'You' } as const,
  logClear: 'Clear',
  logEmpty: 'No activity yet.',
  logEmptyPolyfill: 'Open this page in an agent browser to collaborate.',
  logNewPill: (n: number) => `↑ ${n} new`,
  undo: 'Undo',
  undoneTag: 'undone',
  viaInspector: 'via inspector',

  // human log verbs (D-160)
  human: {
    'ui.set_token': (t: string) => `You set ${t}`,
    'ui.remove_token': (t: string) => `You removed ${t}`,
    'ui.lock_token': (t: string) => `You locked ${t}`,
    'ui.generate_component': (t: string) => `You created ${t}`,
    'ui.modify_component': (t: string) => `You changed ${t}`,
    'ui.remove_component': (t: string) => `You removed ${t}`,
    'ui.sketch_wireframe': (t: string) => `You sketched ${t}`,
    'ui.modify_layout': () => 'You reordered sections',
    'ui.render_page': (t: string) => `You rendered ${t}`,
    'ui.delete_page': (t: string) => `You deleted page ${t}`,
    'ui.add_rule': () => 'You added a rule',
    'ui.remove_rule': () => 'You removed a rule',
    'ui.load_example': () => 'You loaded example tokens',
    'ui.undo': (t: string) => `You undid ${t}`,
  } as Record<string, (subject: string) => string>,

  // toasts
  overwriteToast: (role: string, was: string, now: string) => `Agent changed ${role} · was ${was}, now ${now}`,
  phaseDownToast: (n: number, group: string) => `Phase back to ${n} · ${group} tools paused`,
  undoBlocked: (reason: string) => `Can't undo — ${reason}`,
  persistReset: (store: string) => `Saved ${store} data couldn't be read and was reset.`,

  // status bar (D-158)
  statusNative: (n: number) => `${n} agent tools active · native`,
  statusPolyfill: (n: number) =>
    `${n} tools registered · polyfill — no agent is connected. Open in ChatGPT's browser or enable chrome://flags/#enable-webmcp-testing.`,
  statusNone: 'Agent tools unavailable — this page must be served over HTTPS.',
  statusCounts: (tokens: number, components: number, pages: number) =>
    `${tokens} tokens · ${components} components · ${pages} page${pages === 1 ? '' : 's'}`,
  toolInspector: 'Tool Inspector',

  // export panel (D-174)
  exportTitle: 'Export',
  exportTabs: { tokens: 'Tokens', components: 'Components', page: 'Page', everything: 'Everything' } as const,
  exportDownload: 'Download ZIP',
  exportCopy: 'Copy',
  exportCopied: 'Copied',
  exportFormats: {
    css: 'CSS variables',
    dtcg: 'DTCG JSON',
    tailwind: 'Tailwind config',
    scss: 'SCSS',
  } as const,

  // onboarding (D-156)
  onboardingBody:
    'Alternative Galaxy is a design studio for humans and AI agents. You set the tokens and the rules; an agent builds inside them, using only the tools the current phase allows.',
  onboardingDemo: 'Watch the 90-second demo',
  onboardingExample: 'Load example tokens',
  onboardingDismiss: 'Dismiss',

  // suggested prompts (D-159)
  prompts: [
    'What can you do on this page?',
    'Help me pick a palette for a fintech startup and set it up.',
    'Generate a hero and a pricing table, then sketch a landing page.',
  ],

  smallScreen: 'Alternative Galaxy is a desktop studio. Open it in a window at least 1024px wide.',

  // error boundary (D-205)
  errorTitle: 'Something broke in the studio.',
  errorBody: 'Your tokens, components, and log are saved. Reload to continue.',
  errorReload: 'Reload',
  errorReset: 'Reset workspace',
  resetConfirm: 'Reset the workspace? Tokens, components, pages, rules, and the log will be cleared.',
  resetYes: 'Reset',
  resetNo: 'Cancel',
  componentBroke: "This component couldn't render. Remove it or undo the last change.",

  // shortcuts sheet (D-207)
  shortcutsTitle: 'Keyboard shortcuts',
} as const;

/**
 * D-255 (audit fix #7): the demo link is hidden, not repointed. `alt.gal` is not deployed
 * (D-191 starts DNS separately) and D-201 puts the demo on an unlisted YouTube URL that does not
 * exist yet, so `alt.gal/#demo` has no owner and both call sites went nowhere. Restore by putting
 * the real URL here and uncommenting the two blocks that name `DEMO_URL`.
 */
// export const DEMO_URL = '';
