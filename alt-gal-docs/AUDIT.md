# Studio QA Audit

Read-only audit of the integrated studio at commit `a938304`. No source files were changed.
Scope: `src/app`, `src/components/studio`, `src/components/tokens`, `src/components/canvas`,
`src/components/export`, the WebMCP panels, and `src/webmcp/tools`.

## Summary table

| Area | WORKS | PARTIAL | DEAD | PLACEHOLDER-LINK | Verdict |
|---|---|---|---|---|---|
| Token panel (`components/tokens`) | 31 | 0 | 0 | 0 | Fully wired. The strongest area. |
| Studio chrome (`components/studio`) | 22 | 2 | 4 | 2 | The 4 dead controls are all `emitStudio` |
| Canvas (`components/canvas`) | 10 | 2 | 0 | 0 | Editing works; creation has no UI path |
| Export (`components/export`) | 7 | 0 | 0 | 0 | Panel, tree, preview, copy, ZIP all real |
| WebMCP panels (status bar, inspector) | 6 | 1 | 0 | 0 | Inspector needs a live `modelContext` |
| `app/` | 2 | 0 | 0 | 0 | error.tsx reset + reset-workspace both real |
| **Totals** | **78** | **5** | **4** | **2** | |
| 24 WebMCP tools | 24 real | 0 | 0 | — | No tool returns a not-wired envelope |

**Headline:** every tool and every token control is real. The four dead controls share one root
cause — `emitStudio` dispatches four `alt:*` window events and **no listener for any of them
exists anywhere in `src/`**. That single gap removes the only UI path for creating a wireframe,
which is the entry point to demo moment (c).

**Test results:** `pnpm test` — 443 passed, 1 skipped (22 files), exit 0.
`pnpm e2e` — **could not run**: Playwright browsers are not installed
(`chromium_headless_shell-1234` missing). Not installed, per instruction. The suite itself is one
spec, `webmcp.e2e.ts:63 "the tool surface grows with the state, 4 → 14"`.

---

## 1. Controls audit

### 1.1 DEAD — the four `emitStudio` buttons

`src/components/studio/events.ts` defines a typed window-event bus with four events. All four are
dispatched; **none is listened for**. Verified by exhaustive grep: the only `addEventListener`
calls in `src/` are for `toolchange` (×2), `keydown` (×3), and `mousedown` (×2). No `alt:*`
listener exists.

| # | Control | file:line | Handler | Effect |
|---|---|---|---|---|
| 1 | "Set primary color" (phase-0 empty state) | `components/studio/EmptyState.tsx:26` | `emitStudio('alt:focus-primary')` | **DEAD** — nothing listens. This is the first CTA a new visitor sees. |
| 2 | "Fill from primary" (phase-1 empty state) | `components/studio/EmptyState.tsx:56` | `emitStudio('alt:fill-from-primary')` | **DEAD** — nothing listens. |
| 3 | "New wireframe" (canvas toolbar, phase ≥3) | `components/studio/Canvas.tsx:99` | `emitStudio('alt:new-wireframe')` | **DEAD** — nothing listens. **Only UI path to create a wireframe.** |
| 4 | "Re-render" (canvas toolbar, when a page exists) | `components/studio/Canvas.tsx:121` | `emitStudio('alt:re-render', {wireframeId})` | **DEAD** — nothing listens. |

Mitigation that already exists: #1 and #2 have working twins inside the token panel
(`PrimaryColorForm` Apply, and the Colors-section "Fill from primary" at
`components/tokens/ColorTokenEditor.tsx:96`). #3 and #4 have **no** working twin in the UI — only
the agent tools `sketch_wireframe` and `render_page`.

### 1.2 PLACEHOLDER-LINK

| Control | file:line | Target |
|---|---|---|
| "Watch the 90-second demo" (small-screen notice) | `components/studio/StudioShell.tsx:71` | `https://alt.gal/#demo` |
| "Watch the 90-second demo" (onboarding banner) | `components/studio/OnboardingBanner.tsx:75` | `https://alt.gal/#demo` |

`DEMO_URL` is `strings.ts:151`. The domain is not deployed (D-191 starts DNS separately) and
D-201 puts the demo on an unlisted YouTube link plus a GitHub release — so `alt.gal/#demo` has no
planned owner. Both links currently go nowhere.

### 1.3 PARTIAL

| Control / behaviour | file:line | What is incomplete |
|---|---|---|
| Component selection | `canvas/ComponentPreview.tsx:18,22` → `uiStore.select` | Sets `selectedComponentId` and draws an outline, but **nothing renders an edit panel**. Only `ComponentGrid`, `PagePreview` and `ComponentPreview` read the value. D-189's "Edit panel with a *Why it looks like this* tab (`getTokenMapping`) and a *Copy code* button" does not exist in any component. `getTokenMapping` is used only by tools. |
| Render transition (D-137) | `studio/integration.tsx:36` | `WireframePreview` accepts `exiting?: boolean` to play the boxes out (`canvas.css:284`), but no caller ever passes it, so the "out" half never plays. `PagePreview.tsx:128` hardcodes `data-rendering="in"`, so the page-in animation fires on *every* mount — including a plain page load — rather than only after a render. |
| Phase stepper tooltips | `studio/PhaseIndicator.tsx:17` | `nextPhase()` is read, not subscribed. The comment says it "only ever changes when the phase does", but `.missing` shrinks as tokens accumulate *within* phase 1. The "Missing: …" tooltip is stale until the phase changes. `EmptyState.tsx:18` avoids this by subscribing to `getDefinedTokenCount()`. |
| Suggested-prompt Copy buttons | `studio/AgentLog.tsx:199-208` | Rendered only when `source === 'native'`. Under the polyfill — the normal local state — they are replaced by a hint. Correct by design, but it means the copy-paste demo aid is invisible in the most likely demo environment. |
| Tool Inspector | `studio/ToolInspector.tsx:55,67` | Every path is gated on `getModelContext()`. With `source: 'none'` the panel opens but lists nothing. It is also the advertised fallback in the phase-0 empty state ("Open Tool Inspector", `EmptyState.tsx:29` — that button itself WORKS). |

### 1.4 WORKS — verified handler → store/engine → UI

**Token panel (all real).** `TokenPanel.tsx` mounts seven editors plus the rule editor.
- `PrimaryColorForm.tsx:92` `onSubmit` → `apply()` → `editor.set()` → `tokenStore.setToken` → phase recalc. Also serves the declarative `set_primary_color` form (D-029/D-030); `respondWith` is called only when `agentInvoked` (line 82).
- `ColorTokenEditor.tsx:96` "Fill from primary" → `commitTokens('ui.fill_from_primary', …)`; `:172` ghost-proposal apply; `:178` hex input → `commitDraft` → `editor.set`/`editor.remove`; `:193` lock; `:252` preset swatches; popover H/S/L sliders `:291+`.
- `TypographyTokenEditor` (`:66` `commitTokens('ui.set_type_scale')`, `:132/:175/:181` family pickers), `SpacingTokenEditor:31`, `RadiusTokenEditor:70-72` (begin/live/end drag = one log entry), `ElevationTokenEditor:62,115,117`, `AnimationTokenEditor:98-100,130` — all route through `useTokenEditor`/`commitTokens`.
- `_controls.tsx:33` section collapse → `uiStore.setPanelSection` (persisted, D-211); `:71` `Segmented`; `:109-124` `Slider` with `onPointerDown`/`onKeyDown` begin, `onChange` live, `onPointerUp`/`onBlur` end.
- `LockToggle.tsx:24` → `editor.setLocked` → `tokenStore.setLocked` (constrains tools only, D-112).
- `RuleEditor.tsx:80,90,97` add/remove/toggle → `commitHuman` + `ruleStore`; `:170` five presets; `:186,204,221,239,251` the custom-rule form fields; `:117` per-rule enable checkbox.
- **"Run audit"** `TokenPanel.tsx:70` → `auditAccessibility('all')` from the real engine → renders findings. One of D-189's three "nothing is agent-only" paths.

**Studio chrome.**
- `Canvas.tsx:84` wireframe tab select → `layoutStore.setActiveWireframe`; `:92` tab close → `removeWireframe` (guards against a rendered page, toasts); `:112` Add component toggle; `:125` **Delete page** → `commitHuman('ui.delete_page')`, `window.confirm`, no inverse (D-184); `:131` Export → `uiStore.setExportOpen`; `:140` surface click deselects; `:168` component drawer toggle.
- `ComponentForm.tsx:47` submit → `create()` → `commitHuman('ui.generate_component')` → `componentStore.add`; `:54+` type/variant/size/label fields.
- `ThemeToggle.tsx:43` light/dark toggle (disabled until a dark theme exists); `:65` **"Generate dark theme"** → `deriveDarkTheme` → `commitHuman('ui.generate_dark_theme')` → `tokenStore.setDark`. D-189 path two.
- `ViewportSwitcher.tsx:39` → `uiStore.setViewport` → `Canvas.tsx:147` width.
- `OnboardingBanner.tsx:78` **"Load example tokens"** → `generatePalette` + type scale + spacing → `commitHuman('ui.load_example')` → `setMany`. **This is the only single-click UI jump from phase 0 to phase 2.** `:82` Dismiss.
- `AgentLog.tsx:72` expand entry; `:93` per-entry **Undo** → `undoEntry`; `:139` all/agent/you filters; `:152/:159/:168` Clear with confirm step; `:206` copy-prompt (native only).
- `EmptyState.tsx:29` "Open Tool Inspector" → `uiStore.setInspectorOpen`; `:70` "Add component" → callback into `Canvas`.
- `ShortcutsSheet.tsx:27` close; `Toasts.tsx:24` toast action, `:32` dismiss.
- `WebMCPStatusBar.tsx:46` Tool Inspector toggle → `uiStore.setInspectorOpen`.
- `ToolInspector.tsx` tool select, JSON input, and Run → `runTool` → host `executeTool` → logged by the registration wrapper and stamped `source: 'inspector'` (I-8/D-235).

**Keyboard shortcuts** — `studio/useShortcuts.ts`, all real, all ignored while typing (`inText`, `:14`):
`Cmd/Ctrl+Z` → `lastUndoable()` + `undoEntry` (`:28`); `Cmd/Ctrl+E` → export panel, gated on phase 4 (`:36`); `1`/`2`/`3` → viewport (`:44`); `D` → theme, no-op until a dark theme exists (`:49`); `Escape` → deselect + close export + close inspector (`:55`); `?` → shortcuts sheet (`:62`).
Additional local handlers: `canvas/ComponentGrid.tsx:21` Escape deselect; `canvas/WireframePreview.tsx:23` ↑/↓ move, Delete/Backspace remove (D-190); `canvas/SectionControls.tsx:85-86` and `tokens/ColorTokenEditor.tsx:226-227` Escape + outside-click to close popovers.

**Canvas.** `SectionControls.tsx:44,54,58` move up / move down / remove → `wireframeEngine` pure fns → `layoutStore.setSections` via `commitSections` with a `restore_sections` inverse; `AddSectionButton` menu adds a section. `PagePreview.tsx:38,42` select/Enter.

**Export.** `ExportPanel.tsx:74` scope tabs, `:84` close, `:96` format checkboxes, `:120` **Download** → `downloadZip` (`engine/export/zip.ts`, dynamic JSZip import, real blob + anchor click). `FileTree.tsx:37` file select. `FilePreview.tsx:13,22` **Copy** → `navigator.clipboard.writeText`.

**app/.** `error.tsx:35` `reset` (Next boundary), `:38` reset workspace → confirm → clears persisted stores.

### 1.5 Out of scope but noted

`src/components/library/*` are the *generated design-system specimens*, not studio chrome. Their
interactivity is deliberately inert — `Navbar.tsx:10,16` and `Footer.tsx:22` use
`href="#"` + `preventDefault()`. Correct for previews; do not "fix".

---

## 2. Tools audit — all 24

Every tool's `execute` is real. **No tool returns a not-wired / owner-not-landed envelope, and
`src/webmcp/pending.ts` contains no nulls** — it now binds real engine functions (I-9/D-236).
Every read tool carries `readOnly: true`.

| Tool | Phases | readOnly | Engine call | Status |
|---|---|---|---|---|
| `get_current_state` | 0-4 | ✅ true | `ruleEngine` | Real |
| `set_token` | 0-4 | false | `tokenStore` | Real |
| `get_tokens` | 0-4 | ✅ true | `tokenStore` | Real |
| `suggest_palette` | 0-4 | false¹ | `colorUtils` → `setMany` | Real |
| `remove_token` | 1-4 | false | `componentRenderer` | Real |
| `add_rule` | 1-4 | false | `ruleEngine` | Real |
| `remove_rule` | 1-4 | false | `ruleStore` | Real |
| `list_rules` | 1-4 | ✅ true | `ruleEngine` | Real |
| `generate_component` | 2-4 | false | `componentRenderer`, `ruleEngine` | Real |
| `list_components` | 2-4 | ✅ true | `componentStore` | Real |
| `modify_component` | 2-4 | false | `componentRenderer`, `ruleEngine` | Real |
| `remove_component` | 2-4 | false | `componentStore` | Real² |
| `explain_component` | 2-4 | ✅ true | `getTokenMapping` | Real |
| `get_component_code` | 2-4 | ✅ true | `export/react.exportComponent` | Real |
| `sketch_wireframe` | 3-4 | false | `layoutStore.addWireframe` | Real |
| `modify_layout` | 3-4 | false | `wireframeEngine` | Real |
| `remove_wireframe` | 3-4 | false | `layoutStore` | Real |
| `render_page` | 3-4 | false | `layoutEngine.renderPage` | Real |
| `generate_dark_theme` | 3-4 | false | `themeEngine` | Real |
| `audit_accessibility` | 3-4 | ✅ true | `accessibilityAuditor` | Real |
| `export_tokens` | 4 | ✅ true | `buildExport(…, 'tokens')` | Real³ |
| `export_components` | 4 | ✅ true | `buildExport(…, 'components')` | Real |
| `export_page` | 4 | ✅ true | `buildExport(…, 'page')` | Real |
| `export_full_system` | 4 | ✅ true | `buildExport(…, 'everything')` | Real |

¹ `suggest_palette` writes tokens (`suggest_palette.ts:77` `setMany`), so `readOnly: false` is correct despite the name.
² `remove_component` no longer calls the old page-section stub; D-138 is satisfied by derivation in `layoutEngine.orderSectionComponents` (I-7/D-234).
³ The agent-facing format vocabulary keeps `json` while the engine calls that exporter `dtcg`; mapped in `pending.ts:26-31`.

`untrusted: true` is set on the six tools that return human-authored or generated content
(`explain_component`, `list_components`, `get_component_code`, `export_components`,
`export_page`, `export_full_system`).

**Observation:** no tool's phase list omits a later phase, so the tool set only ever grows.
`removedTools` in the D-006 envelope is therefore always `[]`, and `toResult`'s "Removed tools:"
branch (`results.ts:24`) is unreachable in practice.

---

## 3. Phase gate trace

Counts from `toolPhaseMap.ts`: **phase 0 = 4 tools, 1 = 8, 2 = 14, 3 = 20, 4 = 24.**

> Note on "5 of 24": the studio registers **4** imperative tools at phase 0, not 5. The e2e spec
> name (`"4 → 14"`) matches the code. The fifth phase-0 affordance is the declarative
> `set_primary_color` form (`PrimaryColorForm.tsx:90`), which is never registered as a tool and is
> never phase-gated — so "5" is right only if you count it.

### Transitions

| To | Requirement (`phaseStore.computePhase`) | UI action(s) that get there |
|---|---|---|
| **1** | ≥1 token defined | `PrimaryColorForm` Apply; any token editor write; "Load example tokens" |
| **2** | ≥5 tokens **and** `color.primary`, `color.background`, `color.text-primary` all set | "Load example tokens" (one click, jumps 0→2); "Fill from primary" in the Colors header; manual editing |
| **3** | ≥2 components | "Add component" ×2 (`ComponentForm`); agent `generate_component` |
| **4** | ≥1 rendered page | **agent `render_page` only** — no working UI path (see below) |

### Does the chain actually fire?

Yes. Verified end to end:

1. `tokenStore.setToken` (etc.) calls zustand `set`.
2. `phaseStore.ts:59-64` installs `useTokenStore.subscribe(recalc)`, `useComponentStore.subscribe(recalc)`, `useLayoutStore.subscribe(recalc)` at module load, guarded by `typeof window !== 'undefined'` (D-049). `recalc` → `computePhase()` → `set({currentPhase})` only when it differs.
3. `useWebMCPRegistration.ts:139` subscribes to `usePhaseStore` and calls `scheduleSync()` when `currentPhase` changes.
4. `scheduleSync` (`:123`) coalesces into one `setTimeout(0)` (D-004); `sync` (`:95`) diffs `toolsForPhase(phase)` against the registered map, aborts the removals, `registerTool`s the additions (D-002, D-003).
5. `refreshCount` (`:86`) calls `ctx.getTools()` and pushes the result into `webmcpStatusStore.setTools`, which sets `toolCount`.
6. `PhaseIndicator.tsx:18` subscribes to `toolCount` and re-renders the "N of 24 tools" line.

No reload is required. The `<Registrar/>` under `WebMCPBridge` mounts only after
`ensureModelContext()` resolves to something other than `'none'`, so `getModelContext()` is
non-null by the time the effect runs — the `if (!ctx) return` early-exit at `:80` is not hit in
the normal path.

### What would prevent 4 → 14 without a reload

Ranked by likelihood:

1. **`ctx.getTools()` unsupported or throwing.** `refreshCount` swallows the error
   (`:90-92`, "count stays at last known"). Registration would still succeed, but the headline
   number — the thing being demoed — would freeze at its previous value with no visible error.
   The count has exactly one source; there is no fallback to `registered.size`.
2. **`ensureModelContext()` resolving `'none'`.** Then `<Registrar/>` never mounts and **no tool
   ever registers**, with no retry — the effect's dependency array is `[]` and the resolution is
   memoised in a module-level promise (`detect.ts:12`). Happens when `window.isSecureContext` is
   false, i.e. serving over plain `http://` on a LAN IP or tunnel rather than `localhost`.
   Also happens if the polyfill import fails.
3. **First ~1.5 s after load shows 0 tools.** `detect.ts:18-21` polls three times at 500 ms for an
   extension-injected context before falling back to the polyfill. Expected, but it means a
   screen recording that starts immediately catches "0 of 24 tools · unavailable".
4. **Polyfill registration failures.** Any `registerTool` rejection is caught at `:114` and routed
   to `markDegraded`, which shows "N tools failed to register" in the status bar rather than
   blocking. Partial surfaces are possible without an obvious cause.
5. Not a risk: React StrictMode double-mount. The epoch `AbortController` (`:146`) drops
   everything on cleanup and the remount re-syncs from an empty map.

---

## 4. The three demo moments

### (a) Tools appear after tokens are set — **WILL WORK**

Path: `PrimaryColorForm` Apply (or any token write) → `tokenStore` → `phaseStore` subscriber →
`currentPhase` 0→1 → `useWebMCPRegistration` subscription → `scheduleSync` → 4 new
`registerTool` calls → `refreshCount` → `statusStore.setTools` → `PhaseIndicator` re-renders
"8 of 24 tools". The log also gains an entry, and `ToolInspector` refreshes off the host's own
`toolchange` event (`ToolInspector.tsx:69`).

**Single most likely failure point:** `ctx.getTools()` on the polyfill. Everything downstream of
registration is driven by that one call, its failure is silently swallowed, and the number it
feeds *is* the demo. Verify against the real polyfill before recording; if `getTools` is absent,
the tools are live but the counter lies.

### (b) Changing a token repaints every component live — **WILL WORK, strongest of the three**

Components never receive resolved values. `_shared.ts:12` `T(path)` produces a `Ref`, and
`defineStyle` (`:45-48`) turns every ref into `var(--color-primary)` etc. via `cssVarFor`
(`:29`). So `<Button style={{background: 'var(--color-primary)'}}>`.

The repaint is therefore pure CSS cascade: `editor.live()` → `tokenStore.setToken` →
`TokenStyleInjector.tsx:16` (`useTokenStore(tokenToCss)`) recomputes the sheet → the text node of
`<style id="alt-tokens">` swaps → every specimen and every rendered page section restyles in the
same frame. React does not need to re-render a single component. No debounce anywhere (D-110), and
drag ticks are `live()` writes that log once on `end()`.

**Single most likely failure point:** a token whose CSS variable name does not match what the
style dictionary asks for — `cssVarFor` builds names from a `GROUP_PREFIX` map (`_shared.ts:16-25`)
while `tokenToCss` emits them independently. A mismatch in one group (spacing steps are the
riskiest, per D-213/D-082) shows as one property that never moves while everything else does.
`engine/__tests__/tokenToCss.test.ts` covers this; worth a manual sweep of all nine groups.

### (c) `sketch_wireframe` → `render_page` replaces gray boxes with styled components — **WILL WORK, agent-driven only**

Path: `sketch_wireframe` → `layoutStore.addWireframe`, which sets `activeWireframeId`
(`layoutStore.ts:37`, D-054) → `Canvas.tsx:34` finds `active` → `WireframeViewSlot` renders
`WireframePreview` (gray boxes, `canvas.css` `.alt-wf__box`). Then `render_page` →
`layoutEngine.renderPage` (`:168`) → `renderWireframe` builds specs → `componentStore.add` each →
`layoutStore.addRenderedPage` → `Canvas.tsx:35` `activePage` becomes truthy →
`integration.tsx:36` swaps to `PagePreview` → `PageView` renders real library components on the
user's tokens.

**Single most likely failure point — and it is not a code fault, it is a *staging* fault:
there is no UI path into this moment.** "New wireframe" (`Canvas.tsx:99`) is one of the four dead
`emitStudio` buttons, so a human cannot create a wireframe at all. The moment is reachable only if
the agent calls `sketch_wireframe`. If the host is unavailable for any of the section-3 reasons,
demo moment (c) cannot be performed by any means. "Re-render" is dead for the same reason, so a
second take needs Delete page (which works) followed by another agent call.

Secondary: the D-137 transition does not play (see §1.3) — the swap is instant, which reads as a
jump cut rather than the "moment" the studio is built around.

---

## 5. Prioritized fix list

Ranked by impact on the three demo moments and the submission.

| # | Fix | Impact | Effort |
|---|---|---|---|
| **1** | **Add the four `alt:*` listeners.** One `useEffect` in `StudioShell` (or a `useStudioEvents` hook) covering `alt:new-wireframe`, `alt:re-render`, `alt:focus-primary`, `alt:fill-from-primary`. `alt:new-wireframe` unblocks demo moment (c) for humans; the other three restore the phase-0 and phase-1 CTAs. | **Critical** — demo (c) has no UI path; the first CTA a judge clicks does nothing | S |
| **2** | **Make `toolCount` degrade gracefully.** Fall back to `registered.size` when `ctx.getTools()` throws or is absent (`useWebMCPRegistration.ts:86-93`). The headline number is demo moment (a) and it currently has a single silent point of failure. | **Critical** — silent failure of the number being demoed | S |
| **3** | **Verify `getTools`/`toolchange` against `@mcp-b/webmcp-polyfill@5.1.0` on the real demo host**, before recording. This is the assumption fixes 2 and 4 are hedging. | **Critical** — validates (a) end to end | S |
| **4** | **Surface `source: 'none'` loudly.** If `ensureModelContext()` resolves `'none'`, nothing registers and there is no retry. Show a blocking banner naming the cause (not a secure context / polyfill failed) and offer a retry, instead of a quiet "unavailable" chip. Also guarantees the demo is served from `localhost` or HTTPS. | **High** — silent total failure of every agent moment | S |
| **5** | **Build the D-189 edit panel** (*Why it looks like this* via `getTokenMapping`, plus Copy code). Selection currently only draws an outline, and this is one of the three paths that exist specifically so nothing is agent-only — a rubric point on human–agent collaboration. | **High** — submission claim currently unsupported by the UI | M |
| **6** | **Wire the D-137 render transition.** Hold the wireframe for one tick with `exiting`, then swap; and set `data-rendering="in"` only when the page is newly rendered rather than on every mount (`PagePreview.tsx:128`). The CSS is already written and unused. | **High** — this *is* demo moment (c)'s payoff shot | M |
| **7** | **Fix or remove the two `alt.gal/#demo` links.** Point them at the unlisted YouTube URL from D-201, or drop them until the domain is live. Two dead links in the first screen a judge sees. | **Medium** — submission polish | XS |
| **8** | **Make the phase stepper tooltip reactive** (`PhaseIndicator.tsx:17`): subscribe to the token count the way `EmptyState.tsx:18` does, or recompute `nextPhase()` from subscribed values. Currently the "Missing: …" hint is stale within a phase. | **Medium** — visible wrongness during the phase-1 climb | XS |
| **9** | **Pre-warm the WebMCP detection window.** 1.5 s of "0 of 24 tools · unavailable" opens every recording (`detect.ts:18-21`). Either shorten the extension poll, or render a "detecting…" state distinct from "unavailable". | **Medium** — first impression of the recording | S |
| **10** | **Decide whether `removedTools` should ever be non-empty.** No tool's phase list omits a later phase, so the set only grows and the "Removed tools:" narration in `results.ts:24` is dead. Either gate a tool to earlier phases (the argument the studio is making is that the surface *shrinks* too) or drop the branch and the claim. | **Low–Medium** — a stated thesis the code does not demonstrate | S |

### Not worth fixing

- `components/library/*` inert `href="#"` links — correct behaviour for specimens.
- Copy-prompt buttons hidden under the polyfill — deliberate (D-159).
- The one skipped test (`emitExport.test.ts`) — gated on `ALT_EXPORT_OUT`, used by `scripts/verify-export.sh`.
- Vitest's config-loader warning (`vitest.config.ts` is CJS-loaded ESM) — cosmetic; only surfaces on stderr.
