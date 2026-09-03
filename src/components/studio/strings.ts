/**
 * D-160: the complete and only source of studio UI strings.
 *
 * Voice (ALT_GAL_REBRAND.md §G, D-262): clipped, present-tense, competent, warm-not-cutesy.
 * UPPERCASE for system labels; sentence case for GAL's spoken lines. Never exclamation-spam —
 * celebration is reserved for clearance grants and launch.
 *
 * The human is the Director (DIR); the agent is GAL, Ground Assist Liaison.
 */

export const WORDMARK = 'alt.gal';

/** §G 2-6. The phase gate read as what it always was: a clearance ladder. */
export const PHASE_STEPS = ['PRELAUNCH', 'SYSTEMS CHECK', 'POWERED FLIGHT', 'ORBIT', 'DEEP SPACE'] as const;

/** Zero-padded clearance level, e.g. phase 2 -> "02". */
export const clearance = (phase: number): string => String(phase).padStart(2, '0');

/** §G 2-6, the full designation: "CLEARANCE 02 · POWERED FLIGHT". */
export const clearanceLabel = (phase: number): string =>
  `CLEARANCE ${clearance(phase)} · ${PHASE_STEPS[phase] ?? PHASE_STEPS[0]}`;

export const S = {
  // §G 7. The 4->24 growing tool set, spoken as instruments coming alive.
  toolCount: (n: number, total: number) => `${clearance(n)} OF ${clearance(total)} SYSTEMS ONLINE`,
  systemsOnline: (n: number) => `${clearance(n)} SYSTEMS ONLINE`,
  // D-247: 'detecting' is not 'unavailable'. detect.ts polls ~1.5s for an extension-injected
  // context before it falls back to the polyfill, and for that window the studio knows nothing.
  source: {
    native: 'ON CONSOLE',
    polyfill: 'STANDBY',
    none: 'NO CARRIER',
    detecting: 'ACQUIRING SIGNAL…',
  } as const,

  // token panel
  tokensTitle: 'INSTRUMENT RACK',
  sections: {
    colors: 'COLOUR',
    typography: 'TYPE',
    spacing: 'SPACING & RADIUS',
    elevation: 'ELEVATION',
    motion: 'MOTION',
    rules: 'FLIGHT RULES',
  } as const,
  emptyHex: 'UNSET',
  primaryHint: 'Set primary to begin.',
  fillFromPrimary: 'Fill from primary',

  // canvas toolbar
  viewportDesktop: 'Desktop',
  viewportTablet: 'Tablet',
  viewportMobile: 'Mobile',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeDisabled: 'Generate a dark theme first.',
  // §G 27. The console holds the frame; the colours in it are the human's.
  viewportCaption: 'VIEWPORT',
  viewportTooltip: 'THE VIEWPORT — your system, your colours. We just hold the frame.',
  addComponent: '+ INSTRUMENT',
  newWireframe: '+ NEW WIREFRAME',
  renderPage: 'RENDER PAGE',
  reRender: 'RE-RENDER',
  deletePage: 'DELETE PAGE',
  // §G 14. You do not export; you are cleared for launch.
  exportLabel: 'CLEAR FOR LAUNCH',
  generateDark: 'Generate dark theme',
  regenerateDark: 'Regenerate dark theme',

  // component form (D-150)
  formType: 'Type',
  formVariant: 'Variant',
  formSize: 'Size',
  formLabel: 'Label',
  formCreate: 'LOG INSTRUMENT',
  formCancel: 'CANCEL',

  // canvas empty states (D-149)
  // §G 8-9. The viewport is dark until the first instrument is logged.
  empty0Title: 'VIEWPORT DARK',
  empty0Body: 'AWAITING FIRST INSTRUMENT — log one, or ask GAL to.',
  empty0Primary: 'SET PRIMARY COLOUR',
  empty0Secondary: 'OPEN INSTRUMENT SPEC',
  empty1Body: (n: number) => `${n} more token${n === 1 ? '' : 's'} to clear the next level.`,
  empty2Title: 'RACK NOMINAL',
  empty2Body: 'Log an instrument from the + switch, or ask GAL for one.',
  banner3: 'Sketch a wireframe to compose a page.',

  // log (§5.4)
  // §E, §G 10-13. The log is the comms loop, burned to the flight recorder.
  logTitle: 'COMMS LOOP',
  logFilters: { all: 'ALL', agent: 'GAL', human: 'DIR' } as const,
  logClear: 'WIPE',
  logEmpty: 'COMMS LOOP OPEN · NO TRAFFIC YET',
  logEmptyPolyfill: 'Open this page in an agent browser and GAL comes on the loop.',
  logNewPill: (n: number) => `↑ ${n} NEW`,
  callsignHuman: 'DIR',
  callsignAgent: 'GAL',
  transmitting: 'GAL TRANSMITTING…',
  undo: 'ROLL BACK',
  undoneTag: 'rolled back',
  viaInspector: 'via inspector',

  // human log verbs (D-160)
  human: {
    'ui.set_token': (t: string) => `Set ${t}`,
    'ui.remove_token': (t: string) => `Pulled ${t}`,
    'ui.lock_token': (t: string) => `Locked ${t}`,
    'ui.generate_component': (t: string) => `Logged ${t}`,
    'ui.modify_component': (t: string) => `Trimmed ${t}`,
    'ui.remove_component': (t: string) => `Pulled ${t}`,
    'ui.sketch_wireframe': (t: string) => `Sketched ${t}`,
    'ui.modify_layout': () => 'Reordered sections',
    'ui.render_page': (t: string) => `Rendered ${t}`,
    'ui.delete_page': (t: string) => `Scrubbed page ${t}`,
    'ui.add_rule': () => 'Added a flight rule',
    'ui.remove_rule': () => 'Pulled a flight rule',
    'ui.load_example': () => 'Loaded example tokens',
    'ui.undo': (t: string) => `Rolled back ${t}`,
  } as Record<string, (subject: string) => string>,

  // toasts
  // §G 19, 22-24.
  overwriteToast: (role: string, was: string, now: string) => `GAL changed ${role} · was ${was}, now ${now}`,
  phaseDownToast: (n: number, group: string) => `CLEARANCE BACK TO ${clearance(n)} · ${group} systems sealed`,
  undoBlocked: (reason: string) => `TELEMETRY FAULT — can't roll that back: ${reason}`,
  persistReset: (store: string) => `Saved ${store} data couldn't be read and was reset.`,
  loggedToRecorder: 'LOGGED TO FLIGHT RECORDER',
  clearanceGranted: (phase: number) => `CLEARANCE ${clearance(phase)} GRANTED`,
  systemOnline: (tool: string) => `SYSTEM ONLINE — ${tool} is live.`,
  tokensOnBoard: 'COPY. Tokens on the board.',
  genericError: "TELEMETRY FAULT — didn't copy that. Re-transmit.",
  acquiring: 'ACQUIRING SIGNAL…',
  sealed: (phase: number) => `SEALED — CLEARANCE ${clearance(phase)} REQUIRED`,

  // status bar (D-158)
  // §E, §G 29-30.
  stationLeft: 'STATION alt.gal · GROUND CONTROL',
  statusNative: (n: number) => `${clearance(n)} systems live under GAL`,
  statusPolyfill: (n: number) =>
    `${clearance(n)} systems armed · no carrier — open in ChatGPT's browser or enable chrome://flags/#enable-webmcp-testing.`,
  statusNone: 'NO CARRIER — the station must be served over HTTPS for GAL to reach it.',
  statusDetecting: 'ACQUIRING SIGNAL…',
  statusCounts: (tokens: number, components: number, pages: number) =>
    `${tokens} tokens · ${components} instruments · ${pages} page${pages === 1 ? '' : 's'}`,
  galOnConsole: 'GAL: ON CONSOLE',
  galNoCarrier: 'GAL: NO CARRIER',
  toolInspector: 'INSTRUMENT SPEC',

  // agent-unavailable banner (D-244)
  unavailableTitle: 'GAL OFF-LINE · NO CARRIER. You have the console, Director.',
  unavailableCause: {
    'insecure-context':
      'This page is not a secure context. WebMCP is only exposed over https:// or on localhost — a LAN IP or a plain-http tunnel will never work.',
    'polyfill-failed': 'The WebMCP polyfill could not be installed, so document.modelContext was never created.',
    unknown: 'The browser exposed no document.modelContext and the polyfill did not install.',
  } as const,
  unavailableConsequence: 'No systems are armed. The rack, the viewport, and launch all still work — only GAL is gone.',
  unavailableRetry: 'RE-ACQUIRE',
  unavailableRetrying: 'ACQUIRING SIGNAL…',

  // component edit panel (D-189)
  editTitle: 'INSTRUMENT SPEC',
  editTabs: { edit: 'BENCH', why: 'WHY IT LOOKS LIKE THIS' } as const,
  editCopyCode: 'COPY CODE',
  editCopied: 'COPIED',
  editCopyFailed: 'CLIPBOARD BLOCKED',
  editClose: 'CLOSE',
  editUnset: 'unset',
  editPageOwned: 'Owned by the rendered page. Re-rendering replaces it.',
  editWhyIntro: (n: number) => `${n} styled propert${n === 1 ? 'y' : 'ies'}, each one a token reference.`,
  editWhyEmpty: 'This component references no tokens.',

  // export panel (D-174)
  exportTitle: 'CLEAR FOR LAUNCH',
  exportTabs: { tokens: 'TOKENS', components: 'INSTRUMENTS', page: 'PAGE', everything: 'EVERYTHING' } as const,
  exportDownload: 'LAUNCH',
  exportCopy: 'COPY',
  exportCopied: 'COPIED',
  exportLaunched: 'CLEARED FOR LAUNCH',
  exportFormats: {
    css: 'CSS variables',
    dtcg: 'DTCG JSON',
    tailwind: 'Tailwind config',
    scss: 'SCSS',
  } as const,

  // onboarding (D-156)
  // §G 1.
  onboardingTitle: "Welcome to the station, Director. GAL's on the loop.",
  onboardingBody:
    'alt.gal is a ground station for building design systems. You set the tokens and the flight rules; GAL builds inside them, running only the systems your clearance allows.',
  onboardingDemo: 'Watch the 90-second demo',
  onboardingExample: 'LOAD EXAMPLE TOKENS',
  exampleLoaded: 'COPY. Example tokens on the board — log an instrument to keep going.',
  onboardingDismiss: 'DISMISS',

  // suggested prompts (D-159)
  prompts: [
    'What can you do on this page?',
    'Help me pick a palette for a fintech startup and set it up.',
    'Generate a hero and a pricing table, then sketch a landing page.',
  ],

  smallScreen: 'alt.gal is a desktop station. Open it in a window at least 1024px wide.',

  // error boundary (D-205)
  errorTitle: 'TELEMETRY FAULT — the console dropped out.',
  errorBody: 'The flight recorder is intact. Tokens, instruments, and the loop are saved. Reload to continue.',
  errorReload: 'RELOAD',
  errorReset: 'SCRUB STATION',
  // §G 31.
  resetConfirm: "CONFIRM ABORT — this can't be un-flown. Tokens, instruments, pages, rules, and the loop all go.",
  resetYes: 'ABORT',
  resetNo: 'HOLD',
  componentBroke: "TELEMETRY FAULT — this instrument couldn't render. Pull it, or roll back the last change.",

  // shortcuts sheet (D-207)
  shortcutsTitle: 'CONSOLE SHORTCUTS',
} as const;

/**
 * D-255 (audit fix #7): the demo link is hidden, not repointed. `alt.gal` is not deployed
 * (D-191 starts DNS separately) and D-201 puts the demo on an unlisted YouTube URL that does not
 * exist yet, so `alt.gal/#demo` has no owner and both call sites went nowhere. Restore by putting
 * the real URL here and uncommenting the two blocks that name `DEMO_URL`.
 */
// export const DEMO_URL = '';
