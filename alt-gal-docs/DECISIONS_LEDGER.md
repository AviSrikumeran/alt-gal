# DECISIONS LEDGER — Alternative Galaxy
One line per decision. Never contradicted; only superseded with an explicit "supersedes D-xxx".

## Turn 1 — Protocol layer
D-001: API surface is `document.modelContext`. Verified: webmcp-types@0.1.5 declares only `Document.modelContext`; @mcp-b/webmcp-polyfill@5.1.0 installs document.modelContext and warns on navigator.modelContext (draft moved it 2026-05-27, webmcp PR #184); mace reads document first, navigator only as logged fallback. No navigator fallback in our code.
D-002: Tool registration is diff-based, not epoch-reset. On phase change compute want/have sets over TOOL_PHASE_MAP; abort only tools no longer valid; register only newly valid. Tools valid in both phases are untouched (no flicker, no spurious toolchange). ⚠️ SPEC CHANGE vs ALT_GAL_SPEC §6.1 step 2. Source: mace src/webmcp.js syncRegistration.
D-003: Controllers: one per-tool AbortController + one epoch AbortController composed via `AbortSignal.any([tool, epoch])`. Epoch aborts only on unmount or full reset. Per-tool aborts on diff removal.
D-004: Registration sync is deferred to the next macrotask (`setTimeout(0)`), coalesced. Never call sync inline from execute. Reason: Chrome 149–152 abort-at-registration cancels an in-flight execute (mace §5.2a, measured Chrome 151, 2026-08-29).
D-005: Every execute returns a JSON string: `JSON.stringify(ToolResult)`. Never a bare string, never an object, never an MCP content array. Defined in `src/webmcp/results.ts`.
D-006: ToolResult envelope: `{ ok:true, phase, phaseChanged, newTools:string[], removedTools:string[], summary:string, data? }` | `{ ok:false, phase, code, error, hint?, alternatives? }`. `code` ∈ `'INVALID_INPUT'|'NOT_FOUND'|'RULE_VIOLATION'|'LOCKED'|'PHASE_LOCKED'|'INTERNAL'`.
D-007: Tool authors never build envelopes. A tool's `execute(input)` returns `ToolOutcome` (`{kind:'ok', summary, data?, inverse?}` | `{kind:'error', code, message, hint?, alternatives?}`); the registration wrapper converts to ToolResult, computes phaseChanged/newTools/removedTools, logs, serializes.
D-008: execute never throws except `DOMException('Cancelled','AbortError')` when `options?.signal?.aborted` at entry. All other failures → `ok:false` envelope. (mace throws Errors; we don't — host behaviour on throw is undocumented.)
D-009: Every execute re-checks `def.phases.includes(currentPhase)` at entry and returns `PHASE_LOCKED` if not. Guards the abort-propagation window (Part 8.4).
D-010: `options` in execute may be undefined (polyfill passes only `input`). Always `options?.signal`.
D-011: Typings: `webmcp-types@0.1.5` (webmachinelearning org) via `tsconfig.compilerOptions.types`, plus local `src/types/webmcp-augment.d.ts` adding `executeTool` and `ontoolchange` typing gaps. Do not use `@mcp-b/webmcp-types`.
D-012: No hook package. `usewebmcp@5.1.0` and `use-webmcp-tool@0.2.0` are both one-tool-per-hook and hide the controller; use-webmcp-tool also wraps results in server-MCP `{content:[]}`. Raw `document.modelContext.registerTool` inside one custom hook.
D-013: Polyfill `@mcp-b/webmcp-polyfill@5.1.0` is loaded in ALL environments (dev and prod) via dynamic import when `document.modelContext` is absent. It is idempotent and never replaces a native context. Reason: judges without a WebMCP browser still see tools appear/disappear in the Tool Inspector via `executeTool`.
D-014: WebMCP source detection: `src/webmcp/detect.ts` exports `ensureModelContext(): Promise<'native'|'polyfill'|'none'>`. `native` = `document.modelContext` existed before we loaded anything; `polyfill` = we installed it; `none` = not a secure context. Stored in `useWebMCPStatusStore`.
D-015: Registration failures are non-fatal. Each `registerTool` is try/caught; a rejection marks `useWebMCPStatusStore.degraded=true` with the tool name and error, and the human UI keeps working. Reason: mace observed ChatGPT's in-app browser throwing TypeError from registerTool (2026-08-30).
D-016: Tool count read from `document.modelContext.getTools()` inside a `toolchange` listener, never tracked manually. Phase indicator and agent log subscribe to `useWebMCPStatusStore.toolCount`.
D-017: Hook location: `src/webmcp/WebMCPBridge.tsx` ('use client', renders null) mounted once as a sibling in `src/app/layout.tsx` `<body>`. It runs `ensureModelContext()` then mounts `<Registrar/>` which calls `useWebMCPRegistration()`. Never wraps children.
D-018: Strict-mode safety: hook uses one `useEffect(..., [])`; cleanup aborts the epoch and clears the registered map; every `await` in the sync loop is followed by `if (epoch.signal.aborted) return;`; AbortError rejections from registerTool are swallowed.
D-019: Schemas are static per tool. No state-derived enums (no component-ID enums). IDs are `string` inputs validated at execute; `NOT_FOUND` errors list current valid IDs. Reason: state-derived schemas force re-registration on every mutation (mace's schemaSig churn); we don't need it.
D-020: Enums use plain JSON Schema `enum` arrays with readable labels in the property `description`. Not `oneOf/const/title`. Reason: OpenAI function-calling strict mode does not accept `oneOf`; mace and shipwright both use `enum`.
D-021: Every inputSchema has `type:'object'` and `additionalProperties:false`. No `examples` field.
D-022: Tool descriptions do not mention phases or unlock conditions. Only `get_current_state` describes the phase system. Absence is the signal; phase narration lives in envelopes.
D-023: Tool description format: ≤300 chars; sentence 1 = what it does; sentence 2 = when to use it; sentence 3 (optional) = prerequisite or common mistake.
D-024: Every tool has a `title` (human display name, Title Case, ≤4 words). Lighthouse's "Registered WebMCP tools" audit and the Tool Inspector render it.
D-025: `annotations.readOnlyHint:true` on exactly: get_current_state, get_tokens, list_rules, list_components, explain_component, get_component_code, audit_accessibility, export_tokens, export_components, export_page, export_full_system. `untrustedContentHint:true` on exactly: list_components, explain_component, get_component_code, export_components, export_page, export_full_system (they echo human/agent-authored content).
D-026: Tool set is 24 imperative + 1 declarative. Imperative adds `remove_rule` (phase 1+) and `remove_wireframe` (phase 3+) to the spec's 22. ⚠️ SPEC CHANGE.
D-027: `set_token`, `get_tokens`, `suggest_palette` are available from phase 0. ⚠️ SPEC CHANGE (spec had them at phase 1+, which made the agent unable to help leave phase 0).
D-028: Phase 1 adds `remove_token`, `add_rule`, `remove_rule`, `list_rules`. Phase 2 adds the six component tools. Phase 3 adds `sketch_wireframe`, `modify_layout`, `remove_wireframe`, `render_page`, `generate_dark_theme`, `audit_accessibility`. Phase 4 adds the four `export_*`.
D-029: Declarative API used for exactly one tool: `set_primary_color`, a `<form toolname="set_primary_color">` in the token panel with NO `toolautosubmit`. Agent fills, human clicks Apply. It is the human-ratified path out of phase 0; `set_token` is the imperative path. Always present (never gated).
D-030: Declarative form submit handler: `if (event.agentInvoked) { event.preventDefault(); ...; event.respondWith(Promise.resolve(JSON string envelope)) }`. Same envelope shape as imperative tools.
D-031: Tool Inspector (Part 8.7 "dev panel") is a shipped product feature, not dev-only: lists `getTools()`, calls `executeTool(tool, JSON.stringify(input))` with object fallback if the string form throws (mace runTool pattern, Chrome 151 wants string; webmcp#243 moves to object).
D-032: Phase recalculation is synchronous inside every mutating store action (last line of the action). Tool executes contain no `await` between the phase check and the store mutation. No mutex, no queue.
D-033: `get_current_state` returns full token values (role→value map, ~60 short strings), component summaries `{id,type,variant,size,label}` not full specs, wireframe summaries `{id,name,status,sectionCount}`, page summaries `{id,wireframeId}`, rules in plain language, current violations, locked token names, `availableTools`, `nextPhase:{phase,requirement,missing:string[]}`, and one `suggestedNext` string.
D-034: `suggestedNext` is a single sentence, present in `get_current_state` only, never in other envelopes.
D-035: `generate_component` success `data` = `{ id, type, variant, size, tokensUsed: Record<cssProperty, tokenName> }`. Resolved values are NOT included (use `explain_component`).
D-036: Import alias `@/` = `src/`. Mandated in tsconfig `paths`. Relative imports only within the same directory.
D-037: Anything outside React (tool executes, algorithms) reads stores via `useXStore.getState()`; React components use the hook form. Never call a hook outside a component.
D-038: Log timestamps are Unix ms (`Date.now()`), formatted at render.
D-039: File layout for the protocol layer: `src/webmcp/{detect.ts,results.ts,toolPhaseMap.ts,registry.ts,useWebMCPRegistration.ts,WebMCPBridge.tsx,inspector.ts}`, `src/webmcp/tools/<tool_name>.ts` (one file per tool, default export `ToolDefinition`), `src/stores/webmcpStatusStore.ts`, `src/types/webmcp-augment.d.ts`.
D-040: `ToolDefinition = { name, title, description, inputSchema, phases: readonly Phase[], readOnly: boolean, untrusted?: boolean, execute(input: Record<string,unknown>): ToolOutcome }`. Defined in `src/types/webmcp.ts` (project type, distinct from the ambient WebMCP namespace).
D-041: Day-1 blocker test (before any stream starts): open alt.gal (or localhost tunnel) in ChatGPT's in-app browser; confirm (a) registerTool does not throw, (b) a tool registered after page load is visible to the agent without reload. If (b) fails, demo fallback is Chrome + Model Context Tool Inspector extension, and the README says so.
D-042: Secure context required: if `!window.isSecureContext`, source = 'none' and no polyfill is loaded (matches shipwright).
D-043: `exposedTo` and `fromOrigins` are never used. Documented in ARCHITECTURE.md as deliberately unused (single origin).

Total: 43

## Turn 2 — Integration contract and boundary files
D-044: Token identity is a dotted `TokenPath` string `<group>.<key>`. Groups: `color`, `font`, `fontSize`, `fontWeight`, `lineHeight`, `spacing`, `radius`, `elevation`, `animation`. `set_token` input `{category,key,value}` maps category→group via `CATEGORY_TO_GROUP` in `src/types/tokens.ts`.
D-045: 13 SemanticColorRoles unchanged from spec. Both `muted` (fills: disabled backgrounds, dividers, tertiary surfaces) and `text-muted` (tertiary text) are kept.
D-046: On-colors are derived, not stored. `tokenToCss` emits `--color-on-{primary,secondary,accent,danger,warning,success}`: if the role's L > 60 → `hsl(h, 15%, 10%)`, else `hsl(h, 10%, 98%)`. Components use `var(--color-on-primary)` etc. ⚠️ SPEC CHANGE (spec referenced `--color-text-on-primary` without defining it).
D-047: `definedTokenCount` = non-null colors + number of non-color paths in `TokenState.touched`. Defaults never count. ⚠️ SPEC CHANGE (spec's count rule put a fresh load in phase 1).
D-048: Phase rule, highest match wins: 4 if renderedPages ≥ 1; 3 if components ≥ 2; 2 if definedTokenCount ≥ 5 AND `color.primary`, `color.background`, `color.text-primary` all non-null; 1 if definedTokenCount ≥ 1; else 0. `nextPhase.missing` names the specific unmet items.
D-049: Phase recalculation is a synchronous Zustand subscriber installed by `phaseStore` on token/component/layout stores at module load. Domain stores never import `phaseStore`. Supersedes D-032's "last line of every action" wording; the synchronous guarantee stands.
D-050: Module dependency graph, strictly acyclic: `types` ← `utils` ← `engine` ← `stores` ← `webmcp` ← `components`. `phaseStore` imports token/component/layout stores. `engine/ruleEngine.ts` imports `engine/componentRenderer.ts` and reads stores via `getState()`. Only `webmcp/**`, `components/studio/**`, `components/canvas/**` import `phaseStore`.
D-051: `ComponentSpec = { id, type, variant, size, content: ComponentContent, pageId: string|null, sectionId: string|null, createdBy, createdAt }`. `props`, `children`, `label`, `placeholder` removed. ⚠️ SPEC CHANGE.
D-052: Compound components use typed slots (`ComponentContentMap[type]`), never child arrays.
D-053: `render_page` creates real `ComponentSpec`s in `componentStore` with `pageId`/`sectionId` set; `RenderedSection.componentIds` references them. Page-owned components count toward the phase component count and are addressable by `modify_component`/`remove_component`.
D-054: Multiple wireframes allowed. `layoutStore.activeWireframeId`; canvas shows the active one; `sketch_wireframe` makes the new one active.
D-055: `WireframeSection = { id, type, label, columns }` — array order is order, box height derived from type in `wireframeEngine`. `RenderedSection = { sectionId, type, columns, componentIds }`.
D-056: Token locks: `TokenState.locked: TokenPath[]`. `set_token`, `remove_token`, `suggest_palette` return `LOCKED` for locked paths (palette skips them and reports `skippedLocked`). UI toggles a lock per token.
D-057: Dark theme stored as `TokenState.dark: Record<SemanticColorRole, string|null> | null`. Active theme is `uiStore.theme`.
D-058: `uiStore` (Stream 5): `viewport: 'desktop'|'tablet'|'mobile'`, `theme: 'light'|'dark'`, `selectedComponentId`, `exportOpen`, `inspectorOpen`, `onboardingDismissed`.
D-059: `RuleCondition = { target: ComponentType|'all', property: RuleProperty, operator: 'equals'|'not-equals'|'min'|'max'|'not-contains'|'hue-not-in', value: string }`. `hue-not-in` value is `"start-end"` in degrees, wrapping allowed (`"350-10"`). `RuleProperty` is an enumerated union. `enabled` replaces the spec's `active`.
D-060: `AgentLogEntry = { id, timestamp, actor: 'agent'|'human', tool, input, result, status, durationMs, phase, inverse, undone }`. Human UI actions are logged with `tool = 'ui.<action>'`. Undo itself is logged as a human entry `ui.undo` with `inverse: null`.
D-061: `InverseAction` is a 12-member discriminated union in `src/types/log.ts`. Executor is `src/engine/undo.ts` (Stream 5). Per-tool payload rules are Turn 6.
D-062: `COMPONENT_REGISTRY: Record<ComponentType, React.ComponentType<LibraryComponentProps>>`, `LibraryComponentProps = { spec: ComponentSpec; selected?: boolean }`. Canvas renders `const C = COMPONENT_REGISTRY[spec.type]; <C spec={spec} />`.
D-063: Styling: inline styles for token-driven properties from `getStyles(spec, part)` (default state only); hover/focus/active/disabled/error states live in `src/components/library/library.css` via attribute selectors `[data-alt][data-variant][data-size][data-state]` that reference the same CSS vars. Export emits both.
D-064: `componentRenderer.ts` exports `STYLE_DICTIONARY: Record<ComponentType, ComponentStyleDef>`, `getStyles(spec, part)`, `getTokenMapping(spec)`. `ComponentStyleDef = { parts: readonly string[]; styles(spec): Record<string, CSSProperties>; tokens(spec): Record<string, TokenPath> }`.
D-065: CSS var references in library components are always `var(--x)` with no fallback argument. Null-token behaviour is handled once in `tokenToCss` (sentinel decided Turn 4).
D-066: Font family token values are bare family names (`'Inter'`); `tokenToCss` appends the fallback stack from `FONT_CATALOG` in `src/utils/fonts.ts`.
D-067: `generateId(prefix)` = `${prefix}_${crypto.randomUUID().replace(/-/g,'').slice(0,8)}`; `IdPrefix = 'comp'|'wf'|'sec'|'page'|'rule'|'log'`.
D-068: Persistence: token, component, layout, rule, log stores use zustand `persist` with name `altgal.<store>.v1`, `version: 1`, `storage: localStorage`. `webmcpStatusStore` and `uiStore` do not persist (except `uiStore.onboardingDismissed`). Corrupt reads reset to defaults (Turn 6).
D-069: Library components accept no `className`, `style`, or `children` props. Spec-driven only.
D-070: `'use client'` is required in: every file under `src/components/**` (except `library/index.ts`, `library/library.css`), `src/webmcp/WebMCPBridge.tsx`, `src/webmcp/useWebMCPRegistration.ts`. `src/app/layout.tsx` and `src/app/page.tsx` are server components. Stores, engine, utils, types carry no directive.
D-071: Streams: 1 Tokens, 2 Components, 3 WebMCP, 4 Layouts, 5 Studio UI + undo + export panel. Ownership table in Part Eleven §11.2 is authoritative.
D-072: Merge order: seed → Streams 1 and 2 in parallel → Streams 3 and 4 in parallel → Stream 5. Stream 2 depends on Stream 1 only through CSS var names, not implementations.
D-073: Seed commit runs `pnpm create next-app@latest` (TypeScript, App Router, `src/`, `@/*` alias, ESLint, no Tailwind) and adds `zustand@^5`, `jszip@^3`, `@mcp-b/webmcp-polyfill@5.1.0`, dev `webmcp-types@0.1.5`, `vitest`, `@playwright/test`. Resolved versions are whatever the seed lockfile records. No stream adds a dependency without a ledger entry.
D-074: Tests: vitest for `utils/**` and `engine/**`; Playwright smoke for `webmcp/**` using a fake `document.modelContext` fixture (shipwright pattern). Tests live in `src/**/__tests__/`.
D-075: `generate_component` input is flat: `type, variant?, size?, label?, description?, items?: string[]`. `contentFromInput(type, input)` in `src/components/library/content.ts` (Stream 2) maps label → primary text slot, description → secondary text slot, items → list slot, filling the rest from `DEFAULT_CONTENT[type]`.
D-076: Input validation is manual (no schema library): `src/webmcp/validate.ts` exports `requireString`, `optionalString`, `requireEnum`, `optionalEnum`, `optionalNumber`, `optionalStringArray`; each throws `ToolInputError` which the wrapper maps to `INVALID_INPUT` with the message. Messages list valid values (mace pattern).
D-077: Human UI mutations go through `commitHuman(action: string, mutate: () => InverseAction|null)` in `src/engine/commit.ts` (Stream 5), which runs the mutation and logs a human entry. Stores never log. Tools log via the wrapper.
D-078: Beyond scope until after Sept 3: multi-user, backend persistence, auth, drag-and-drop on canvas, Figma import/export, user-defined component types, version history/branching, team libraries, marketplace, AI imagery. Any PR touching these is closed.
D-079: `src/types/webmcp-declarative.d.ts` is Chrome's `demos/shared/types/webmcp-declarative.d.ts` copied verbatim with its Apache-2.0 header.
D-080: Colors are normalized at the store boundary: `tokenStore.setToken` runs `parseColor` → `toHSLString` and stores `hsl(H, S.S%, L.L%)` with integer H and one-decimal S/L. Hex/rgb/space-syntax hsl are accepted as input, never stored.
D-081: The `.dark` class is applied to the canvas root element, never `<html>` or `<body>`, so the studio chrome never inherits the user's dark theme.
D-082: Spacing multipliers `[1,2,3,4,5,6,8,10,12,16]` are fixed; the human edits only `spacing.unit`. CSS vars are `--spacing-<multiplier>`.
D-083: Amends D-050: `logStore` may import `phaseStore` for a call-time read (`getState().currentPhase`) when stamping entries; `phaseStore` never imports `logStore`. Graph stays acyclic.
D-084: Seed ships `src/components/library/Placeholder.tsx` mapped for all 16 registry entries and stub `STYLE_DICTIONARY`/`DEFAULT_CONTENT`; Stream 2 replaces them and deletes Placeholder.tsx.

## Turn 3 — Component system
D-085: Component responsiveness uses CSS container queries against the canvas root (`container: canvas / inline-size`), never media queries. `library.css` breakpoints: 640px (mobile), 900px (tablet grid). Export README instructs consumers to set the container on their page root.
D-086: Variant = accent role. `VARIANT_ROLE` {primary→primary, secondary→secondary, ghost→primary, danger→danger, outline→primary}; `VARIANT_FILL` {primary,secondary,danger→solid; ghost,outline→transparent}. Solid = role bg + `--color-on-<role>` text. Outline = 1px role border. Ghost = hover tint via color-mix. All components interpret variant only through these maps.
D-087: Size convention. Controls: sm = spacing-2/spacing-3/fontSize.sm; md = spacing-3/spacing-5/fontSize.base; lg = spacing-4/spacing-6/fontSize.md (block/inline/text). Containers: sm/md/lg padding = spacing-4/6/8, gap one step below. Sections: navbar block spacing-4, hero spacing-16 (sm spacing-10), footer/feature-grid spacing-12; inline spacing-8.
D-088: Typography mapping. `font.heading`: hero headline, card title, pricing tier/price, feature title, modal title, navbar/footer brand, avatar initials. `font.body`: all else. `font.mono`: never in components. Weights: headings semibold, hero/prices bold, buttons semibold, labels medium, body regular. Line heights: headlines tight, body normal, long body relaxed.
D-089: Radius: controls radius.md; badge/avatar/toggle radius.full; containers radius.lg; modal radius.xl; sections none.
D-090: Elevation: card sm (hover md); pricing-card md (featured lg); modal xl; toast lg; navbar sm; else none.
D-091: Transitions name their properties and use `animation.durationFast` + `easingDefault`; accordion chevron uses `durationNormal`. `transition: all` is forbidden.
D-092: Focus: `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px }` on every interactive part via library.css. Input fields use a 3px color-mix ring of `--alt-accent` instead.
D-093: `cssVarFor` is final in `_shared.ts` (supersedes the Turn 2 stub): group prefixes color/font/font-size/font-weight/line-height/spacing/radius/elevation/animation; camelCase keys kebab-cased.
D-094: No icon library. Inline SVG with `currentColor`, ≤3 paths each.
D-095: Nested CTAs (card, hero, navbar, pricing-card, modal) get styles from `nestedButtonStyles(variant, size)` in `_shared.ts`, which reads `STYLE_DICTIONARY.button` with a synthetic spec. Buttons are never styled in two places.
D-096: Phase 2/3 canvas = vertical stack of specimens in creation order, 24px studio gap; specimen = studio-surface frame + chip header (type mono, variant·size, id) + body (centered, or full-bleed for navbar/hero/feature-grid/footer). Page-owned components never appear as specimens.
D-097: Selection: click/Enter selects via `uiStore.select`; selected specimen gets a 2px `--studio-accent` outline and an Edit affordance opening Stream 5's spec panel (variant, size, content). Background click or Escape deselects. Humans can edit component props from the canvas, so `modify_component` is a shared capability.
D-098: Viewport switcher sets the canvas root width to `VIEWPORT_WIDTHS[viewport]`; components adapt only via container queries. No JS reads viewport.
D-099: `ComponentStyleDef` is authored with `defineStyle(parts, build)` and `T(path, wrap?)` refs; `styles()` and `tokens()` derive from one declaration. Direct object literals for style defs are forbidden.
D-100: Component roots carry `data-alt`, `data-variant`, `data-size`, `data-state`, `data-id`, and every styled element carries `data-part`; `library.css` selects only on these attributes and ARIA state (`aria-expanded`), never on class names.
D-101: Default content is written for a fictional SaaS ("Northwind"); no lorem, no "Feature name", no exclamation points. Text lives only in `content.ts`.
D-102: Accordion open/closed and select value are ephemeral local UI state, not part of ComponentSpec. Toggle `checked` and input `error` ARE in content because they change the rendered default state.
D-103: Modal renders inline as a dialog surface over a fixed-height in-canvas backdrop; no portal, no focus trap on canvas. Exported Modal.tsx adds a `open` prop and a portal; documented in export README.

## Turn 4 — Tokens, fonts, write conflicts
D-104: Quick start = `generatePalette`, reachable as `suggest_palette` (agent) and the "Fill from primary" button (human). Filling all 13 colors may jump phase 0→2 directly; that is intended.
D-105: Type scale UI exposes Base size (12–24px) and Ratio (1.125/1.2/1.25/1.333); changing either recomputes all nine steps `round(base × ratio^n)`, n = −2…6 (xs..4xl), via `setMany`. Individual steps are agent-editable via `set_token` only. Spacing unit UI is a segmented 2/4/6/8.
D-106: Color popover contents, in order: 10 curated presets; H/S/L sliders with computed tracks; native `<input type="color">`; hex field. Row shows swatch, role, hex input, lock toggle.
D-107: After primary is set, the 12 other roles show ghosted proposals (50% opacity, dashed) from the selected strategy; default strategy `analogous`. Clicking a ghost applies one; "Fill from primary" applies all unlocked.
D-108: Token reactivity via `TokenStyleInjector` rendering `<style id="alt-tokens" suppressHydrationWarning dangerouslySetInnerHTML>` from a `useTokenStore(tokenToCss)` selector. No `setProperty`, no debounce.
D-109: Null colors emit per-role grayscale sentinels from `UNSET_COLOR` (backgrounds 97–100%, text 20–58%, brand/semantic 58–70%, border 84%, muted 88%). Deleting a referenced color turns components gray and legible; deletion is never blocked.
D-110: No debounce anywhere in the token pipeline. Slider `input` events call `setToken` directly.
D-111: Token editors are the only code allowed to mutate `tokenStore` without logging, and only during an in-progress drag; on release/blur/Enter they call `commitHuman('ui.set_token', …)` once with `inverse = restore_token(value at drag start)`.
D-112: `tokenStore.setToken` validation per group is as specified in Turn 4 §2.3; locks are enforced by tools and UI, never by the store, so undo can restore locked tokens.
D-113: Five rule presets shipped in the Rule editor and cited in `add_rule`'s description: No danger buttons; No red primaries (hue-not-in 345–15 on background-color); Minimum radius 8px; Text contrast ≥ 4.5:1; Touch targets ≥ 44px (button min-height).
D-114: Rule resolution: `evaluateSpec` reads `STYLE_DICTIONARY[type].tokens(spec)` for the `root` part to find the driving token, reads its value from `tokenStore`, applies the operator; `min-height = 2×padding-block + font-size×line-height`; `contrast` = root color on root background, falling back to text-primary on background.
D-115: `evaluateAll()` re-runs on add_rule, set_token, removeToken, modify_component; violations are memoized in `ruleEngine` and shown as specimen badges and a rules-panel count; `get_current_state.violations` and `add_rule.data.violations` report them to the agent.
D-116: Existing components that violate a rule are flagged, never removed. New generations and modifications that would violate are rejected with `RULE_VIOLATION`.
D-117: Rules are viewport-agnostic and component-level. Viewport-conditional and page-aggregate rules are out of scope; stated in ARCHITECTURE.md.
D-118: Rule rejection message format: `Rule "<description>" prohibits <property> "<value>" for <type>. Choose one of: <alternatives>.` For token-driven violations with no alternatives, `hint` names the token to change and the passing range.
D-119: All 13 catalog fonts are declared at build time in `src/utils/fontLoader.ts` via `next/font/google` (display swap, latin subset, weights per catalog); `FONT_CLASSNAMES` applied to `<html>`. No runtime `<link>` injection.
D-120: `fontStack(family)` returns `FONTS[family].style.fontFamily` (next/font's internal name + fallbacks) when the family is in the catalog; otherwise quoted name + sans fallback. Amends D-066's implementation only.
D-121: Export rewrites font stacks to public names (`'Inter', system-ui, sans-serif`) and adds a Google Fonts `@import` line to `tokens.css`; export README shows the `next/font/google` equivalent. Both, with a comment.
D-122: Font dropdown is a grouped listbox (Sans/Serif/Mono); each option renders in its own face at 15px/400; trigger shows the current value in its face; `document.fonts.load()` prefetch of all 13 fires on first hover of the Typography section header.
D-123: Write-conflict policy: last write wins for every store. No edit locking, no versioning.
D-124: `modify_layout` addresses sections by id only: `reorder{sectionId,newIndex}`, `remove-section{sectionId}`, `add-section{afterSectionId|null, section}`. No index inputs. Return data is the resulting `sections` order.
D-125: Any tool addressing a missing id returns `NOT_FOUND` with `alternatives` = current valid ids and a hint naming the list tool to call.
D-126: Overwrite toast: when an agent `set_token` replaces a non-null value, the studio shows `Agent changed <role> · was <hex>, now <hex> · Undo` for 8s. Only token overwrites get a toast.
D-127: Lock UX: padlock toggle on every token row; locked rows render muted with a padlock in the swatch; `set_token`/`remove_token` on a locked path → `LOCKED` with `alternatives` = unlocked paths in the group; `suggest_palette` skips locked roles (`data.skippedLocked`). Undo may restore a locked token.

## Turn 5 — Layouts, studio UI, first visit
D-128: Wireframe box anatomy: studio grays (`#2A2E3A` fill, `#4A5060` dashed border), mono uppercase label top-left, centered placeholder line, N inner dashed boxes for grid sections. Heights per type per Turn 5 §4.1 table. Never token-styled.
D-129: Human wireframe controls: hover strip ▲ ▼ ✕ per box and "+ Add section" between boxes; all via `commitHuman` with `restore_sections` inverse. No drag-and-drop.
D-130: Wireframe tab strip in the canvas toolbar from the first wireframe; "+ New wireframe" form (page type, title, section checklist with per-page-type presets) is the human path to `sketch_wireframe`.
D-131: With an active wireframe the canvas shows it (or its page) and loose specimens collapse into a bottom "Components (n)" drawer; with none active, specimens show.
D-132: Phase regression never deletes anything; wireframes and pages persist and remain human-editable while agent tools are absent.
D-133: Section→component map (`SECTION_COMPONENT_MAP`): navbar→navbar, hero→hero, features→feature-grid×1 (columns→content), pricing→pricing-card×N (middle featured), testimonials→card×N, cta→hero(sm, no secondary), faq→accordion, footer→footer, content→card(lg)×1; gallery/stats/team→Stream 4 token-styled blocks (not components).
D-134: The section mapping is not agent-configurable; the agent shapes results by modifying produced components.
D-135: Per-section render content lives in `src/engine/sectionContent.ts`, derived from `DEFAULT_CONTENT` with overrides so a page reads as one product. Wireframe labels are never used as content.
D-136: Section layout: full-width `<section data-section data-index>`; inner container max-width 1120px, padding-inline spacing-8 for column sections and blocks; column grid gap spacing-6, padding-block spacing-16; sections abut; backgrounds alternate background/surface by index (navbar/footer excluded); page root sets `--color-background` and takes `.dark`.
D-137: Render transition: 700ms — wireframe boxes out (220ms, scale .985, 30ms stagger), page sections in from 260ms (320ms, translateY 8→0, 60ms stagger); `prefers-reduced-motion` → 0ms.
D-138: Removing a page component removes its id from the section; an emptied section renders a dashed studio-gray strip `Section emptied · Re-render page to restore`. Page and phase persist.
D-139: Re-render (human toolbar button) = `unrender_page` then `render_page`, two log entries. No dedicated agent tool.
D-140: `render_page` on a wireframe that already has a page performs a re-render.
D-141: Delete page (human toolbar) removes page + its components, wireframe status → 'wireframe'. `remove_wireframe` on a wireframe with a rendered page → `INVALID_INPUT` with a hint to delete the page first.
D-142: Studio chrome is dark, always, on its own palette (`--studio-*` in globals.css, values per Turn 5 §5.1). Accent `#FF7AC6` (alt.gal pink); agent color `#7CE0FF`.
D-143: Studio UI font Geist; Geist Mono for log, ids, tool names, Tool Inspector. Not Inter.
D-144: Canvas surround is `--studio-canvas` with a 16px dot grid; all user work sits on `var(--color-background)` (specimen bodies, page root).
D-145: Token panel sections collapsible; default open Colors, Typography, Rules; default closed Spacing & radius, Elevation, Motion; state in uiStore; Rules auto-opens on first rule.
D-146: Empty color slot: dashed swatch, `Not set` placeholder, no lock until set; `Set primary to begin.` under primary while null.
D-147: Agent-set token rows flash `--studio-agent` 24%→0 over 900ms and scroll into view. Human-set rows don't flash.
D-148: Canvas toolbar groups: left wireframe tabs + New wireframe (phase ≥3); center viewport switcher + theme toggle (disabled until dark exists); right + Component (phase ≥2), Re-render/Delete page (rendered page), Export (phase 4). No zoom.
D-149: Canvas empty states per phase as specified in Turn 5 §5.3; phase-0 card offers `Set primary color` and `Open Tool Inspector`.
D-150: `+ Component` form (type, variant, size, label) is the human path to `generate_component`.
D-151: The log shows human actions (dot `--studio-accent`) alongside agent actions (dot `--studio-agent`), with filter chips All/Agent/You.
D-152: Log entry anatomy: dot + mono tool name + time; one-line input summary (click expands JSON well); result summary two-line clamp; hover Undo on undoable entries; undone = strikethrough + tag + new human entry.
D-153: Phase bar: wordmark left; five-pill stepper center (completed accent-soft ✓, current accent, future outlined); right `n of 24 tools` + source badge from webmcpStatusStore.
D-154: Phase-up animation: hairline sweep 300ms, pill scale 200ms, tool count ticks. Phase-down: neutral un-fill, no red, toast `Phase back to n · <group> tools paused`.
D-155: Studio requires ≥1024px; below, a single notice with the demo link. 1024–1280 narrows both side panels to 260px.
D-156: Onboarding is one dismissible banner at the top of the canvas; no tour, no modal.
D-157: `Load example tokens` applies primary hsl(250,84%,60%) + analogous palette, Geist/Inter/JetBrains Mono, base 16 ratio 1.25, unit 4 — tokens only, one human log entry with `restore_tokens` inverse. Never components or pages.
D-158: Bottom status bar (28px): WebMCP source sentence, counts, Tool Inspector toggle.
D-159: Suggested prompts in the empty log when source is native: `What can you do on this page?` · `Help me pick a palette for a fintech startup and set it up.` · `Generate a hero and a pricing table, then sketch a landing page.`
D-160: Microcopy table in Turn 5 §Part Fifteen is the complete and only source of UI strings; voice is direct, sentence case, no exclamation points, no emoji. Strings live in `src/components/studio/strings.ts` (Stream 5).

## Turn 6 — Algorithms, export, edge cases, undo
D-161: `parseColor` accepts hsl (comma/space/deg/slash), rgb, #rgb/#rrggbb; rejects alpha ≠ 1, named colors, oklch. Hue normalized [0,360), S/L clamped.
D-162: `generatePalette` per Turn 6 §6.1: partners inherit primary S−8 with L clamped [40,65]; monochromatic uses S−20/L+15 and L−15; semantic roles within ±22° of primary hue get S−10/L−12; `muted` l=90, `border` s=12 l=88, `text-muted` l=58.
D-163: Palette tests: four primaries × four strategies must satisfy text-primary/background ≥12, text-secondary/surface ≥4.5, text-muted/background ≥3, on-primary/primary ≥4.5.
D-164: `deriveDarkTheme` per Turn 6 §6.1 table (background 8, surface 12, muted 20, border 22, text 95/70/52, brand L+8 S−5) plus a contrast-repair loop that lightens brand colors in 2% steps until on-color ≥4.5 and brand/background ≥3.
D-165: Accessibility audit checks, in order: text pairs (4.5 / 3 for text-muted), on-colors, focus ring (primary/background ≥3), type scale ≥12px, touch targets (2·padding-block + fontSize·1.2 ≥44; fix suggests size lg or spacing.unit 5), component root contrast. Never mutates.
D-166: `resolveProperty` for rules: spec fields direct; token-driven props via `STYLE_DICTIONARY[type].tokens(spec)['root.<prop>']` → token value or sentinel; `min-height` computed; `contrast` = root color on root background with text-primary/background fallback.
D-167: `tokens.css` export = header comment, Google Fonts @import, `:root` grouped with comments (public font names), `.dark` block if present, sentinels marked `/* unset */`, then full `library.css` under a `/* Component states */` header.
D-168: `tokens.json` is DTCG: nested groups, `$value/$type/$description/$extensions`; colors as hex `$value` + `$extensions['gal.hsl']`; dimensions `{value,unit}`; fontFamily arrays; fontWeight numbers; lineHeight `number`; duration `{value,unit:'ms'}`; cubicBezier arrays; shadow objects. Root `$description` notes the spec URL. design-tokens.github.io was unreachable; if Stream 5 reaches it and the draft mandates color objects, it switches and logs the change here.
D-169: `tailwind.config.ts` export: `theme.extend` maps every category to CSS vars; `darkMode: ['class']`; header says it requires tokens.css.
D-170: `tokens.scss` export: literal values as `$name` variables grouped with comments; `@mixin dark-theme` when dark exists.
D-171: Component export: one PascalCase.tsx per component type present; props = variant/size + optional content fields + interactive props; styles precomputed as `STYLES[variant][size][part]` from the dictionary at export time; markup from Turn 3 with data-attributes retained; Modal gains portal + focus trap inline.
D-172: `pages/<slug>.tsx` per rendered page composing exported components with the same section wrapper/container CSS; gallery/stats/team inlined as local functions when present.
D-173: Export README covers install (container declaration), fonts (both methods), Tailwind usage, DTCG note, active rules in plain language, MIT. package.json stub with react peer deps.
D-174: Export delivery = modal with file tree, regex-highlighted preview (no highlighter dependency), Copy, Download ZIP (JSZip), tabs Tokens/Components/Page/Everything, per-format checkboxes.
D-175: `export_*` tools run exporters, stash files in `uiStore.exportFiles` (transient), open the panel, and return `{ files:[{path,lines}], totalLines, note }`. Agents never receive file contents from export tools.
D-176: Persist safety: each store's `merge` validates persisted shape and falls back to defaults with a toast `Saved <store> data couldn't be read and was reset.`; `migrate` returns defaults for unknown versions.
D-177: Tool Inspector runs are logged as actor `agent` (they go through executeTool) with a `via inspector` tag when the inspector was open at call time.
D-178: No hydration race: stores hydrate synchronously on first browser import; `WebMCPBridge` mounts the registrar only after `ensureModelContext()`, so the first sync sees persisted phase.
D-179: No cross-tab sync; last write wins through localStorage. Out of scope.
D-180: Undo is arbitrary from the log with per-kind blocking rules; Cmd+Z undoes `lastUndoable()`.
D-181: No redo stack. Undoing an undo is not offered.
D-182: Undo executor behaviour and blocking per Turn 6 §1.7 table (missing targets = treated as done; wireframe with page cannot be removed; restore_sections on a rendered wireframe is allowed and flags re-render).
D-183: Per-tool inverse payloads per Turn 6 §1.7 table; captured before mutation inside execute; read-only tools have `inverse: null`.
D-184: Deleting a rendered page (human) is not undoable; the confirm dialog states this. Re-render reproduces the page.

## Turn 7 — Positioning, submission, judges, schedule
D-185: Rubric is inferred (submission page unreachable from this environment): WebMCP depth 30%, human–agent collaboration 25%, technical execution 20%, usefulness 15%, creativity/demo 10%. If a published rubric exists, README maps to it before submission.
D-186: The 150-word submission text is Turn 7 §13.2 verbatim.
D-187: The 500-word submission text is Turn 7 §13.2 verbatim.
D-188: README "Comparison" section uses the six "why not X" paragraphs from Turn 7 §13.3 verbatim (v0, Figma, Banani/UX Pilot/Token Designer, normal MCP server, Claude Design/Doop, mace/shipwright).
D-189: Three UI paths added so nothing is agent-only: `Run audit` button in the Rules header; `Generate dark theme` button beside the theme toggle (`Regenerate` after first); Edit panel gains a "Why it looks like this" tab (`getTokenMapping`) and a `Copy code` button.
D-190: Wireframe section controls are keyboard-accessible: strip shown on `:focus-within`; boxes are focusable; ↑/↓ move, Delete removes.
D-191: DNS for alt.gal → Vercel is started on Aug 31 evening, not on deploy day.
D-192: Cut order (applied Wed Sept 2 18:00 CT): (1) components toast, modal, select, textarea, accordion, toggle, badge, avatar; (2) export SCSS → Tailwind → DTCG; (3) UI conveniences (non-Cmd+Z shortcuts, phase animation, row flash, new-pill, log filters, Shadow intensity, Ratio, ghost proposals); (4) tools generate_dark_theme, remove_wireframe, get_component_code, export_components/export_page → UI-only, with the phase map amended in the ledger; (5) gallery/stats/team blocks; (6) render transition; (7) declarative form. Never cut: three moments, phase system, log + undo, get_current_state, Tool Inspector, CSS + React export, Day-1 host test, type freeze, ledger.

## Turn 8 — Repo, demo, production signals, final check
D-195: README section order and contents per Turn 8 §9.1; the "Why WebMCP" three paragraphs are used verbatim.
D-196: ARCHITECTURE.md has the eleven sections in Turn 8 §9.2, each with real code excerpts; the declarative/imperative paragraph from Turn 1 Part Sixteen is verbatim.
D-197: ESLint enforces D-050 mechanically via `no-restricted-imports` (phaseStore importable only from webmcp/**, components/studio/**, components/canvas/**) and bans `../..` paths and `any`. Every tool file's header comment states its phases and why.
D-198: Test suite: colorUtils, phaseStore, toolPhaseMap, ruleEngine, tokenToCss, Stream 2's four, export (tsc on generated TSX via scripts/verify-export.sh), Playwright webmcp.e2e with the fake host. CI: typecheck/lint/test on PR, e2e on main.
D-199: Tuesday 08:00 CT host test procedure per Turn 8 §10.4; results (ChatGPT version, OS, plan, toggle, discovery behaviour) recorded here and in README §5.
D-200: Host decision: ChatGPT in-app browser if the Tuesday test passes; else Chrome 149+ with the flag and the Model Context Tool Inspector extension, stated plainly in README. The studio's own Tool Inspector is on screen in either case.
D-201: Recording: QuickTime, ChatGPT desktop window at 1920×1080/60fps, live narration from the script; one clean take plus a VO safety pass; edits limited to trimming and three lower-thirds; unlisted YouTube + MP4 on a GitHub release. Fallback layout: Chrome full-screen with the Inspector side panel docked right.
D-202: First-load JS ≤180 KB gzipped; JSZip, polyfill, and Tool Inspector are dynamic imports. Dependency list in Turn 8 §17 is complete and final.
D-203: Lighthouse targets Performance ≥90, Accessibility ≥95, Best Practices ≥95, SEO ≥90, plus the Registered WebMCP tools audit passing; measured in phase 0 and with example tokens loaded.
D-204: Metadata: title `Alternative Galaxy — Design systems for humans and agents`; description per Turn 8 §17; `metadataBase https://alt.gal`; `opengraph-image.tsx` 1200×630 from a Thursday-morning capture; `summary_large_image`; `icon.svg` pink dot on `#0F1117`.
D-205: `app/error.tsx` with Reload/Reset workspace; per-component and per-section ErrorBoundaries render an error card in place. Canvas never white-screens.
D-206: Studio a11y: landmarks (banner/complementary/main/contentinfo), `aria-live="polite"` on the log and tool count, `aria-expanded` section headers, `<ol aria-current="step">` stepper, focus-trapped popover with Escape, native range inputs with `aria-valuetext`.
D-207: Shortcuts: Cmd/Ctrl+Z undo (never cut), Cmd/Ctrl+E export, 1/2/3 viewport, D theme, Esc deselect/close, ? shortcuts sheet; ignored in text inputs.
D-208: `next.config` uses `output: 'export'`; ARCHITECTURE.md §10 carries the Cloudflare/static-deploy note verbatim from Turn 8 §17.
D-209: Amends D-035: `generate_component.data.tokensUsed` keys are `part.property` (e.g. `root.background-color`), matching `ComponentStyleDef.tokens()`.
D-210: Amends Turn 1 description: `remove_wireframe` = "Delete a wireframe by id. A wireframe with a rendered page can't be removed until the human deletes the page."
D-211: Amends D-058: `UIState` gains `panelSections: Record<'colors'|'typography'|'spacing'|'elevation'|'motion'|'rules', boolean>` (persisted) and `exportFiles: ExportFile[] | null` (transient). `ExportFile` lives in `src/types/export.ts` in the seed.
D-212: No `require()` anywhere in `src/`; nested CTA styles come from `nestedButtonStyles` in `_shared.ts` (Card, Hero, Navbar, PricingCard, Modal).

Total: 216
D-213: SpacingKey = 'unit' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16'. TokenPath admits spacing.<step>; cssVarFor('spacing.N') → --spacing-N per D-082. tokenToCss emits one var per step (unit × multiplier). Supersedes the D-087 SpacingKey='unit' reading. Reason: D-044/D-082 and the entire style dictionary depend on per-step vars; 87 typecheck errors confirm the type, not the usage, was wrong.
D-214: tsconfig exclude gains "alt-gal-docs". Reference sources are read, never compiled.
D-215: Prettier formatting applied repo-wide at seed; ALT_GAL_IMPLEMENTATION.md is reference, not byte-authoritative. Repo wins.
D-216: React 19 JSX type import in WebMCPBridge; lint script is eslint && prettier --check; consistent-type-imports fixes in Button/componentRenderer/tokenToCss/results; flat eslint.config.mjs carries D-197 rules (.eslintrc obsolete).
D-219: WebMCPBridge mounted in root layout on main so tools register on every page; Stream 5 keeps this when it rewrites layout.tsx.
