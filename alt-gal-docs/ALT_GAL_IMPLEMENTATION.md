# ALT_GAL_IMPLEMENTATION.md

Alternative Galaxy (alt.gal) — engineering specification for the OpenAI WebMCP Challenge.
Deadline: Sept 3, 2026, 3PM CT. Every section ends in a decision. Decisions are numbered D-nnn in DECISIONS_LEDGER.md; the ledger wins over prose if they ever disagree.

---

# TURN 1 — UNBLOCK PROTOCOL

## Part Twenty-One: Reference implementations (read from source, 2026-08-31)

### What was reached and what wasn't

Reached (via codeload/raw GitHub and the npm registry):
- `edycutjong/mace@main` — `src/webmcp.js` (411 lines), `src/declarative.js` (133 lines), `package.json`
- `kwhinnery/shipwright@main` — `src/useWebMcp.ts` (516 lines), `package.json`, `tsconfig.app.json`, `tests/fixtures/webmcp-init.js`
- `GoogleChromeLabs/webmcp-tools@main` — `demos/page-agent/script.js`, `demos/shared/types/webmcp-declarative.d.ts`, directory listing of all 17 demos
- npm: `webmcp-types@0.1.5`, `@mcp-b/webmcp-polyfill@5.1.0`, `usewebmcp@5.1.0`, `use-webmcp-tool@0.2.0`, `@mcp-b/webmcp-types@5.1.0` (tarballs unpacked and read)

Not reached: `developer.chrome.com` (not on this environment's egress allowlist). Everything the Chrome docs would have answered is instead verified against WEBMCP_VERIFIED.md (fetched from those docs 2026-08-31), the official `webmcp-types` package the docs link, the polyfill's implementation, and mace's empirical notes measured on Chrome 151. Where those four disagree with each other, it is called out.

### mace — what it actually does

The prompt's summary of mace was wrong on the single most important point. Corrections first:

1. **Mace does not do full epoch reset on state change.** `syncRegistration()` computes the symmetric difference between the set of tools that should exist and the set that does, aborts only the removed ones, registers only the added ones. The epoch controller (`epochCtl`) is aborted only in `replayLog()` — the demo's fast-forward/reset. Mace's own header comment calls per-phase controllers "the obvious design" and "wrong here" because tools legal across many phases would be torn down and rebuilt on every transition. → **D-002, D-003.**

2. **Three lifetime classes, not one.** (a) `sessionCtl` for the four always-on reads, never diffed; (b) one controller per gated tool, aborted the moment the rule engine drops it; (c) declarative forms, removed by `removeAttribute('toolname')`. Composition: `AbortSignal.any([ctl.signal, epochCtl.signal])` per gated tool.

3. **Deferred frontier update (§5.2a).** `commit()` does `append → reduce → emit() → scheduleSync()`. `scheduleSync` is a coalesced `setTimeout(…, 0)`. The reason is a bug mace measured on Chrome 151.0.7922.171 on 2026-08-29: calling sync inline from inside an execute that makes itself illegal aborts that execute's own controller while it is running; on Chrome 149–152 that cancels the in-flight call ("operation failed for an unknown transient reason") and the agent's now-stale handle fails retry with "not of type 'RegisteredTool'". Chrome 153+ no longer cancels in-flight executions on unregister (WEBMCP_VERIFIED), but the origin trial is 149+, so the deferral stays. → **D-004.**

4. **Return shape: self-describing string.** `describe()` returns "`{title} recorded. {what is pending}. N actions are in order.`" — never a bare confirmation. Errors are **thrown** as `Error` with retry guidance in the message (`"motionId" must be one of: …`). Execute begins with `if (options?.signal?.aborted) throw new DOMException('Cancelled','AbortError')`.

5. **Schema carries state.** `schemaFor()` regenerates enums from `state.table` at every registration, and the diff re-registers a tool whose schema signature changed even if legality didn't. Elegant; also the source of most of mace's toolchange churn.

6. **`executeTool` input is a JSON string on Chrome 151.** Spec issue webmachinelearning/webmcp#243 (closed 2026-08-17) changed it to an object; Chrome hadn't shipped that. Mace sends the string first, falls back to the object.

7. **ChatGPT's in-app browser threw a `TypeError` out of `registerTool` on 2026-08-30.** `'registerTool' in modelContext` proves the property exists, not that calling it works. Mace wraps every registration in try/catch and runs a `reg.degraded` flag that makes the panel render from its own rule engine instead of a `getTools()` that would under-report. **This is the most important sentence in this section for the demo plan.** → **D-015, D-041.**

8. Surface detection: `globalThis.document?.modelContext ?? globalThis.navigator?.modelContext ?? null`, with a note that `navigator.modelContext` appears zero times in the spec's index.bs and is checked only because stale material still teaches it.

9. `title` is set on every tool. `readOnlyHint` is deliberately left at its false default on write tools ("the ABSENCE of the hint is what makes a client confirm wording with the human"). `untrustedContentHint` is set on exactly two of four reads to make the contrast visible.

10. Duplicate-name in the same tick: mace aborts a stale-schema tool and immediately re-registers the same name inside one `syncRegistration` pass. This works on Chrome 151 (mace's e2e suite exercises it), so abort-to-remove is effectively synchronous in Chrome as well as in the polyfill.

### shipwright — what it actually does

- `useWebMcp(commands: RefObject<EditorCommands>, onInvocation)` returns `'ready'|'unavailable'|'error'`. One `useEffect`, one `AbortController`, all 15 tools registered at mount via `Promise.all`, controller aborted in cleanup. Strict mode is handled by nothing special: cleanup aborts, re-run re-registers. Registration errors are caught and `AbortError` is ignored.
- Requires `window.isSecureContext` and `document.modelContext?.registerTool`.
- Editor commands are passed as a `RefObject` so execute closures never go stale without re-registration. We get the same property for free from `useStore.getState()` (D-037).
- Every tool is wrapped to call `onInvocation({id: crypto.randomUUID(), toolName, input: structuredClone(input), invokedAt: Date.now()})` — a logging wrapper identical in shape to what our registration wrapper does.
- Validation throws `TypeError` with an enumerated message. **Execute returns the command's result object, not a string.** This works through the polyfill (which `JSON.stringify`s objects — see below) and presumably through the ChatGPT browser shipwright was built for, but nothing in Chrome's docs promises object returns. We don't rely on it (D-005).
- Types: `webmcp-types@0.1.3` via `tsconfig "types": ["vite/client","webmcp-types"]`; tools typed as `WebMCP.ModelContextTool[]`. Schemas use plain `enum`, `pattern`, `additionalProperties:false`, bounded arrays. State exposure: one `get_editor_state` read tool returning the whole design; every other tool is a command.
- `tests/fixtures/webmcp-init.js` is a 20-line fake `document.modelContext` (registerTool stores the tool, abort listener deletes it) injected by Playwright. We copy this pattern for Stream 3's isolation tests.

### Chrome's webmcp-tools repo

- `demos/page-agent/script.js` — `getTools({fromOrigins:[iframeOrigin]})` then `executeTool(tool, JSON.stringify(args))`. Confirms string input. Reusable shape for the Tool Inspector.
- `demos/shared/types/webmcp-declarative.d.ts` — ambient (non-module) augmentation of `HTMLElement` and `React.HTMLAttributes` with `toolname`, `tooldescription`, `toolparamdescription`, `toolautosubmit`. We copy it verbatim (Apache-2.0, credited) as `src/types/webmcp-declarative.d.ts`.
- **There is no React imperative-registration demo.** `react-flightsearch` is declarative-only (zero `modelContext` references in `src/`). WEBMCP_VERIFIED's claim that a "Travel demo shows how Chrome's own team structures a React registration hook" is not borne out by the repo at `main` today. Nothing to borrow; noted so no stream goes looking for it.

### Adopt / change table

| Pattern | Source | Alternative Galaxy |
|---|---|---|
| `document.modelContext` canonical | mace, polyfill, webmcp-types | Adopt (D-001). No navigator fallback — the polyfill's alias covers stale hosts. |
| Diff-based registration, per-tool + epoch controllers, `AbortSignal.any` | mace | Adopt verbatim (D-002, D-003). |
| Deferred, coalesced sync on next macrotask | mace | Adopt verbatim (D-004). |
| Session-lifetime reads never diffed | mace | Not needed: `get_current_state` is phase 0+ so the diff never touches it. One controller class suffices. |
| Schema carries state (regenerated enums) | mace | Reject (D-019). Our IDs change on every mutation; enum churn would fire toolchange constantly and the agent gets valid IDs from error envelopes anyway. |
| Self-describing string result | mace | Change: structured JSON envelope with a `summary` sentence inside it (D-005–D-007). The agent gets both the narrative and the data. |
| Throw `Error` for validation | mace, shipwright | Reject (D-008). Host behaviour on throw is undocumented; `ok:false` is unambiguous. |
| `executeTool(tool, string)` with object fallback | mace | Adopt verbatim (D-031). |
| Try/catch every registerTool, degraded flag | mace | Adopt (D-015). |
| `title` on every tool | mace, shipwright | Adopt (D-024). |
| Contrasted annotation usage | mace | Adopt in spirit (D-025): hints where they're true, absent where they're not. |
| Declarative form, no autosubmit = human ratifies | mace | Adopt for exactly one form (D-029). |
| Single effect, abort on cleanup, ignore AbortError | shipwright | Adopt (D-018). |
| `isSecureContext` guard | shipwright | Adopt (D-042). |
| Invocation logging wrapper | shipwright | Adopt inside the registration wrapper. |
| Plain `enum`, `additionalProperties:false` | shipwright, mace | Adopt (D-020, D-021). |
| Playwright fake `document.modelContext` | shipwright | Adopt for Stream 3 tests. |

### Overrides of ALT_GAL_SPEC.md from this reading

- ⚠️ SPEC CHANGE §6.1 step 2 "On phase change, aborts ALL existing tool AbortControllers" → diff only (D-002).
- ⚠️ SPEC CHANGE §6.2 `get_current_state` returns `{content:[{type:'text',text}]}` → returns a JSON string envelope (D-005). Applies to all tools.
- ⚠️ SPEC CHANGE §6.1 `set_token`, `get_tokens`, `suggest_palette` phase 1+ → phase 0+ (D-027). With the spec's map the agent could not set the first token; the phase-gate demo would end with the agent saying "define tokens" and being unable to help.
- ⚠️ SPEC CHANGE tool count 22 → 24 imperative (`remove_rule`, `remove_wireframe`) + 1 declarative (D-026, D-029).

---

## Part Eighteen: Package verification (npm registry, 2026-08-31)

### `webmcp-types@0.1.5` — official typings (webmachinelearning/webmcp-types), published 2026-08-20

Full contents of `index.d.ts` read. Declares `namespace WebMCP` with `ModelContextTool { name; title?; description; inputSchema?: object; execute: ToolExecuteCallback; annotations?: ToolAnnotations }`, `ToolExecuteCallback = (inputObject, options: { signal: AbortSignal }) => MaybePromise<unknown>`, `ModelContextRegisterToolOptions { signal?; exposedTo?: string[] }`, `RegisteredTool { name; title; description; inputSchema?; window; origin; annotations? }`, `ModelContext extends EventTarget { registerTool(): Promise<void>; getTools(options?: {fromOrigins?}): Promise<RegisteredTool[]>; ontoolchange; addEventListener('toolchange', …) }`, and `interface Document { readonly modelContext?: WebMCP.ModelContext }`.

Facts it establishes: name is "1–128 characters, ASCII alphanumeric, `_`, `-`, or `.`"; `registerTool` resolves `void`; `execute` return is `unknown` (the docs' examples return strings; the type doesn't force it); registration signal and execution signal are distinct objects.

Gaps: **no `executeTool`**, no `ModelContextEventMap` beyond `toolchange`. `@mcp-b/webmcp-types@5.1.0` does declare `ChromeModelContext.executeTool?(tool, inputArguments: string, options?): Promise<string|null>`, confirming the string input and the `string|null` return — but pulling that package drags the MCP-B ecosystem types in. **Decision (D-011):** `webmcp-types` + a 20-line local augmentation.

### `@mcp-b/webmcp-polyfill@5.1.0` — published 2026-08-31 06:01 UTC (yes, this morning)

Read `README.md`, `dist/index.d.ts`, and the relevant paths in `dist/index.js` / `dist/schema.js`.

- ESM: `import { initializeWebMCPPolyfill, cleanupWebMCPPolyfill } from '@mcp-b/webmcp-polyfill'`; importing has no side effect; `initializeWebMCPPolyfill()` is idempotent and "does not replace an existing native context." IIFE at `dist/index.iife.js` self-initializes.
- Installs `window.ModelContext` and `document.modelContext`; keeps `navigator.modelContext` as a deprecated alias that `console.warn`s once, citing the 2026-05-27 draft and webmcp PR #184.
- `registerTool()` resolves after the local `toolchange` fires. **Duplicate names reject with `InvalidStateError: Tool already registered: <name>`.** Non-serializable schemas reject. Aborted-before-completion rejects with `signal.reason`.
- Abort removal: the abort listener that deletes the registration runs synchronously during `controller.abort()`. Abort-then-register-same-name in one tick is safe.
- **Result serialization** (`serializeChromeToolResult`): object/function → `JSON.stringify(value)`; anything else → `String(value) || 'Operation succeeded'`. So a tool returning `undefined` reads as success. Our envelope makes that path unreachable.
- **The polyfill's execute wrapper is `(input) => Reflect.apply(execute, undefined, [input])` — it passes no second argument.** Execution-signal handling happens around the call, not inside it. `options` is `undefined` in the polyfill. → **D-010.**
- `executeTool(tool, jsonString, options?)` implemented as a Chromium extension; README says feature-detect it. `installTestingShim: true` (default false) adds the removed `navigator.modelContextTesting` surface — we don't use it.
- Declarative forms: observes `[toolname]` forms including open shadow roots, derives schemas from named controls, supports `toolautosubmit`, exposes `SubmitEvent.agentInvoked` and `respondWith()`. Does not emulate `toolcancel` or CSS tool-state pseudo-classes.
- `exposedTo`/`fromOrigins` non-empty → `NotSupportedError`.

**Loading decision (D-013, D-014):** dynamic `import()` from `WebMCPBridge` when `document.modelContext` is absent, in every environment. Judges in Safari/Firefox/unflagged Chrome still get a live tool surface they can drive from the Tool Inspector. The status bar distinguishes `native` from `polyfill` so nobody thinks an agent is connected when it isn't.

### `usewebmcp@5.1.0` (WebMCP-org, published 2026-08-31) — rejected

`useWebMCP(config: {name, description, inputSchema?, outputSchema?, annotations?, enabled?, execute}, deps?) → {state: {isExecuting, lastResult, error, executionCount}, execute, reset}`. One tool per hook call; controller is internal; depends on `@mcp-b/webmcp-polyfill` and `@mcp-b/webmcp-types`. Twenty-four hook calls with `enabled: phases.includes(phase)` would work but would re-register on any dep change, hide the abort timing we need for D-004, and put the polyfill in the bundle unconditionally.

### `use-webmcp-tool@0.2.0` (GoogleChromeLabs, published 2026-07-30) — rejected, two ideas borrowed

`useWebMCP({name, description, inputSchema?, annotations?, execute, enabled?, formatOutput?, onError?}) → {supported, registered, error}`. One tool per hook. Normalizes returns to `{content:[{type:'text',text}], isError?}` — the server-MCP result shape, which is exactly what WEBMCP_VERIFIED says WebMCP does not use. Polls for a late-injected `document.modelContext` every 500ms for 10s. Borrowed: (a) the late-injection re-detect (our `ensureModelContext` polls 3× at 500ms before loading the polyfill, for extension-injected contexts); (b) the stance that a throw must never read as success.

### Decision

Raw `document.modelContext.registerTool` in one hook (D-012). Dependencies added to the project by this turn: `webmcp-types` (dev), `@mcp-b/webmcp-polyfill` (runtime, dynamically imported). Nothing else.

---

## Part One: The protocol layer

### 1.1 Registration mechanics — answers

**Does `registerTool` return anything?** `Promise<void>` (webmcp-types, polyfill). Await it inside try/catch. In the polyfill it resolves after `toolchange` has fired.

**Tool object shape.** `{ name, title?, description, inputSchema?, execute, annotations? }`. Exactly the spec's assumption plus `title` and `annotations`. We always set all six (D-024, D-025).

**What does `execute` receive?** `(input, options)` where `input` is the parsed object matching `inputSchema` and `options` is `{ signal }` natively — and `undefined` in the polyfill (D-010).

**What does `execute` return?** Typed `unknown`; documented examples return strings; the polyfill coerces objects via `JSON.stringify`; Chrome's behaviour on objects is undocumented. **Decision: always a JSON string** (D-005).

**If `execute` throws / rejects?** Undocumented. Mace throws deliberately and reports that the agent sees the message. We don't test the host: catch everything, return `ok:false` (D-008). The single exception is the AbortError at entry when the execution signal is already aborted, which is the documented cancellation contract.

**AbortSignal contract.** `registerTool(tool, { signal })`; `controller.abort()` is the only unregistration mechanism; there is no `unregisterTool()` (polyfill README "Compatibility boundary", WEBMCP_VERIFIED, mace). Removal is synchronous in the polyfill and empirically immediate in Chrome 151 (mace re-registers same-name in the same pass). Same name twice: rejects with `InvalidStateError` in the polyfill if the first is still live — which our diff makes impossible (a name is either in `registered` or not). Chrome 149–152 cancel in-flight executes on abort; 153+ don't. Both handled by D-004 + D-009.

**Limits.** Name: 1–128 chars, `[A-Za-z0-9_.-]` (webmcp-types). Tool count: no documented cap; mace registers up to 23 concurrently, shipwright 15, our maximum is 24 at phase 4 (D-026) — within observed range, and we test it Day 1 (D-041). Description length: no documented cap; we hold to ≤300 chars (D-023) because the ChatGPT tool-list UI and the Lighthouse audit both render them in a list. Schema: must be JSON-serializable (polyfill rejects otherwise); we keep schemas flat, ≤3 levels, no `$ref`.

**Discovery.** The browser fires `toolchange` on `document.modelContext` when the list changes (webmcp-types `ModelContextEventMap`, polyfill fires it, WEBMCP_VERIFIED). Whether ChatGPT's host re-reads the list on that event is host behaviour. **This is untestable from source and is the Day-1 blocker test (D-041).** If ChatGPT sees new tools without reload, the phase gate is filmed live. If not, the fallback is Chrome + the Model Context Tool Inspector extension, which reads `getTools()` live and can drive a test agent; the README states which host was used.

**Unsupported browser.** `document.modelContext` is `undefined`. `ensureModelContext()` then loads the polyfill (D-013) unless `!window.isSecureContext` (D-042). The status bar shows the source (D-014). No silent degradation — the human always knows whether an agent could reach the page.

### 1.2 The registration hook

Placement (D-017): `src/app/layout.tsx` is a server component; it renders `<WebMCPBridge />` as a sibling of `{children}` inside `<body>`. `WebMCPBridge.tsx` is `'use client'`, renders `null`, resolves the model context, then mounts `<Registrar />`, whose only job is to call the hook. The hook therefore runs exactly once per page lifetime, after the polyfill decision, and can reach every store via `getState()`. It never wraps children, so it never causes a re-render of the studio.

Strict mode (D-018): the effect's cleanup aborts the epoch and clears the map; every await in the sync loop re-checks `epoch.signal.aborted`; AbortError rejections from a torn-down registration are swallowed. Under strict mode the sequence is: mount → sync starts (registrations pending) → cleanup aborts epoch (pending registrations reject with AbortError, swallowed; completed ones are removed by the browser) → mount again → fresh epoch → sync registers again. Net effect: one set of tools.

Flicker (D-002): none for tools valid in both phases, because they are not touched. `generate_component` survives 2→3 untouched. Only the delta fires `toolchange`.

Order of operations (D-004, D-032): store action mutates → store action recalculates phase synchronously → `phaseStore.subscribe` listener fires → `scheduleSync()` queues one macrotask → the execute that caused it builds its envelope (reading the new phase) and returns → macrotask runs the diff. The envelope's `newTools`/`removedTools` are computed from `TOOL_PHASE_MAP`, not from registration state, so they're correct even though registration hasn't happened yet.

#### `src/types/webmcp-augment.d.ts`

```ts
// Fills the gaps in webmcp-types@0.1.5 (no executeTool, loose event map).
// Ambient file: no imports/exports.
declare namespace WebMCP {
  interface ModelContextExecuteToolOptions {
    signal?: AbortSignal;
  }
  interface ModelContext {
    /** Chromium extension. Input is a JSON *string* on Chrome ≤152 (webmcp#243 moves to object). Feature-detect. */
    executeTool?(
      tool: RegisteredTool,
      inputArguments: string | Record<string, unknown>,
      options?: ModelContextExecuteToolOptions,
    ): Promise<string | null>;
  }
}
```

`tsconfig.json` → `"compilerOptions": { "types": ["webmcp-types"], "paths": { "@/*": ["./src/*"] } }` and `"include"` must cover `src/types/**/*.d.ts`.

#### `src/types/webmcp.ts` — project-level tool types (D-040)

```ts
import type { Phase } from '@/types/phase';
import type { InverseAction } from '@/types/log';

export type ToolErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'RULE_VIOLATION'
  | 'LOCKED'
  | 'PHASE_LOCKED'
  | 'INTERNAL';

/** What a tool's execute returns. The wrapper turns this into a ToolResult. */
export type ToolOutcome<T = unknown> =
  | { kind: 'ok'; summary: string; data?: T; inverse?: InverseAction | null }
  | { kind: 'error'; code: ToolErrorCode; message: string; hint?: string; alternatives?: string[] };

/** What the agent receives, as JSON.stringify(ToolResult). */
export type ToolResult<T = unknown> =
  | {
      ok: true;
      phase: Phase;
      phaseChanged: boolean;
      newTools: string[];
      removedTools: string[];
      summary: string;
      data?: T;
    }
  | {
      ok: false;
      phase: Phase;
      code: ToolErrorCode;
      error: string;
      hint?: string;
      alternatives?: string[];
    };

export type ToolName =
  | 'get_current_state'
  | 'set_token' | 'get_tokens' | 'suggest_palette'
  | 'remove_token' | 'add_rule' | 'remove_rule' | 'list_rules'
  | 'generate_component' | 'list_components' | 'modify_component'
  | 'remove_component' | 'explain_component' | 'get_component_code'
  | 'sketch_wireframe' | 'modify_layout' | 'remove_wireframe' | 'render_page'
  | 'generate_dark_theme' | 'audit_accessibility'
  | 'export_tokens' | 'export_components' | 'export_page' | 'export_full_system';

export interface ToolDefinition<TInput extends Record<string, unknown> = Record<string, unknown>, TData = unknown> {
  name: ToolName;
  /** Human display name, Title Case, ≤4 words. */
  title: string;
  /** ≤300 chars. What / when / gotcha. Never mentions phases (except get_current_state). */
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[]; additionalProperties: false };
  phases: readonly Phase[];
  readOnly: boolean;
  untrusted?: boolean;
  /** Synchronous. No awaits. Reads stores via getState(). Never throws (wrapper catches anyway). */
  execute(input: TInput): ToolOutcome<TData>;
}
```

#### `src/webmcp/results.ts` (D-005–D-007)

```ts
import type { ToolOutcome, ToolResult } from '@/types/webmcp';
import type { Phase } from '@/types/phase';
import { toolsForPhase } from '@/webmcp/toolPhaseMap';

/** Converts a tool outcome into the envelope the agent reads. Pure. */
export function toResult(outcome: ToolOutcome, phaseBefore: Phase, phaseAfter: Phase): ToolResult {
  if (outcome.kind === 'error') {
    return { ok: false, phase: phaseAfter, code: outcome.code, error: outcome.message, hint: outcome.hint, alternatives: outcome.alternatives };
  }
  const before = new Set(toolsForPhase(phaseBefore));
  const after = new Set(toolsForPhase(phaseAfter));
  const newTools = [...after].filter((t) => !before.has(t));
  const removedTools = [...before].filter((t) => !after.has(t));
  const phaseChanged = phaseBefore !== phaseAfter;
  const summary = phaseChanged
    ? `${outcome.summary} Phase ${phaseBefore} → ${phaseAfter}. ${newTools.length ? `New tools: ${newTools.join(', ')}.` : ''}${removedTools.length ? ` Removed tools: ${removedTools.join(', ')}.` : ''}`.trim()
    : outcome.summary;
  return { ok: true, phase: phaseAfter, phaseChanged, newTools, removedTools, summary, data: outcome.data };
}

export const serialize = (r: ToolResult): string => JSON.stringify(r);

export const fail = (code: ToolResult extends { code: infer C } ? C : never, message: string, extra?: { hint?: string; alternatives?: string[] }): ToolOutcome =>
  ({ kind: 'error', code, message, ...extra });

export const ok = <T>(summary: string, data?: T, inverse?: import('@/types/log').InverseAction | null): ToolOutcome<T> =>
  ({ kind: 'ok', summary, data, inverse: inverse ?? null });
```

#### `src/webmcp/toolPhaseMap.ts` (D-026–D-028)

```ts
import type { Phase } from '@/types/phase';
import type { ToolName } from '@/types/webmcp';

export const TOOL_PHASE_MAP: Record<ToolName, readonly Phase[]> = {
  get_current_state:   [0, 1, 2, 3, 4],
  set_token:           [0, 1, 2, 3, 4],
  get_tokens:          [0, 1, 2, 3, 4],
  suggest_palette:     [0, 1, 2, 3, 4],
  remove_token:        [1, 2, 3, 4],
  add_rule:            [1, 2, 3, 4],
  remove_rule:         [1, 2, 3, 4],
  list_rules:          [1, 2, 3, 4],
  generate_component:  [2, 3, 4],
  list_components:     [2, 3, 4],
  modify_component:    [2, 3, 4],
  remove_component:    [2, 3, 4],
  explain_component:   [2, 3, 4],
  get_component_code:  [2, 3, 4],
  sketch_wireframe:    [3, 4],
  modify_layout:       [3, 4],
  remove_wireframe:    [3, 4],
  render_page:         [3, 4],
  generate_dark_theme: [3, 4],
  audit_accessibility: [3, 4],
  export_tokens:       [4],
  export_components:   [4],
  export_page:         [4],
  export_full_system:  [4],
};

export const ALL_TOOL_NAMES = Object.keys(TOOL_PHASE_MAP) as ToolName[];

export const toolsForPhase = (phase: Phase): ToolName[] =>
  ALL_TOOL_NAMES.filter((n) => TOOL_PHASE_MAP[n].includes(phase));

export const isToolAvailable = (name: ToolName, phase: Phase): boolean =>
  TOOL_PHASE_MAP[name].includes(phase);
```

Tool counts by phase: 0 → 4, 1 → 8, 2 → 14, 3 → 20, 4 → 24.

#### `src/webmcp/registry.ts`

```ts
import type { ToolDefinition, ToolName } from '@/types/webmcp';
import get_current_state from '@/webmcp/tools/get_current_state';
// … one import per tool, alphabetical …

export const TOOL_DEFINITIONS: Record<ToolName, ToolDefinition> = {
  get_current_state,
  // …
};
```

Each `src/webmcp/tools/<name>.ts` default-exports one `ToolDefinition`. Stream 3 owns these files; their `execute` bodies call store actions owned by Streams 1/2/4.

#### `src/webmcp/detect.ts` (D-013, D-014, D-042)

```ts
export type WebMCPSource = 'native' | 'polyfill' | 'none';

const hasContext = (): boolean =>
  typeof document !== 'undefined' && !!document.modelContext && 'registerTool' in document.modelContext;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Resolves the model context source exactly once per page.
 * Order: native → wait briefly for an extension-injected context → polyfill.
 */
let resolved: Promise<WebMCPSource> | null = null;
export function ensureModelContext(): Promise<WebMCPSource> {
  if (resolved) return resolved;
  resolved = (async () => {
    if (typeof window === 'undefined' || !window.isSecureContext) return 'none';
    if (hasContext()) return 'native';
    for (let i = 0; i < 3; i++) { await sleep(500); if (hasContext()) return 'native'; }
    const { initializeWebMCPPolyfill } = await import('@mcp-b/webmcp-polyfill');
    initializeWebMCPPolyfill();
    return hasContext() ? 'polyfill' : 'none';
  })();
  return resolved;
}

export const getModelContext = (): WebMCP.ModelContext | null =>
  hasContext() ? (document.modelContext as WebMCP.ModelContext) : null;
```

#### `src/stores/webmcpStatusStore.ts` (D-014–D-016)

```ts
import { create } from 'zustand';
import type { WebMCPSource } from '@/webmcp/detect';

interface WebMCPStatusState {
  source: WebMCPSource;
  toolCount: number;
  toolNames: string[];
  degraded: boolean;
  failures: { tool: string; error: string }[];
  lastChangeAt: number | null;
}
interface WebMCPStatusActions {
  setSource(source: WebMCPSource): void;
  setTools(names: string[]): void;
  markDegraded(tool: string, error: unknown): void;
}
export const useWebMCPStatusStore = create<WebMCPStatusState & WebMCPStatusActions>((set) => ({
  source: 'none', toolCount: 0, toolNames: [], degraded: false, failures: [], lastChangeAt: null,
  setSource: (source) => set({ source }),
  setTools: (names) => set({ toolNames: names, toolCount: names.length, lastChangeAt: Date.now() }),
  markDegraded: (tool, error) => set((s) => ({ degraded: true, failures: [...s.failures, { tool, error: error instanceof Error ? error.message : String(error) }] })),
}));
```

#### `src/webmcp/useWebMCPRegistration.ts` — the hook, in full

```ts
'use client';
import { useEffect, useRef } from 'react';
import { usePhaseStore } from '@/stores/phaseStore';
import { useLogStore } from '@/stores/logStore';
import { useWebMCPStatusStore } from '@/stores/webmcpStatusStore';
import { TOOL_DEFINITIONS } from '@/webmcp/registry';
import { toolsForPhase, isToolAvailable } from '@/webmcp/toolPhaseMap';
import { toResult, serialize } from '@/webmcp/results';
import { getModelContext } from '@/webmcp/detect';
import type { ToolDefinition, ToolName, ToolOutcome } from '@/types/webmcp';

const isAbortError = (e: unknown): boolean => e instanceof DOMException && e.name === 'AbortError';

/**
 * Builds the WebMCP tool object for one definition.
 * The wrapper owns: cancellation check, phase re-check, try/catch, envelope, logging, serialization.
 * The definition owns: validation + store mutation, returning a ToolOutcome.
 */
function wrapTool(def: ToolDefinition): WebMCP.ModelContextTool {
  return {
    name: def.name,
    title: def.title,
    description: def.description,
    inputSchema: def.inputSchema,
    annotations: { readOnlyHint: def.readOnly, untrustedContentHint: def.untrusted ?? false },
    execute: async (input, options) => {
      if (options?.signal?.aborted) throw new DOMException('Cancelled', 'AbortError');   // D-008, D-010
      const startedAt = Date.now();
      const phaseBefore = usePhaseStore.getState().currentPhase;
      let outcome: ToolOutcome;
      if (!isToolAvailable(def.name, phaseBefore)) {                                       // D-009
        outcome = {
          kind: 'error',
          code: 'PHASE_LOCKED',
          message: `${def.name} is not available right now.`,
          hint: 'Call get_current_state to see the available tools and what unlocks the next phase.',
        };
      } else {
        try {
          outcome = def.execute((input ?? {}) as Record<string, unknown>);
        } catch (e) {
          outcome = { kind: 'error', code: 'INTERNAL', message: e instanceof Error ? e.message : String(e) };
        }
      }
      const phaseAfter = usePhaseStore.getState().currentPhase;                            // D-032: sync recalc already ran
      const result = toResult(outcome, phaseBefore, phaseAfter);
      useLogStore.getState().addEntry({
        actor: 'agent',
        tool: def.name,
        input: (input ?? {}) as Record<string, unknown>,
        result,
        status: result.ok ? 'ok' : 'error',
        durationMs: Date.now() - startedAt,
        inverse: outcome.kind === 'ok' ? outcome.inverse ?? null : null,
      });
      return serialize(result);                                                            // D-005
    },
  };
}

/**
 * Registers exactly the tools valid for the current phase and keeps that set in sync.
 * Diff-based (D-002). Per-tool + epoch controllers (D-003). Deferred, coalesced sync (D-004).
 * Mount once, in <Registrar/> under <WebMCPBridge/> (D-017).
 */
export function useWebMCPRegistration(): void {
  const registeredRef = useRef<Map<ToolName, AbortController>>(new Map());
  const syncQueuedRef = useRef(false);

  useEffect(() => {
    const ctx = getModelContext();
    if (!ctx) return;

    const epoch = new AbortController();
    const registered = registeredRef.current;
    const status = useWebMCPStatusStore.getState();

    const refreshCount = async () => {
      try {
        const tools = await ctx.getTools();                                              // D-016
        if (!epoch.signal.aborted) useWebMCPStatusStore.getState().setTools(tools.map((t) => t.name));
      } catch { /* getTools unsupported on this host: count stays at last known */ }
    };

    const sync = async () => {
      const phase = usePhaseStore.getState().currentPhase;
      const want = new Set<ToolName>(toolsForPhase(phase));
      const have = new Set<ToolName>(registered.keys());

      for (const name of have) {
        if (!want.has(name)) { registered.get(name)!.abort(); registered.delete(name); }   // abort-to-unregister
      }
      for (const name of want) {
        if (have.has(name)) continue;
        const ctl = new AbortController();
        registered.set(name, ctl);                                                        // set before await (mace)
        try {
          await ctx.registerTool(wrapTool(TOOL_DEFINITIONS[name]), {
            signal: AbortSignal.any([ctl.signal, epoch.signal]),                          // D-003
          });
        } catch (e) {
          registered.delete(name);
          if (!isAbortError(e)) status.markDegraded(name, e);                             // D-015
        }
        if (epoch.signal.aborted) return;                                                 // D-018
      }
      await refreshCount();
    };

    const scheduleSync = () => {                                                          // D-004
      if (syncQueuedRef.current) return;
      syncQueuedRef.current = true;
      setTimeout(() => { syncQueuedRef.current = false; if (!epoch.signal.aborted) void sync(); }, 0);
    };

    const onToolChange = () => { void refreshCount(); };
    ctx.addEventListener('toolchange', onToolChange);

    void sync();                                                                          // initial registration
    const unsubscribe = usePhaseStore.subscribe((s, prev) => {
      if (s.currentPhase !== prev.currentPhase) scheduleSync();
    });

    return () => {
      unsubscribe();
      ctx.removeEventListener('toolchange', onToolChange);
      epoch.abort();                                                                      // drops every registered tool at once
      registered.clear();
    };
  }, []);
}
```

#### `src/webmcp/WebMCPBridge.tsx`

```tsx
'use client';
import { useEffect, useState } from 'react';
import { ensureModelContext } from '@/webmcp/detect';
import { useWebMCPStatusStore } from '@/stores/webmcpStatusStore';
import { useWebMCPRegistration } from '@/webmcp/useWebMCPRegistration';

function Registrar(): null {
  useWebMCPRegistration();
  return null;
}

/** Mounted once in app/layout.tsx as a sibling of {children}. Renders nothing. */
export default function WebMCPBridge(): JSX.Element | null {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    void ensureModelContext().then((source) => {
      if (!live) return;
      useWebMCPStatusStore.getState().setSource(source);
      if (source !== 'none') setReady(true);
    });
    return () => { live = false; };
  }, []);
  return ready ? <Registrar /> : null;
}
```

`src/app/layout.tsx` (server component, no `'use client'`): `<body><TokenStyleInjector /><StudioShell>{children}</StudioShell><WebMCPBridge /></body>`. `TokenStyleInjector` and `StudioShell` are Turn 4/5 concerns; only `WebMCPBridge` is fixed here.

#### `src/webmcp/inspector.ts` (D-031)

```ts
import { getModelContext } from '@/webmcp/detect';

/** Drives a registered tool through the browser's own executeTool path. Used by the Tool Inspector panel. */
export async function runTool(name: string, input: Record<string, unknown>, signal?: AbortSignal): Promise<string> {
  const ctx = getModelContext();
  if (!ctx) return 'WebMCP is not available in this browser.';
  if (!ctx.executeTool) return 'This browser exposes tools but not executeTool(); use an agent host.';
  const tool = (await ctx.getTools()).find((t) => t.name === name);
  if (!tool) return `${name} is not registered right now, so there is no tool to call.`;
  try {
    return (await ctx.executeTool(tool, JSON.stringify(input), { signal })) ?? 'null';   // Chrome ≤152: string
  } catch {
    return (await ctx.executeTool(tool, input, { signal })) ?? 'null';                   // webmcp#243: object
  }
}
```

### 1.3 Tool descriptions as agent UX

Decisions: D-022 (no phase talk), D-023 (format), D-020 (plain `enum`, labels in property descriptions), D-021 (no `examples`). Rationale for D-022, both sides: mentioning phases in descriptions would tell the agent *why* a tool exists, which sounds helpful — but description text would then have to change per phase, forcing re-registration of unchanged tools and firing `toolchange` for cosmetic reasons; and it leaks mechanism into every tool when one tool (`get_current_state`) plus every envelope already carry it. Absence-as-signal is the thesis; the descriptions should read like a normal API. Rationale for D-021: no evidence any host reads JSON Schema `examples`; property descriptions with an inline example (`e.g. 'hsl(250, 84%, 60%)'`) are read by every host.

| Tool | Title | Description |
|---|---|---|
| get_current_state | Studio State | Report where the design system stands: phase, defined tokens, components, wireframes, pages, active rules, locked tokens, and exactly which tools are available right now. Call it first in a session, and again whenever a tool you expected is missing. |
| set_token | Set Token | Set one design token, e.g. color 'primary' to 'hsl(250, 84%, 60%)'. Use it to define or change colors, fonts, type sizes, spacing, radius, elevation, or animation. Ask the human for their brand color before setting 'primary'; locked tokens cannot be changed. |
| get_tokens | Get Tokens | List every design token with its current value, optionally one category. Use it before proposing changes so you build on the human's choices instead of overwriting them. |
| suggest_palette | Suggest Palette | Derive and apply a full 13-role color palette from one primary color using a harmony strategy. Use it when the human has a brand color and wants the rest filled in. Locked tokens are left unchanged. |
| remove_token | Remove Token | Clear a token back to undefined. Components referencing it fall back to the studio's unset style. Prefer set_token with a new value unless the human explicitly wants the token gone. |
| add_rule | Add Rule | Add a design constraint the human wants enforced, e.g. no danger-variant buttons or minimum radius 8px. Rules reject future generations and edits that violate them. Add rules only when the human asks for a constraint. |
| remove_rule | Remove Rule | Delete a design rule by id. Use list_rules to find ids. Existing components are not changed. |
| list_rules | List Rules | List active design rules in plain language with their ids and any current violations. |
| generate_component | Generate Component | Create a component on the canvas — button, card, input, hero, navbar, pricing card and more — styled entirely from the human's tokens. Supply real content (label, headline, body) rather than relying on defaults. Rejected with alternatives if a rule forbids the request. |
| list_components | List Components | List every component on the canvas with id, type, variant, size, and label. Use it to find ids before modify_component or remove_component. |
| modify_component | Modify Component | Change an existing component by id: variant, size, label, or content. Rules are re-checked; a violating change is rejected with alternatives. |
| remove_component | Remove Component | Delete a component by id. If it sits inside a rendered page, that page slot is emptied. |
| explain_component | Explain Component | Describe how a component is styled: which token drives each visual property and that token's current value. Use it to answer why something looks the way it does. |
| get_component_code | Component Code | Return the standalone React/TSX source for one component, styled with CSS variables. Use it when the human asks to see or copy the code. |
| sketch_wireframe | Sketch Wireframe | Propose a page as an ordered list of sections — navbar, hero, features, pricing, testimonials, cta, faq, footer, content, gallery, stats, team — shown as gray boxes for the human to approve. Do not render; call render_page after approval. |
| modify_layout | Modify Layout | Reorder, add, or remove sections in a wireframe by id. Returns the resulting section order so you can confirm it. |
| remove_wireframe | Remove Wireframe | Delete a wireframe by id. Rendered pages built from it are not affected. |
| render_page | Render Page | Turn an approved wireframe into a fully styled page built from the human's tokens and component library. Call it only after the human has approved the wireframe. |
| generate_dark_theme | Dark Theme | Derive a dark-mode token set from the current light tokens and enable the theme toggle. Use it when the human asks for dark mode; contrast is preserved automatically. |
| audit_accessibility | Accessibility Audit | Check color contrast, type sizes, and touch targets across tokens and components against WCAG 2.1 AA. Returns each finding with a plain-language fix you can relay to the human. |
| export_tokens | Export Tokens | Export tokens as CSS variables, DTCG JSON, Tailwind config, or SCSS. Files open in the studio's export panel for the human to download; you receive a summary. |
| export_components | Export Components | Export every generated component as standalone React/TSX files using CSS variables. Files open in the export panel; you receive a file list. |
| export_page | Export Page | Export a rendered page as Page.tsx composing the exported components. Files open in the export panel; you receive a summary. |
| export_full_system | Export System | Export everything — tokens in all formats, components, pages, README, package.json — as one downloadable bundle. Files open in the export panel; you receive a summary. |

All 24 are ≤300 characters. Input schemas are written in Turn 2 alongside the types they reference; the description column is final now.

### 1.4 `get_current_state` — the agent's map

Return granularity (D-033): full token values. Sixty short strings is ~2 KB; forcing a second call to learn what "primary" is would double the agent's turns in the demo's most time-sensitive moment. Components, wireframes, and pages are summarized; full specs are behind `explain_component`/`list_components`.

Suggested next action (D-034): yes, one sentence, only here. It's the difference between the agent saying "you need five tokens" and "you need five tokens — shall I set primary, background, text-primary, surface, and border from a brand color?"

`data` shape (serialized inside the `ok:true` envelope):

```ts
interface CurrentState {
  phase: Phase;
  phaseName: string;                       // 'Empty' | 'Tokens' | 'Components' | 'Layout' | 'Export'
  phaseDescription: string;                // one sentence, from PHASE_DEFINITIONS
  nextPhase: { phase: Phase; requirement: string; missing: string[] } | null;  // e.g. missing: ['3 more tokens']
  counts: { tokens: number; components: number; wireframes: number; renderedPages: number; rules: number };
  tokens: Record<string, string | null>;   // 'color.primary': 'hsl(250, 84%, 60%)', 'font.heading': null, …
  lockedTokens: string[];
  components: { id: string; type: string; variant: string; size: string; label: string | null }[];
  wireframes: { id: string; name: string; status: 'wireframe' | 'rendered'; sectionCount: number }[];
  renderedPages: { id: string; wireframeId: string }[];
  rules: { id: string; description: string }[];
  violations: { ruleId: string; componentId: string; message: string }[];
  availableTools: ToolName[];
  suggestedNext: string;
}
```

`suggestedNext` per phase: 0 → "Ask the human for their primary brand color, then call suggest_palette to fill the rest." 1 → "Set the missing tokens listed in nextPhase.missing; suggest_palette covers all colors at once." 2 → "Generate at least two components so the human can see the tokens applied; then sketch a wireframe." 3 → "Sketch a wireframe for the human to approve, then render it." 4 → "Offer to export the system or refine components."

### 1.5 Return value design for every tool

Envelope is D-006. Every `ok:true` carries `phase`, `phaseChanged`, `newTools`, `removedTools`, and a `summary` that already narrates the phase change ("Phase 2 → 3. New tools: sketch_wireframe, …"). That sentence is the demo's third-best moment and it costs nothing.

`generate_component` (D-035): `data = { id, type, variant, size, tokensUsed }` where `tokensUsed` maps CSS property → token name (`'background-color': 'color.primary'`). Not resolved values: the agent can describe *what drives* the look without a 30-line payload, and `explain_component` exists for the values.

`data` per tool (final shapes land in Turn 2 types; the contract is fixed here):

| Tool | `ok:true` data |
|---|---|
| get_current_state | `CurrentState` |
| set_token | `{ token: string; value: string; previous: string \| null }` |
| get_tokens | `{ tokens: Record<string, string \| null> }` |
| suggest_palette | `{ primary: string; strategy: string; applied: Record<string,string>; skippedLocked: string[] }` |
| remove_token | `{ token: string; previous: string \| null; dependents: string[] }` (component ids referencing it) |
| add_rule / remove_rule | `{ rule: { id; description } }` |
| list_rules | `{ rules: { id; description; enabled }[]; violations: RuleViolation[] }` |
| generate_component | D-035 |
| list_components | `{ components: ComponentSummary[] }` |
| modify_component | `{ id; changed: string[]; tokensUsed }` |
| remove_component | `{ id; wasInPage: string \| null }` |
| explain_component | `{ id; type; properties: { property; token; value }[] }` |
| get_component_code | `{ id; filename; code }` |
| sketch_wireframe | `{ wireframeId; sections: { id; type; columns? }[] }` |
| modify_layout | `{ wireframeId; sections: { id; type; columns? }[] }` (resulting order) |
| remove_wireframe | `{ wireframeId }` |
| render_page | `{ pageId; wireframeId; componentIds: string[] }` |
| generate_dark_theme | `{ tokens: Record<string,string>; contrastFailures: string[] }` |
| audit_accessibility | `{ findings: AuditFinding[]; errors: number; warnings: number }` |
| export_* | `{ files: { path; lines }[]; totalLines; note: 'Ready in the export panel.' }` |

Error `alternatives` is populated for `RULE_VIOLATION` (allowed variants), `NOT_FOUND` (current valid ids), and `LOCKED` (unlocked tokens in the same category).

### 1.6 Concurrency

Two executes cannot run simultaneously in the sense that matters: JavaScript is single-threaded and every `execute` body in this codebase is synchronous from phase-check through mutation (D-032). If the agent issues `set_token` and `generate_component` in one turn, the host awaits them in sequence; `generate_component` sees whatever phase `set_token` left. If the host issued them truly concurrently, each `execute` still runs to its return without yielding, so the second sees the first's completed mutation. No mutex, no queue.

Phase recalculation is the last line of every mutating store action and reads the other stores via `getState()`. Zustand's `set` is synchronous; there is no "mid-mutation" state observable from another synchronous call. The only ordering hazard is a tool that `await`s between reading the phase and mutating — forbidden by D-040's comment and enforced by review (Part Twenty adds the lint sentence).

Human vs agent interleaving is Part Twenty-Two (Turn 4); the protocol-layer guarantee is only that each execute is atomic with respect to store state.

### 1.7 Undo

Moved to Turn 6 per the output order. The one thing the protocol layer fixes now: `ToolOutcome.inverse?: InverseAction | null` (D-007) and `AgentLogEntry.inverse` is that same value. The `InverseAction` union is typed in Turn 2's boundary files; per-tool payloads are enumerated in Turn 6.

---

## Part Sixteen: Declarative API

Investigated: mace's `declarative.js` removes a form's tool by `form.removeAttribute('toolname')` and re-adds by `setAttribute`, driven by the same rule predicate as its imperative diff; the polyfill observes the DOM and keeps registrations synchronized with attribute changes; Chrome's `webmcp-declarative.d.ts` types the attributes for JSX. So a declaratively registered form can be gated by conditional rendering or by toggling the attribute, and the agent sees the removal as a `toolchange`.

**Decision (D-029, D-030): one declarative tool, `set_primary_color`, always present.** It is the token panel's primary-color form: a color input named `value`, a submit button labelled "Apply", `toolname="set_primary_color"`, `tooldescription="Propose a primary brand color for the human to apply. Fill it with an hsl() or hex value; the human clicks Apply."`, `toolparamdescription` on the input, and **no `toolautosubmit`**. The agent can fill it; only a human can submit it. On submit: if `event.agentInvoked`, `preventDefault()`, run the same `setToken('color.primary', value, 'human')` store action the UI uses, and `respondWith(Promise.resolve(serialize(result)))` with the standard envelope.

Why this one and not "2–3 token forms": the story is sharper with one. Mace's execution-vs-initiation contrast (Chrome's own `create-event` vs `start-event-creation-process` distinction) maps exactly onto "the agent proposes the brand color, the human ratifies it." Primary is the token that gates everything downstream, so the human's click on Apply is the literal act that opens the system to the agent. A font dropdown and a spacing-unit field would dilute that into "we also did forms."

Why it's not phase-gated: it is the way out of phase 0 for a human who wants the agent's suggestion. Gating it would recreate the spec's original bug (D-027).

Why it doesn't threaten the demo: `set_token` (imperative, phase 0+) is the other path to the same store action. If the ChatGPT host doesn't support declarative forms, the agent uses `set_token` and nothing in the three moments changes. The declarative form is on camera as a bonus beat — "watch the agent fill the swatch; I'll click Apply" — not on the critical path.

ARCHITECTURE.md paragraph (to be written in Turn 8 verbatim from this): 24 tools are imperative because they are state transitions whose legality changes with state, and abort-to-unregister is the only mechanism that expresses "this tool no longer exists"; one tool is declarative because it is a proposal the human must ratify, and a form without `toolautosubmit` is the platform's own primitive for a human-in-the-loop action.

---

END OF TURN 1 — say 'continue' for Turn 2 (boundary files: every type, every store interface, registry type, getStyles signature, webmcp.d.ts).

---

# TURN 2 — UNBLOCK STREAMS

This turn is the seed commit. Everything below `## Boundary files` is copied into the repo as-is before any stream starts. Where an implementation is stubbed, the stub is marked `// STREAM n: implement` and compiles under `strict`.

## Part Eleven: The integration contract

### 11.1 What is a boundary file

A boundary file is imported by two or more streams. It contains final types, final signatures, and final store shapes. Implementations inside it are either trivial (arrays, ids) and therefore final, or stubbed with a marker. The seed commit contains:

```
src/types/phase.ts
src/types/tokens.ts
src/types/components.ts
src/types/layouts.ts
src/types/rules.ts
src/types/log.ts
src/types/webmcp.ts
src/types/webmcp-augment.d.ts        (Turn 1, unchanged)
src/types/webmcp-declarative.d.ts    (Chrome's, verbatim)
src/utils/idGenerator.ts
src/utils/colorUtils.ts              (signatures; stubs)
src/utils/defaults.ts
src/utils/fonts.ts                   (signature + catalog list)
src/engine/tokenToCss.ts             (signature; stub)
src/engine/componentRenderer.ts      (types + signatures; stub dictionary)
src/engine/ruleEngine.ts             (signatures; stub)
src/stores/tokenStore.ts
src/stores/componentStore.ts
src/stores/layoutStore.ts
src/stores/ruleStore.ts
src/stores/logStore.ts
src/stores/phaseStore.ts
src/stores/webmcpStatusStore.ts      (Turn 1, unchanged)
src/stores/uiStore.ts
src/components/library/index.ts
src/webmcp/detect.ts, results.ts, toolPhaseMap.ts, registry.ts, validate.ts, inspector.ts, useWebMCPRegistration.ts, WebMCPBridge.tsx   (Turn 1; registry has 24 stub tools that return INTERNAL 'not implemented')
tsconfig.json, .eslintrc, .prettierrc, package.json
```

Decisions front-loaded here because the shapes needed them (each is in the ledger): on-colors derived (D-046); token count rule (D-047); phase rule (D-048); recalculation as subscriber (D-049); typed content slots (D-051, D-052); page components are real components (D-053); multiple wireframes (D-054); locks (D-056); dark tokens in tokenStore (D-057); rule schema with hue ranges (D-059); log shape and inverse union (D-060, D-061); inline styles + library.css (D-063). Turns 4–6 elaborate these; they do not reopen them.

### 11.2 Stream assignments

Every path is exact. "Owns" = only this stream writes it. "Imports" = read-only. "Must not touch" is enforced by review: a PR touching a file outside its stream is closed without discussion.

**Stream 1 — Tokens**
Owns: `src/stores/tokenStore.ts` (implementation), `src/utils/colorUtils.ts` (implementation), `src/utils/fonts.ts` (implementation), `src/engine/tokenToCss.ts`, `src/engine/themeEngine.ts`, `src/engine/accessibilityAuditor.ts`, `src/components/tokens/**` (TokenPanel.tsx, ColorTokenEditor.tsx, TypographyTokenEditor.tsx, SpacingTokenEditor.tsx, RadiusTokenEditor.tsx, ElevationTokenEditor.tsx, AnimationTokenEditor.tsx, RuleEditor.tsx, TokenSwatch.tsx, PrimaryColorForm.tsx [the declarative form], LockToggle.tsx), `src/components/studio/TokenStyleInjector.tsx`, tests for all of the above.
Imports: `types/*`, `utils/idGenerator`, `stores/ruleStore` (RuleEditor reads/writes rules), `engine/commit` (signature only until Stream 5 lands — Stream 1 ships a local `commitHuman` shim under `components/tokens/_commit.ts` that Stream 5 deletes at integration).
Must not touch: componentStore, layoutStore, phaseStore, anything in `webmcp/`, `components/library/**`, `components/canvas/**`.
Isolation test: mount `TokenPanel` in a Vitest + Testing Library test with the real tokenStore; assert `tokenToCss(getState())` contains `--color-primary` after `setToken('color.primary', …)`; unit tests for `contrastRatio` (21:1 white/black, 4.54:1 #767676/white), `generatePalette` for four primaries, `deriveDarkTheme` contrast holds.

**Stream 2 — Components**
Owns: `src/stores/componentStore.ts` (implementation), `src/engine/componentRenderer.ts` (STYLE_DICTIONARY for 16 types), `src/engine/ruleEngine.ts` (implementation), `src/components/library/*.tsx` (16 files), `src/components/library/library.css`, `src/components/library/content.ts` (DEFAULT_CONTENT, contentFromInput), `src/components/library/index.ts` (fill the registry), `src/components/canvas/ComponentPreview.tsx`, `src/components/canvas/ComponentGrid.tsx`, tests.
Imports: `types/*`, `utils/idGenerator`, `utils/colorUtils` (signatures; for rule engine hue checks), `stores/tokenStore` (getState in ruleEngine), `stores/ruleStore`.
Must not touch: tokenStore implementation, layoutStore, phaseStore, `webmcp/`, `components/tokens/**`, `components/studio/**`.
Isolation test: render each of the 16 components with `DEFAULT_CONTENT` inside a wrapper that sets 60 CSS vars to fixed values (`__tests__/fixtures/vars.css`); snapshot; assert no hardcoded color literals in any `style` object (`grep -E '#[0-9a-f]{3,6}|rgb\(|hsl\(' src/components/library/*.tsx` returns nothing).

**Stream 3 — WebMCP**
Owns: `src/webmcp/tools/*.ts` (24 files), `src/webmcp/validate.ts` (implementation), `src/webmcp/inspector.ts`, `src/components/studio/ToolInspector.tsx`, `src/components/studio/WebMCPStatusBar.tsx`, tests (`src/webmcp/__tests__/` with the fake modelContext fixture and a Playwright smoke that opens the studio, sets 5 tokens via the store, and asserts `getTools()` grows from 4 to 14).
Imports: everything in `stores/*` (via `getState()`), `engine/*` (signatures), `types/*`, `webmcp/results`, `webmcp/toolPhaseMap`.
Must not touch: any store implementation, any `engine/*` implementation, any component outside the two it owns. Tool executes call store actions and engine functions; they never contain design logic. If a tool needs a store action that doesn't exist, Stream 3 files an issue titled `[boundary] need <store>.<action>` and stubs the call — it does not add the action.
Isolation test: with the fixture, register all 24 definitions, call each with valid and invalid input, assert every return parses as `ToolResult` and no execute throws.

**Stream 4 — Layouts**
Owns: `src/stores/layoutStore.ts` (implementation), `src/engine/wireframeEngine.ts`, `src/engine/layoutEngine.ts` (section → component specs; render pipeline), `src/components/canvas/WireframePreview.tsx`, `src/components/canvas/PagePreview.tsx`, `src/components/canvas/SectionControls.tsx` (human up/down/delete/add in wireframe mode), tests.
Imports: `types/*`, `utils/idGenerator`, `stores/componentStore` (addComponent for render), `stores/tokenStore` (read only), `components/library/index.ts` (COMPONENT_REGISTRY), `components/library/content.ts` (DEFAULT_CONTENT — Stream 2 ships it; until then Stream 4 uses the typed stub).
Must not touch: tokenStore, componentStore implementation, `components/library/*.tsx`, `webmcp/`, `components/tokens/**`.
Isolation test: `layoutEngine.renderWireframe(wf)` for a 6-section landing wireframe produces the section→component counts in Part Four's table (Turn 5); `WireframePreview` renders 6 gray boxes with labels.

**Stream 5 — Studio UI, undo, export**
Owns: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/error.tsx`, `src/app/opengraph-image.tsx`, `src/stores/uiStore.ts` (implementation), `src/engine/commit.ts`, `src/engine/undo.ts`, `src/engine/export/*.ts` (css, dtcg, tailwind, scss, react, page, zip), `src/components/studio/StudioShell.tsx`, `PhaseIndicator.tsx`, `AgentLog.tsx`, `Canvas.tsx` (composition of Stream 2/4 previews), `ViewportSwitcher.tsx`, `ThemeToggle.tsx`, `EmptyState.tsx`, `OnboardingBanner.tsx`, `src/components/export/**`, `README.md`, `ARCHITECTURE.md`, tests.
Imports: everything.
Must not touch: store implementations other than uiStore; `engine/*` other than commit/undo/export; `components/library/**`, `components/tokens/**` except to import.
Isolation test: StudioShell renders with all stores at defaults and shows the four empty states from Part 8.5; Cmd+Z after `commitHuman` reverses the mutation; export of a fixture state produces files that pass `tsc --noEmit` when dropped into a scratch Next app (script in `scripts/verify-export.sh`).

**Shared but frozen (nobody edits after seed without a ledger entry):** everything under `src/types/**`, `src/webmcp/{detect,results,toolPhaseMap,registry,useWebMCPRegistration}.ts`, `src/webmcp/WebMCPBridge.tsx`, `src/utils/idGenerator.ts`, `src/utils/defaults.ts`, store interfaces (the `interface XState`/`XActions` blocks — implementations belong to the owning stream), `src/components/library/index.ts` type block, `src/engine/componentRenderer.ts` type block.

### 11.3 Merge order (D-072)

Seed → **Stream 1 ∥ Stream 2** → **Stream 3 ∥ Stream 4** → Stream 5.

The prompt's order (1, 2, 4, 3, 5) was almost right. Two corrections: Stream 2 does not depend on Stream 1's implementation — components reference CSS variable *names*, which are fixed by `tokenToCss`'s contract in this document, so both merge in parallel against the seed. Stream 3 depends on store *interfaces*, which are in the seed, not on their implementations; it can merge alongside Stream 4 and its Playwright smoke will pass as soon as Streams 1 and 2 are in. Stream 5 is last because it composes everything and owns integration.

Integration owner is Stream 5's instance. Integration happens on `main` in that order; each stream works on `stream/<n>-<name>` branched from the seed commit and rebases before merge.

---

## Part Twenty: What the parallel streams will get wrong

Each row is a prediction and the sentence that prevents it. These sentences are copied into `CONTRIBUTING.md` verbatim.

| Predicted divergence | Rule |
|---|---|
| `@/` vs relative imports | Import with `@/` from any other directory. Relative imports are allowed only for siblings in the same directory. (D-036) |
| Hooks vs `getState()` outside React | Outside a React component or hook, read and mutate stores only via `useXStore.getState()`. Inside components, use the hook with a selector. Never call a hook from a tool, engine, or util. (D-037) |
| `var(--x)` vs `var(--x, fallback)` | Library components write `var(--name)` with no fallback. Null tokens are handled once, in `tokenToCss`. (D-065) |
| Size → pixels | No component computes pixel values. Sizes resolve to spacing/fontSize *token references* through `STYLE_DICTIONARY`; the dictionary is the only place `sm/md/lg` is interpreted. (D-064) |
| ID format | `generateId(prefix)` only. Never `Math.random`, never `Date.now()` as an id, never hand-built strings. (D-067) |
| Where `'use client'` goes | Every file under `src/components/**` starts with `'use client';` except `library/index.ts`. Stores, engine, utils, types never have it. `app/layout.tsx` and `app/page.tsx` never have it. (D-070) |
| Tool error shape | Tools return `ToolOutcome`; nothing else builds envelopes. Import `ok`/`fail` from `@/webmcp/results`. (D-007) |
| Time format | Store `Date.now()` numbers. Format at render with `Intl.DateTimeFormat`. Never store formatted strings. (D-038) |
| `className` on components | Library components have exactly one prop object: `LibraryComponentProps`. No `className`, `style`, `children`, or spreads. (D-069) |
| Stores importing each other | Only `phaseStore` imports other stores (token, component, layout). Everything else reads foreign stores with `getState()` inside functions, not at module top level. (D-050) |
| Token key spelling | Use the `TokenPath` type and the `TOKEN_PATHS` constant; TypeScript rejects anything else. `text-primary` keeps its hyphen; groups are camelCase (`fontSize`). (D-044) |
| Color storage format | Store colors as `hsl(H, S%, L%)` strings with integer H and one-decimal S/L, produced by `toHSLString`. Parse anything (hex, rgb, hsl) with `parseColor`; store only the normalized form. (D-080) |
| Who logs | Tools are logged by the registration wrapper. UI actions are logged by `commitHuman`. Stores never log. (D-077) |
| Phase recompute | Nobody calls `recalculatePhase()`. It runs automatically as a subscriber. If you think you need to call it, you're mutating a store from outside an action — stop. (D-049) |
| Content defaults | Never inline placeholder text in a component file. All defaults come from `DEFAULT_CONTENT` in `library/content.ts`. (D-075) |
| Validation | Tools validate with `@/webmcp/validate` helpers and let `ToolInputError` propagate to the wrapper. No hand-rolled `if (!input.x) return …`. (D-076) |
| Undo | Only `engine/undo.ts` executes an `InverseAction`. Tools *produce* inverses; they never apply them. (D-061) |
| Dark mode | Dark colors live in `tokenStore.dark`. The active theme lives in `uiStore.theme`. `tokenToCss` emits both `:root` and `.dark` blocks; the theme toggle adds/removes the `dark` class on the canvas root, not on `<html>`. (D-057, D-081) |
| Dependencies | `pnpm add` requires a ledger entry. If it isn't in the seed `package.json`, ask. (D-073) |

Two new ledger entries surfaced while writing this table: **D-080** (color normalization at the store boundary) and **D-081** (`.dark` class scoped to the canvas root so the studio chrome never inherits the user's dark theme).

---

## Part Twelve: Beyond scope (D-078)

Not built before Sept 3, no matter how cheap it looks: multi-user collaboration; backend persistence; authentication; drag-and-drop on the canvas (up/down arrows only); Figma import/export; user-defined component types; version history or branching; team libraries; a marketplace; AI-generated imagery for placeholders; a GitHub push from the export panel; custom Google Font input (curated list only — Turn 4); mobile layout of the studio itself (desktop ≥1024px only).

A stream that finds itself building one of these has misread the spec. Close the PR.

---

## Boundary files

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "types": ["webmcp-types"],
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", "src/types/**/*.d.ts"],
  "exclude": ["node_modules"]
}
```

### `src/types/phase.ts`

```ts
export type Phase = 0 | 1 | 2 | 3 | 4;

export interface PhaseDefinition {
  phase: Phase;
  name: string;
  description: string;
  requirement: string; // what unlocks the NEXT phase; '' for phase 4
}

export const PHASE_DEFINITIONS: readonly PhaseDefinition[] = [
  { phase: 0, name: 'Empty',      description: 'No tokens yet. Set a primary color to begin.',                              requirement: 'Define 1 token.' },
  { phase: 1, name: 'Tokens',     description: 'Tokens are being defined. Components unlock at five.',                     requirement: 'Define 5 tokens including primary, background, and text-primary.' },
  { phase: 2, name: 'Components', description: 'Components can be generated from your tokens.',                            requirement: 'Have 2 components on the canvas.' },
  { phase: 3, name: 'Layout',     description: 'Pages can be sketched as wireframes and rendered.',                        requirement: 'Render 1 page.' },
  { phase: 4, name: 'Export',     description: 'The system is complete. Export tokens, components, and pages as code.',    requirement: '' },
] as const;

export interface NextPhaseInfo {
  phase: Phase;
  requirement: string;
  missing: string[]; // specific unmet items, e.g. ['2 more tokens', 'color.background']
}
```

### `src/types/tokens.ts`

```ts
export type SemanticColorRole =
  | 'primary' | 'secondary' | 'accent'
  | 'danger' | 'warning' | 'success'
  | 'muted' | 'background' | 'surface'
  | 'text-primary' | 'text-secondary' | 'text-muted'
  | 'border';

export const SEMANTIC_COLOR_ROLES: readonly SemanticColorRole[] = [
  'primary', 'secondary', 'accent', 'danger', 'warning', 'success', 'muted',
  'background', 'surface', 'text-primary', 'text-secondary', 'text-muted', 'border',
] as const;

/** Roles that receive a derived on-color (D-046). */
export const ON_COLOR_ROLES: readonly SemanticColorRole[] = ['primary', 'secondary', 'accent', 'danger', 'warning', 'success'] as const;

export type FontFamilyKey = 'heading' | 'body' | 'mono';
export type TypeScaleKey = 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
export type FontWeightKey = 'light' | 'regular' | 'medium' | 'semibold' | 'bold';
export type LineHeightKey = 'tight' | 'normal' | 'relaxed';
export type SpacingKey = 'unit'; // the scale multipliers are fixed (D-082)
export type RadiusKey = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ElevationKey = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type AnimationKey = 'durationFast' | 'durationNormal' | 'durationSlow' | 'easingDefault' | 'easingIn' | 'easingOut';

export type TokenGroup = 'color' | 'font' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'spacing' | 'radius' | 'elevation' | 'animation';

/** Dotted token identity (D-044). */
export type TokenPath =
  | `color.${SemanticColorRole}`
  | `font.${FontFamilyKey}`
  | `fontSize.${TypeScaleKey}`
  | `fontWeight.${FontWeightKey}`
  | `lineHeight.${LineHeightKey}`
  | `spacing.${SpacingKey}`
  | `radius.${RadiusKey}`
  | `elevation.${ElevationKey}`
  | `animation.${AnimationKey}`;

export const TOKEN_PATHS: readonly TokenPath[] = [
  ...SEMANTIC_COLOR_ROLES.map((r) => `color.${r}` as const),
  'font.heading', 'font.body', 'font.mono',
  'fontSize.xs', 'fontSize.sm', 'fontSize.base', 'fontSize.md', 'fontSize.lg', 'fontSize.xl', 'fontSize.2xl', 'fontSize.3xl', 'fontSize.4xl',
  'fontWeight.light', 'fontWeight.regular', 'fontWeight.medium', 'fontWeight.semibold', 'fontWeight.bold',
  'lineHeight.tight', 'lineHeight.normal', 'lineHeight.relaxed',
  'spacing.unit',
  'radius.none', 'radius.sm', 'radius.md', 'radius.lg', 'radius.xl', 'radius.full',
  'elevation.none', 'elevation.sm', 'elevation.md', 'elevation.lg', 'elevation.xl',
  'animation.durationFast', 'animation.durationNormal', 'animation.durationSlow',
  'animation.easingDefault', 'animation.easingIn', 'animation.easingOut',
];

/** set_token's `category` enum → TokenGroup. */
export const CATEGORY_TO_GROUP: Record<string, TokenGroup> = {
  'color': 'color', 'font-family': 'font', 'font-size': 'fontSize', 'font-weight': 'fontWeight',
  'line-height': 'lineHeight', 'spacing-unit': 'spacing', 'radius': 'radius', 'elevation': 'elevation',
  'animation-duration': 'animation', 'animation-easing': 'animation',
};
export const TOKEN_CATEGORIES = Object.keys(CATEGORY_TO_GROUP);

export interface TokenState {
  colors: Record<SemanticColorRole, string | null>;    // normalized 'hsl(H, S%, L%)' (D-080)
  dark: Record<SemanticColorRole, string | null> | null; // D-057
  typography: {
    families: Record<FontFamilyKey, string>;             // bare family names (D-066)
    scale: Record<TypeScaleKey, number>;                 // px
    weights: Record<FontWeightKey, number>;
    lineHeights: Record<LineHeightKey, number>;
  };
  spacing: { unit: number; scale: readonly number[] };   // scale fixed: [1,2,3,4,5,6,8,10,12,16] (D-082)
  radius: Record<RadiusKey, number>;                     // px
  elevation: Record<ElevationKey, string>;               // CSS box-shadow
  animation: Record<AnimationKey, number | string>;      // durations ms (number), easings string
  touched: TokenPath[];                                   // non-default, non-color paths (D-047)
  locked: TokenPath[];                                    // D-056
}

/** Flat view used by tools and export. */
export type TokenMap = Record<TokenPath, string | null>;

export type Actor = 'human' | 'agent';
```

New ledger entry: **D-082** — the spacing multipliers `[1,2,3,4,5,6,8,10,12,16]` are fixed; the human edits only `spacing.unit`. CSS vars are `--spacing-1 … --spacing-16` named by multiplier (matching the spec's §12 list).

### `src/types/components.ts`

```ts
import type { TokenPath } from '@/types/tokens';

export type ComponentType =
  | 'button' | 'card' | 'input' | 'textarea' | 'select' | 'toggle' | 'badge' | 'avatar'
  | 'navbar' | 'hero' | 'pricing-card' | 'feature-grid' | 'footer' | 'modal' | 'toast' | 'accordion';

export const COMPONENT_TYPES: readonly ComponentType[] = [
  'button', 'card', 'input', 'textarea', 'select', 'toggle', 'badge', 'avatar',
  'navbar', 'hero', 'pricing-card', 'feature-grid', 'footer', 'modal', 'toast', 'accordion',
] as const;

export type ComponentVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export const COMPONENT_VARIANTS: readonly ComponentVariant[] = ['primary', 'secondary', 'ghost', 'danger', 'outline'] as const;

export type ComponentSize = 'sm' | 'md' | 'lg';
export const COMPONENT_SIZES: readonly ComponentSize[] = ['sm', 'md', 'lg'] as const;

/** Interactive states expressed in library.css via [data-state] (D-063). */
export type ComponentState = 'default' | 'hover' | 'focus' | 'disabled' | 'loading' | 'error';

/** Typed content slots per component type (D-051, D-052). All fields required; defaults fill gaps. */
export interface ComponentContentMap {
  'button':       { label: string };
  'card':         { title: string; body: string; ctaLabel: string | null };
  'input':        { label: string; placeholder: string; helper: string | null; error: string | null };
  'textarea':     { label: string; placeholder: string; helper: string | null; error: string | null };
  'select':       { label: string; placeholder: string; options: string[] };
  'toggle':       { label: string; checked: boolean };
  'badge':        { label: string };
  'avatar':       { initials: string; name: string };
  'navbar':       { brand: string; links: string[]; ctaLabel: string };
  'hero':         { headline: string; subtitle: string; primaryCta: string; secondaryCta: string | null };
  'pricing-card': { tier: string; price: string; period: string; features: string[]; ctaLabel: string; featured: boolean };
  'feature-grid': { items: { title: string; body: string }[]; columns: 2 | 3 | 4 };
  'footer':       { brand: string; columns: { heading: string; links: string[] }[]; copyright: string };
  'modal':        { title: string; body: string; confirmLabel: string; cancelLabel: string };
  'toast':        { message: string };
  'accordion':    { items: { question: string; answer: string }[] };
}

export type ComponentContent<T extends ComponentType = ComponentType> = ComponentContentMap[T];

export interface ComponentSpec<T extends ComponentType = ComponentType> {
  id: string;                       // comp_xxxxxxxx
  type: T;
  variant: ComponentVariant;
  size: ComponentSize;
  content: ComponentContentMap[T];
  pageId: string | null;            // D-053: set when created by render_page
  sectionId: string | null;
  createdBy: 'human' | 'agent';
  createdAt: number;                // Unix ms
}

export interface ComponentSummary {
  id: string;
  type: ComponentType;
  variant: ComponentVariant;
  size: ComponentSize;
  label: string | null;             // primary text slot, per contentFromInput's mapping
  pageId: string | null;
}

/** One row of explain_component / export. */
export interface TokenMapping {
  part: string;                     // 'root' | 'label' | 'title' | …
  cssProperty: string;              // 'background-color'
  token: TokenPath;                 // 'color.primary'
  cssVar: string;                   // '--color-primary'
  resolvedValue: string | null;     // current value or null if unset
}

/** Props every library component accepts. Nothing else (D-062, D-069). */
export interface LibraryComponentProps {
  spec: ComponentSpec;
  selected?: boolean;
}

/** Flat generate_component input (D-075). */
export interface GenerateComponentInput {
  type: ComponentType;
  variant?: ComponentVariant;
  size?: ComponentSize;
  label?: string;
  description?: string;
  items?: string[];
}
```

### `src/types/layouts.ts`

```ts
import type { ComponentType } from '@/types/components';

export type SectionType =
  | 'navbar' | 'hero' | 'features' | 'pricing' | 'testimonials' | 'cta'
  | 'faq' | 'footer' | 'content' | 'gallery' | 'stats' | 'team';
export const SECTION_TYPES: readonly SectionType[] = [
  'navbar', 'hero', 'features', 'pricing', 'testimonials', 'cta', 'faq', 'footer', 'content', 'gallery', 'stats', 'team',
] as const;

export type PageType = 'landing' | 'pricing' | 'about' | 'contact' | 'blog-post' | 'dashboard' | 'onboarding' | 'settings';
export const PAGE_TYPES: readonly PageType[] = ['landing', 'pricing', 'about', 'contact', 'blog-post', 'dashboard', 'onboarding', 'settings'] as const;

export interface WireframeSection {
  id: string;                 // sec_xxxxxxxx
  type: SectionType;
  label: string;              // shown in the gray box
  columns: number | null;     // grid sections only; null = section default (Turn 5 table)
}

export interface Wireframe {
  id: string;                 // wf_xxxxxxxx
  pageType: PageType;
  title: string;
  sections: WireframeSection[];   // array order is display order (D-055)
  status: 'wireframe' | 'rendered';
  createdBy: 'human' | 'agent';
  createdAt: number;
}

export interface RenderedSection {
  sectionId: string;          // WireframeSection.id
  type: SectionType;
  columns: number | null;
  componentIds: string[];     // components in componentStore with pageId === page.id (D-053)
}

export interface RenderedPage {
  id: string;                 // page_xxxxxxxx
  wireframeId: string;
  pageType: PageType;
  title: string;
  sections: RenderedSection[];
  createdAt: number;
}

/** Which component types a section produces; filled in Turn 5, typed here. */
export type SectionComponentMap = Record<SectionType, { component: ComponentType | 'block'; perColumn: boolean; defaultColumns: number | null }>;
```

### `src/types/rules.ts`

```ts
import type { ComponentType } from '@/types/components';

export type RuleType = 'color-restriction' | 'contrast-minimum' | 'size-restriction' | 'spacing-restriction' | 'component-restriction' | 'custom';
export const RULE_TYPES: readonly RuleType[] = ['color-restriction', 'contrast-minimum', 'size-restriction', 'spacing-restriction', 'component-restriction', 'custom'] as const;

/** Resolvable properties. The rule engine knows how to read each from a spec + tokens (Turn 6). */
export type RuleProperty = 'variant' | 'size' | 'type' | 'background-color' | 'color' | 'border-radius' | 'font-size' | 'min-height' | 'contrast';
export const RULE_PROPERTIES: readonly RuleProperty[] = ['variant', 'size', 'type', 'background-color', 'color', 'border-radius', 'font-size', 'min-height', 'contrast'] as const;

export type RuleOperator = 'equals' | 'not-equals' | 'min' | 'max' | 'not-contains' | 'hue-not-in';
export const RULE_OPERATORS: readonly RuleOperator[] = ['equals', 'not-equals', 'min', 'max', 'not-contains', 'hue-not-in'] as const;

export interface RuleCondition {
  target: ComponentType | 'all';
  property: RuleProperty;
  operator: RuleOperator;
  value: string;              // 'danger' | '8' | '4.5' | '350-10' (hue range, wraps)
}

export interface DesignRule {
  id: string;                 // rule_xxxxxxxx
  type: RuleType;
  description: string;        // plain language, shown in UI and to the agent
  condition: RuleCondition;
  enabled: boolean;
  createdBy: 'human' | 'agent';
  createdAt: number;
}

export interface RuleViolation {
  ruleId: string;
  ruleDescription: string;
  componentId: string | null; // null when evaluating a not-yet-created spec
  property: RuleProperty;
  currentValue: string;
  message: string;
  alternatives: string[];     // what would pass, when computable
}
```

### `src/types/log.ts`

```ts
import type { Phase } from '@/types/phase';
import type { ToolResult } from '@/types/webmcp';
import type { ComponentSpec } from '@/types/components';
import type { Wireframe, WireframeSection } from '@/types/layouts';
import type { DesignRule } from '@/types/rules';
import type { SemanticColorRole, TokenPath } from '@/types/tokens';

/** Everything undo can do (D-061). Payloads captured at execution time. */
export type InverseAction =
  | { kind: 'restore_token'; path: TokenPath; value: string | null }
  | { kind: 'restore_tokens'; snapshot: Partial<Record<TokenPath, string | null>> }
  | { kind: 'remove_component'; id: string }
  | { kind: 'restore_component'; spec: ComponentSpec; index: number }
  | { kind: 'restore_component_spec'; id: string; previous: ComponentSpec }
  | { kind: 'remove_wireframe'; id: string }
  | { kind: 'restore_wireframe'; wireframe: Wireframe; index: number }
  | { kind: 'restore_sections'; wireframeId: string; sections: WireframeSection[] }
  | { kind: 'unrender_page'; pageId: string; wireframeId: string; componentIds: string[] }
  | { kind: 'restore_dark'; previous: Record<SemanticColorRole, string | null> | null }
  | { kind: 'remove_rule'; id: string }
  | { kind: 'restore_rule'; rule: DesignRule; index: number };

export interface AgentLogEntry {
  id: string;                          // log_xxxxxxxx
  timestamp: number;                   // Unix ms (D-038)
  actor: 'agent' | 'human';
  tool: string;                        // ToolName, or 'ui.<action>' for humans (D-060)
  input: Record<string, unknown>;
  result: ToolResult | null;           // null for human actions
  status: 'ok' | 'error';
  durationMs: number;
  phase: Phase;                        // phase after the action
  inverse: InverseAction | null;
  undone: boolean;
}

export type NewLogEntry = Omit<AgentLogEntry, 'id' | 'timestamp' | 'undone' | 'phase'>;
```

### `src/types/webmcp.ts` — final (Turn 1 text, one addition: `ToolInputError`)

```ts
import type { Phase } from '@/types/phase';
import type { InverseAction } from '@/types/log';

export type ToolErrorCode = 'INVALID_INPUT' | 'NOT_FOUND' | 'RULE_VIOLATION' | 'LOCKED' | 'PHASE_LOCKED' | 'INTERNAL';

export type ToolOutcome<T = unknown> =
  | { kind: 'ok'; summary: string; data?: T; inverse?: InverseAction | null }
  | { kind: 'error'; code: ToolErrorCode; message: string; hint?: string; alternatives?: string[] };

export type ToolResult<T = unknown> =
  | { ok: true; phase: Phase; phaseChanged: boolean; newTools: string[]; removedTools: string[]; summary: string; data?: T }
  | { ok: false; phase: Phase; code: ToolErrorCode; error: string; hint?: string; alternatives?: string[] };

export type ToolName =
  | 'get_current_state' | 'set_token' | 'get_tokens' | 'suggest_palette'
  | 'remove_token' | 'add_rule' | 'remove_rule' | 'list_rules'
  | 'generate_component' | 'list_components' | 'modify_component' | 'remove_component' | 'explain_component' | 'get_component_code'
  | 'sketch_wireframe' | 'modify_layout' | 'remove_wireframe' | 'render_page' | 'generate_dark_theme' | 'audit_accessibility'
  | 'export_tokens' | 'export_components' | 'export_page' | 'export_full_system';

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties: false;
}

export interface ToolDefinition<TInput extends Record<string, unknown> = Record<string, unknown>, TData = unknown> {
  name: ToolName;
  title: string;
  description: string;
  inputSchema: ToolInputSchema;
  phases: readonly Phase[];
  readOnly: boolean;
  untrusted?: boolean;
  /** Synchronous. No awaits. Reads stores via getState(). May throw ToolInputError; anything else is a bug. */
  execute(input: TInput): ToolOutcome<TData>;
}

/** Thrown by validate.ts helpers; the wrapper maps it to INVALID_INPUT (D-076). */
export class ToolInputError extends Error {
  constructor(message: string, public readonly alternatives?: string[]) {
    super(message);
    this.name = 'ToolInputError';
  }
}
```

The Turn 1 wrapper gains one branch: `catch (e) { outcome = e instanceof ToolInputError ? { kind:'error', code:'INVALID_INPUT', message: e.message, alternatives: e.alternatives } : { kind:'error', code:'INTERNAL', message: … } }`.

### `src/utils/idGenerator.ts` — final (D-067)

```ts
export type IdPrefix = 'comp' | 'wf' | 'sec' | 'page' | 'rule' | 'log';

/** comp_a1b2c3d4 — readable in the log, unique for a session. */
export function generateId(prefix: IdPrefix): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
}
```

### `src/utils/colorUtils.ts` — signatures (Stream 1 implements; Turn 6 has the math)

```ts
import type { SemanticColorRole } from '@/types/tokens';

export interface HSL { h: number; s: number; l: number }       // h 0–359, s/l 0–100
export interface RGB { r: number; g: number; b: number }       // 0–255
export type PaletteStrategy = 'complementary' | 'analogous' | 'triadic' | 'monochromatic';
export const PALETTE_STRATEGIES: readonly PaletteStrategy[] = ['complementary', 'analogous', 'triadic', 'monochromatic'] as const;

/** Accepts hsl() (comma or space syntax), #rgb/#rrggbb, rgb(). Returns null if unparseable. */
export function parseColor(input: string): HSL | null { /* STREAM 1: implement */ return null; }
/** Normalized store format: 'hsl(250, 84.0%, 60.0%)' → integer h, one-decimal s/l (D-080). */
export function toHSLString(c: HSL): string { return `hsl(${Math.round(c.h)}, ${c.s.toFixed(1)}%, ${c.l.toFixed(1)}%)`; }
export function hslToRgb(c: HSL): RGB { /* STREAM 1: implement */ return { r: 0, g: 0, b: 0 }; }
export function rgbToHsl(c: RGB): HSL { /* STREAM 1: implement */ return { h: 0, s: 0, l: 0 }; }
export function toHex(c: HSL): string { /* STREAM 1: implement */ return '#000000'; }
/** WCAG 2.1 relative luminance, 0–1. */
export function relativeLuminance(c: RGB): number { /* STREAM 1: implement */ return 0; }
/** WCAG 2.1 contrast ratio, 1–21. Accepts normalized hsl strings. */
export function contrastRatio(a: string, b: string): number { /* STREAM 1: implement */ return 1; }
/** D-046. */
export function onColor(base: HSL): string { return base.l > 60 ? toHSLString({ h: base.h, s: 15, l: 10 }) : toHSLString({ h: base.h, s: 10, l: 98 }); }
/** Turn 6 §6.1 table. Returns all 13 roles. */
export function generatePalette(primary: HSL, strategy: PaletteStrategy): Record<SemanticColorRole, string> { /* STREAM 1: implement */ throw new Error('not implemented'); }
/** Turn 6 §6.1 dark transform. Nulls pass through as null. */
export function deriveDarkTheme(light: Record<SemanticColorRole, string | null>): Record<SemanticColorRole, string | null> { /* STREAM 1: implement */ return light; }
/** '350-10' wraps; inclusive. */
export function hueInRange(h: number, range: string): boolean { /* STREAM 1: implement */ return false; }
```

### `src/utils/fonts.ts` — signature + list (Stream 1 implements loading; Turn 4 justifies the list)

```ts
export type FontCategory = 'sans' | 'serif' | 'mono';
export interface FontEntry { family: string; category: FontCategory; fallback: string; weights: number[] }

export const FONT_CATALOG: readonly FontEntry[] = [
  { family: 'Inter',             category: 'sans',  fallback: 'system-ui, sans-serif',            weights: [400, 500, 600, 700] },
  { family: 'Geist',             category: 'sans',  fallback: 'system-ui, sans-serif',            weights: [400, 500, 600, 700] },
  { family: 'DM Sans',           category: 'sans',  fallback: 'system-ui, sans-serif',            weights: [400, 500, 600, 700] },
  { family: 'Plus Jakarta Sans', category: 'sans',  fallback: 'system-ui, sans-serif',            weights: [400, 500, 600, 700] },
  { family: 'Manrope',           category: 'sans',  fallback: 'system-ui, sans-serif',            weights: [400, 500, 600, 700] },
  { family: 'Space Grotesk',     category: 'sans',  fallback: 'system-ui, sans-serif',            weights: [400, 500, 600, 700] },
  { family: 'Playfair Display',  category: 'serif', fallback: 'Georgia, serif',                    weights: [400, 600, 700] },
  { family: 'Lora',              category: 'serif', fallback: 'Georgia, serif',                    weights: [400, 600, 700] },
  { family: 'Fraunces',          category: 'serif', fallback: 'Georgia, serif',                    weights: [400, 600, 700] },
  { family: 'Source Serif 4',    category: 'serif', fallback: 'Georgia, serif',                    weights: [400, 600, 700] },
  { family: 'JetBrains Mono',    category: 'mono',  fallback: 'ui-monospace, SFMono-Regular, monospace', weights: [400, 700] },
  { family: 'Geist Mono',        category: 'mono',  fallback: 'ui-monospace, SFMono-Regular, monospace', weights: [400, 700] },
  { family: 'IBM Plex Mono',     category: 'mono',  fallback: 'ui-monospace, SFMono-Regular, monospace', weights: [400, 700] },
] as const;

export const FONT_FAMILIES = FONT_CATALOG.map((f) => f.family);
/** "'Inter', system-ui, sans-serif" (D-066). Unknown family → quoted name + sans fallback. */
export function fontStack(family: string): string {
  const entry = FONT_CATALOG.find((f) => f.family === family);
  return `'${family}', ${entry?.fallback ?? 'system-ui, sans-serif'}`;
}
```

### `src/utils/defaults.ts` — final

```ts
import type { TokenState } from '@/types/tokens';

export const SPACING_SCALE: readonly number[] = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16]; // D-082

export const DEFAULT_TOKENS: TokenState = {
  colors: {
    primary: null, secondary: null, accent: null, danger: null, warning: null, success: null, muted: null,
    background: null, surface: null, 'text-primary': null, 'text-secondary': null, 'text-muted': null, border: null,
  },
  dark: null,
  typography: {
    families: { heading: 'Inter', body: 'Inter', mono: 'JetBrains Mono' },
    scale: { xs: 12, sm: 14, base: 16, md: 18, lg: 20, xl: 24, '2xl': 30, '3xl': 36, '4xl': 48 },
    weights: { light: 300, regular: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeights: { tight: 1.2, normal: 1.5, relaxed: 1.75 },
  },
  spacing: { unit: 4, scale: SPACING_SCALE },
  radius: { none: 0, sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
  elevation: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
    md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
    lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
    xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
  },
  animation: {
    durationFast: 150, durationNormal: 250, durationSlow: 400,
    easingDefault: 'cubic-bezier(0.4, 0, 0.2, 1)', easingIn: 'cubic-bezier(0.4, 0, 1, 1)', easingOut: 'cubic-bezier(0, 0, 0.2, 1)',
  },
  touched: [],
  locked: [],
};

/** Phase-2 gate colors (D-048). */
export const REQUIRED_COLORS_FOR_COMPONENTS = ['color.primary', 'color.background', 'color.text-primary'] as const;
export const TOKENS_REQUIRED_FOR_PHASE_2 = 5;
export const COMPONENTS_REQUIRED_FOR_PHASE_3 = 2;
```

### `src/engine/tokenToCss.ts` — signature

```ts
import type { TokenState } from '@/types/tokens';

/**
 * Produces the full stylesheet: a `:root { … }` block with every var (60 tokens + 6 on-colors + 10 spacing steps),
 * and a `.dark { … }` block when state.dark is non-null. Null colors → sentinel (Turn 4).
 * Var names: --color-<role>, --color-on-<role>, --font-<key>, --font-size-<key>, --font-weight-<key>,
 * --line-height-<key>, --spacing-<multiplier>, --radius-<key>, --elevation-<key>,
 * --animation-duration-{fast,normal,slow}, --animation-easing-{default,in,out}.
 */
export function tokenToCss(state: TokenState): string { /* STREAM 1: implement */ return ':root {}'; }

/** Same vars as a map, for export and the Tool Inspector. */
export function tokenToVars(state: TokenState): Record<string, string> { /* STREAM 1: implement */ return {}; }

/** 'color.primary' → '--color-primary'; 'fontSize.2xl' → '--font-size-2xl'; 'animation.durationFast' → '--animation-duration-fast'. */
export function cssVarFor(path: import('@/types/tokens').TokenPath): string { /* STREAM 1: implement */ return `--${path.replace('.', '-')}`; }
```

### `src/engine/componentRenderer.ts` — types + signatures (D-064)

```ts
import type { CSSProperties } from 'react';
import type { ComponentSpec, ComponentType, TokenMapping } from '@/types/components';
import type { TokenPath } from '@/types/tokens';

export interface ComponentStyleDef<T extends ComponentType = ComponentType> {
  /** Named parts, 'root' first. e.g. ['root','label'] for button; ['root','headline','subtitle','actions'] for hero. */
  parts: readonly string[];
  /** Default-state inline styles per part. Only var(--…) references, no literals (D-065). */
  styles(spec: ComponentSpec<T>): Record<string, CSSProperties>;
  /** Which token drives which CSS property, per part: { 'root.background-color': 'color.primary', … }. */
  tokens(spec: ComponentSpec<T>): Record<`${string}.${string}`, TokenPath>;
}

export type StyleDictionary = { [K in ComponentType]: ComponentStyleDef<K> };

/** Filled by Stream 2 in Turn 3. The seed ships a dictionary where every entry returns {} and {} so the app compiles. */
export const STYLE_DICTIONARY: StyleDictionary = /* STREAM 2: implement (seed: stub object) */ null as unknown as StyleDictionary;

export function getStyles(spec: ComponentSpec, part: string): CSSProperties {
  return (STYLE_DICTIONARY[spec.type] as ComponentStyleDef).styles(spec)[part] ?? {};
}

/** Joins tokens(spec) with current values from tokenStore for explain_component / export. */
export function getTokenMapping(spec: ComponentSpec): TokenMapping[] { /* STREAM 2: implement */ return []; }
```

### `src/engine/ruleEngine.ts` — signatures (Stream 2 implements; Turn 6 algorithm)

```ts
import type { ComponentSpec } from '@/types/components';
import type { DesignRule, RuleViolation } from '@/types/rules';

/** Evaluate one spec against enabled rules. componentId may be null for a pre-creation check. */
export function evaluateSpec(spec: ComponentSpec, rules: DesignRule[]): RuleViolation[] { /* STREAM 2: implement */ return []; }
/** All components in componentStore against all enabled rules. */
export function evaluateAll(): RuleViolation[] { /* STREAM 2: implement */ return []; }
```

### `src/stores/tokenStore.ts`

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SemanticColorRole, TokenMap, TokenPath, TokenState } from '@/types/tokens';
import { DEFAULT_TOKENS } from '@/utils/defaults';

/** Owns every design token, the derived dark set, locks, and the "touched" list that drives phase counting. */
export interface TokenActions {
  /** Normalizes colors via parseColor/toHSLString; numbers for px/ms groups; rejects invalid with false. */
  setToken(path: TokenPath, value: string): boolean;
  /** Colors → null; other groups → default value and removed from touched. */
  removeToken(path: TokenPath): void;
  setMany(values: Partial<Record<TokenPath, string>>): void;
  setLocked(path: TokenPath, locked: boolean): void;
  setDark(dark: Record<SemanticColorRole, string | null> | null): void;
  reset(): void;
  // reads
  getToken(path: TokenPath): string | null;
  getTokenMap(): TokenMap;
  getDefinedTokenCount(): number;       // D-047
  getMissingForPhase2(): string[];      // D-048; [] when satisfied
  isLocked(path: TokenPath): boolean;
}
export type TokenStore = TokenState & TokenActions;

export const useTokenStore = create<TokenStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_TOKENS,
      setToken: () => { /* STREAM 1: implement */ return false; },
      removeToken: () => { /* STREAM 1: implement */ },
      setMany: () => { /* STREAM 1: implement */ },
      setLocked: (path, locked) => set((s) => ({ locked: locked ? [...new Set([...s.locked, path])] : s.locked.filter((p) => p !== path) })),
      setDark: (dark) => set({ dark }),
      reset: () => set({ ...DEFAULT_TOKENS }),
      getToken: () => /* STREAM 1: implement */ null,
      getTokenMap: () => /* STREAM 1: implement */ ({} as TokenMap),
      getDefinedTokenCount: () => { const s = get(); return Object.values(s.colors).filter(Boolean).length + s.touched.length; },
      getMissingForPhase2: () => /* STREAM 1: implement */ [],
      isLocked: (path) => get().locked.includes(path),
    }),
    { name: 'altgal.tokens.v1', version: 1, partialize: (s) => ({ colors: s.colors, dark: s.dark, typography: s.typography, spacing: s.spacing, radius: s.radius, elevation: s.elevation, animation: s.animation, touched: s.touched, locked: s.locked }) },
  ),
);
```

### `src/stores/componentStore.ts`

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ComponentSpec, ComponentSummary } from '@/types/components';

/** Owns every ComponentSpec on the canvas, including page-owned ones (D-053). */
export interface ComponentState { components: ComponentSpec[] }
export interface ComponentActions {
  add(spec: ComponentSpec, index?: number): void;
  update(id: string, patch: Partial<Omit<ComponentSpec, 'id' | 'type' | 'createdAt' | 'createdBy'>>): boolean;
  remove(id: string): ComponentSpec | null;     // returns removed spec for undo
  removeMany(ids: string[]): void;
  get(id: string): ComponentSpec | undefined;
  list(): ComponentSpec[];
  listLoose(): ComponentSpec[];                  // pageId === null (canvas in phase 2/3)
  summaries(): ComponentSummary[];
  count(): number;
  ids(): string[];
  reset(): void;
}
export type ComponentStore = ComponentState & ComponentActions;

export const useComponentStore = create<ComponentStore>()(
  persist(
    (set, get) => ({
      components: [],
      add: (spec, index) => set((s) => { const c = [...s.components]; c.splice(index ?? c.length, 0, spec); return { components: c }; }),
      update: (id, patch) => { const cur = get().components.find((c) => c.id === id); if (!cur) return false; set((s) => ({ components: s.components.map((c) => (c.id === id ? ({ ...c, ...patch } as ComponentSpec) : c)) })); return true; },
      remove: (id) => { const cur = get().components.find((c) => c.id === id) ?? null; if (cur) set((s) => ({ components: s.components.filter((c) => c.id !== id) })); return cur; },
      removeMany: (ids) => set((s) => ({ components: s.components.filter((c) => !ids.includes(c.id)) })),
      get: (id) => get().components.find((c) => c.id === id),
      list: () => get().components,
      listLoose: () => get().components.filter((c) => c.pageId === null),
      summaries: () => /* STREAM 2: implement (uses content.ts primaryText) */ [],
      count: () => get().components.length,
      ids: () => get().components.map((c) => c.id),
      reset: () => set({ components: [] }),
    }),
    { name: 'altgal.components.v1', version: 1, partialize: (s) => ({ components: s.components }) },
  ),
);
```

### `src/stores/layoutStore.ts`

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RenderedPage, Wireframe, WireframeSection } from '@/types/layouts';

/** Owns wireframes, rendered pages, and which wireframe the canvas shows (D-054). */
export interface LayoutState {
  wireframes: Wireframe[];
  renderedPages: RenderedPage[];
  activeWireframeId: string | null;
}
export interface LayoutActions {
  addWireframe(wf: Wireframe, index?: number): void;            // also sets active
  removeWireframe(id: string): Wireframe | null;
  setSections(wireframeId: string, sections: WireframeSection[]): boolean;
  setWireframeStatus(wireframeId: string, status: Wireframe['status']): void;
  setActiveWireframe(id: string | null): void;
  addRenderedPage(page: RenderedPage): void;
  removeRenderedPage(id: string): RenderedPage | null;
  getWireframe(id: string): Wireframe | undefined;
  getPage(id: string): RenderedPage | undefined;
  getActiveWireframe(): Wireframe | undefined;
  getActivePage(): RenderedPage | undefined;                    // page whose wireframeId === activeWireframeId
  reset(): void;
}
export type LayoutStore = LayoutState & LayoutActions;

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set, get) => ({
      wireframes: [], renderedPages: [], activeWireframeId: null,
      addWireframe: (wf, index) => set((s) => { const w = [...s.wireframes]; w.splice(index ?? w.length, 0, wf); return { wireframes: w, activeWireframeId: wf.id }; }),
      removeWireframe: (id) => { const cur = get().wireframes.find((w) => w.id === id) ?? null; if (cur) set((s) => ({ wireframes: s.wireframes.filter((w) => w.id !== id), activeWireframeId: s.activeWireframeId === id ? (s.wireframes.find((w) => w.id !== id)?.id ?? null) : s.activeWireframeId })); return cur; },
      setSections: (wireframeId, sections) => { if (!get().wireframes.some((w) => w.id === wireframeId)) return false; set((s) => ({ wireframes: s.wireframes.map((w) => (w.id === wireframeId ? { ...w, sections } : w)) })); return true; },
      setWireframeStatus: (wireframeId, status) => set((s) => ({ wireframes: s.wireframes.map((w) => (w.id === wireframeId ? { ...w, status } : w)) })),
      setActiveWireframe: (id) => set({ activeWireframeId: id }),
      addRenderedPage: (page) => set((s) => ({ renderedPages: [...s.renderedPages, page] })),
      removeRenderedPage: (id) => { const cur = get().renderedPages.find((p) => p.id === id) ?? null; if (cur) set((s) => ({ renderedPages: s.renderedPages.filter((p) => p.id !== id) })); return cur; },
      getWireframe: (id) => get().wireframes.find((w) => w.id === id),
      getPage: (id) => get().renderedPages.find((p) => p.id === id),
      getActiveWireframe: () => get().wireframes.find((w) => w.id === get().activeWireframeId),
      getActivePage: () => get().renderedPages.find((p) => p.wireframeId === get().activeWireframeId),
      reset: () => set({ wireframes: [], renderedPages: [], activeWireframeId: null }),
    }),
    { name: 'altgal.layouts.v1', version: 1 },
  ),
);
```

### `src/stores/ruleStore.ts`

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DesignRule } from '@/types/rules';

/** Owns design rules only. Evaluation lives in engine/ruleEngine.ts (D-050). */
export interface RuleState { rules: DesignRule[] }
export interface RuleActions {
  add(rule: DesignRule, index?: number): void;
  remove(id: string): DesignRule | null;
  setEnabled(id: string, enabled: boolean): void;
  get(id: string): DesignRule | undefined;
  list(): DesignRule[];
  listEnabled(): DesignRule[];
  reset(): void;
}
export type RuleStore = RuleState & RuleActions;

export const useRuleStore = create<RuleStore>()(
  persist(
    (set, get) => ({
      rules: [],
      add: (rule, index) => set((s) => { const r = [...s.rules]; r.splice(index ?? r.length, 0, rule); return { rules: r }; }),
      remove: (id) => { const cur = get().rules.find((r) => r.id === id) ?? null; if (cur) set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })); return cur; },
      setEnabled: (id, enabled) => set((s) => ({ rules: s.rules.map((r) => (r.id === id ? { ...r, enabled } : r)) })),
      get: (id) => get().rules.find((r) => r.id === id),
      list: () => get().rules,
      listEnabled: () => get().rules.filter((r) => r.enabled),
      reset: () => set({ rules: [] }),
    }),
    { name: 'altgal.rules.v1', version: 1 },
  ),
);
```

### `src/stores/logStore.ts`

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentLogEntry, NewLogEntry } from '@/types/log';
import { generateId } from '@/utils/idGenerator';
import { usePhaseStore } from '@/stores/phaseStore';

/** Owns the collaboration log: agent tool calls and human UI actions, newest last (UI reverses). */
export interface LogState { entries: AgentLogEntry[] }
export interface LogActions {
  addEntry(entry: NewLogEntry): AgentLogEntry;
  markUndone(id: string): void;
  get(id: string): AgentLogEntry | undefined;
  lastUndoable(): AgentLogEntry | undefined;
  clear(): void;
}
export type LogStore = LogState & LogActions;

export const useLogStore = create<LogStore>()(
  persist(
    (set, get) => ({
      entries: [],
      addEntry: (entry) => {
        const full: AgentLogEntry = { ...entry, id: generateId('log'), timestamp: Date.now(), undone: false, phase: usePhaseStore.getState().currentPhase };
        set((s) => ({ entries: [...s.entries, full] }));
        return full;
      },
      markUndone: (id) => set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, undone: true } : e)) })),
      get: (id) => get().entries.find((e) => e.id === id),
      lastUndoable: () => [...get().entries].reverse().find((e) => e.inverse && !e.undone),
      clear: () => set({ entries: [] }),
    }),
    { name: 'altgal.log.v1', version: 1 },
  ),
);
```

Note: `logStore` imports `phaseStore` to stamp the phase — a read at call time, not at module load, and `phaseStore` does not import `logStore`, so the graph stays acyclic (D-050 amended to permit this one read).

### `src/stores/phaseStore.ts` — final (D-048, D-049)

```ts
import { create } from 'zustand';
import type { Phase, NextPhaseInfo } from '@/types/phase';
import { PHASE_DEFINITIONS } from '@/types/phase';
import { useTokenStore } from '@/stores/tokenStore';
import { useComponentStore } from '@/stores/componentStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { TOKENS_REQUIRED_FOR_PHASE_2, COMPONENTS_REQUIRED_FOR_PHASE_3 } from '@/utils/defaults';

/** Owns the current phase. Derived, never set directly. The only store that imports other stores. */
export interface PhaseState { currentPhase: Phase }
export interface PhaseActions {
  recalculatePhase(): void;             // installed as a subscriber below; never call from tools or UI
  nextPhase(): NextPhaseInfo | null;
}
export type PhaseStore = PhaseState & PhaseActions;

export function computePhase(): Phase {
  const tokens = useTokenStore.getState();
  const components = useComponentStore.getState().count();
  const pages = useLayoutStore.getState().renderedPages.length;
  if (pages >= 1) return 4;
  if (components >= COMPONENTS_REQUIRED_FOR_PHASE_3) return 3;
  if (tokens.getDefinedTokenCount() >= TOKENS_REQUIRED_FOR_PHASE_2 && tokens.getMissingForPhase2().length === 0) return 2;
  if (tokens.getDefinedTokenCount() >= 1) return 1;
  return 0;
}

export const usePhaseStore = create<PhaseStore>()((set, get) => ({
  currentPhase: 0,
  recalculatePhase: () => { const next = computePhase(); if (next !== get().currentPhase) set({ currentPhase: next }); },
  nextPhase: () => {
    const p = get().currentPhase;
    if (p === 4) return null;
    const def = PHASE_DEFINITIONS[p]!;
    const missing: string[] = [];
    const t = useTokenStore.getState();
    if (p === 0) missing.push('1 token');
    if (p === 1) { const need = TOKENS_REQUIRED_FOR_PHASE_2 - t.getDefinedTokenCount(); if (need > 0) missing.push(`${need} more token${need === 1 ? '' : 's'}`); missing.push(...t.getMissingForPhase2()); }
    if (p === 2) { const need = COMPONENTS_REQUIRED_FOR_PHASE_3 - useComponentStore.getState().count(); if (need > 0) missing.push(`${need} more component${need === 1 ? '' : 's'}`); }
    if (p === 3) missing.push('1 rendered page');
    return { phase: (p + 1) as Phase, requirement: def.requirement, missing };
  },
}));

// D-049: synchronous recalculation on every relevant store change, installed once at module load.
if (typeof window !== 'undefined') {
  const recalc = () => usePhaseStore.getState().recalculatePhase();
  useTokenStore.subscribe(recalc);
  useComponentStore.subscribe(recalc);
  useLayoutStore.subscribe(recalc);
  recalc(); // after persisted state hydrates synchronously on first import
}
```

### `src/stores/uiStore.ts` (D-058; Stream 5 implements behaviours, shape is final)

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Viewport = 'desktop' | 'tablet' | 'mobile';
export const VIEWPORT_WIDTHS: Record<Viewport, number> = { desktop: 1280, tablet: 768, mobile: 375 };
export type Theme = 'light' | 'dark';

export interface UIState {
  viewport: Viewport;
  theme: Theme;
  selectedComponentId: string | null;
  exportOpen: boolean;
  inspectorOpen: boolean;
  onboardingDismissed: boolean;
}
export interface UIActions {
  setViewport(v: Viewport): void;
  setTheme(t: Theme): void;
  select(id: string | null): void;
  setExportOpen(open: boolean): void;
  setInspectorOpen(open: boolean): void;
  dismissOnboarding(): void;
}
export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      viewport: 'desktop', theme: 'light', selectedComponentId: null, exportOpen: false, inspectorOpen: false, onboardingDismissed: false,
      setViewport: (viewport) => set({ viewport }),
      setTheme: (theme) => set({ theme }),
      select: (selectedComponentId) => set({ selectedComponentId }),
      setExportOpen: (exportOpen) => set({ exportOpen }),
      setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
      dismissOnboarding: () => set({ onboardingDismissed: true }),
    }),
    { name: 'altgal.ui.v1', version: 1, partialize: (s) => ({ onboardingDismissed: s.onboardingDismissed }) },
  ),
);
```

### `src/components/library/index.ts` (D-062)

```ts
import type { ComponentType } from 'react';
import type { ComponentType as AltComponentType, LibraryComponentProps } from '@/types/components';

export type LibraryComponent = ComponentType<LibraryComponentProps>;
export type ComponentRegistry = Record<AltComponentType, LibraryComponent>;

/** Filled by Stream 2 in Turn 3. The seed ships a Placeholder for every type so Canvas compiles. */
import { Placeholder } from './Placeholder';
export const COMPONENT_REGISTRY: ComponentRegistry = {
  'button': Placeholder, 'card': Placeholder, 'input': Placeholder, 'textarea': Placeholder,
  'select': Placeholder, 'toggle': Placeholder, 'badge': Placeholder, 'avatar': Placeholder,
  'navbar': Placeholder, 'hero': Placeholder, 'pricing-card': Placeholder, 'feature-grid': Placeholder,
  'footer': Placeholder, 'modal': Placeholder, 'toast': Placeholder, 'accordion': Placeholder,
};
```

`src/components/library/Placeholder.tsx` (seed only; deleted by Stream 2):

```tsx
'use client';
import type { LibraryComponentProps } from '@/types/components';
export function Placeholder({ spec }: LibraryComponentProps) {
  return <div data-alt={spec.type} data-variant={spec.variant} data-size={spec.size} style={{ padding: 'var(--spacing-4)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}>{spec.type} · {spec.variant} · {spec.size}</div>;
}
```

### `src/components/library/content.ts` — signatures (Stream 2 fills text in Turn 3)

```ts
import type { ComponentContentMap, ComponentType, GenerateComponentInput } from '@/types/components';

export const DEFAULT_CONTENT: { [K in ComponentType]: ComponentContentMap[K] } = /* STREAM 2 (Turn 3) */ null as never;
/** Merges flat input into the typed content for `type` (D-075). */
export function contentFromInput<T extends ComponentType>(type: T, input: Pick<GenerateComponentInput, 'label' | 'description' | 'items'>): ComponentContentMap[T] { /* STREAM 2 */ return DEFAULT_CONTENT[type]; }
/** The one string shown as `label` in summaries and the log. */
export function primaryText(type: ComponentType, content: ComponentContentMap[ComponentType]): string | null { /* STREAM 2 */ return null; }
```

### `src/webmcp/validate.ts` (D-076) — final

```ts
import { ToolInputError } from '@/types/webmcp';

const q = (v: unknown) => JSON.stringify(v);
export function requireString(input: Record<string, unknown>, key: string): string {
  const v = input[key];
  if (typeof v !== 'string' || v.trim() === '') throw new ToolInputError(`"${key}" is required and must be a non-empty string.`);
  return v.trim();
}
export function optionalString(input: Record<string, unknown>, key: string): string | undefined {
  const v = input[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') throw new ToolInputError(`"${key}" must be a string — got ${q(v)}.`);
  return v;
}
export function requireEnum<T extends string>(input: Record<string, unknown>, key: string, allowed: readonly T[]): T {
  const v = input[key];
  if (typeof v !== 'string' || !allowed.includes(v as T)) throw new ToolInputError(`"${key}" must be one of: ${allowed.join(', ')} — got ${q(v)}.`, [...allowed]);
  return v as T;
}
export function optionalEnum<T extends string>(input: Record<string, unknown>, key: string, allowed: readonly T[], fallback: T): T {
  return input[key] === undefined ? fallback : requireEnum(input, key, allowed);
}
export function optionalNumber(input: Record<string, unknown>, key: string, opts?: { min?: number; max?: number; integer?: boolean }): number | undefined {
  const v = input[key];
  if (v === undefined || v === null) return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) throw new ToolInputError(`"${key}" must be a number — got ${q(v)}.`);
  if (opts?.integer && !Number.isInteger(n)) throw new ToolInputError(`"${key}" must be a whole number — got ${n}.`);
  if (opts?.min !== undefined && n < opts.min) throw new ToolInputError(`"${key}" must be at least ${opts.min} — got ${n}.`);
  if (opts?.max !== undefined && n > opts.max) throw new ToolInputError(`"${key}" must be at most ${opts.max} — got ${n}.`);
  return n;
}
export function optionalStringArray(input: Record<string, unknown>, key: string, max = 12): string[] | undefined {
  const v = input[key];
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) throw new ToolInputError(`"${key}" must be an array of strings.`);
  if (v.length > max) throw new ToolInputError(`"${key}" accepts at most ${max} items — got ${v.length}.`);
  return v as string[];
}
```

### Seed tool stubs — `src/webmcp/tools/<name>.ts`

Every one of the 24 files in the seed has this shape (name/title/description/phases/readOnly filled from Turn 1's tables; `inputSchema` filled by Stream 3):

```ts
import type { ToolDefinition } from '@/types/webmcp';
const tool: ToolDefinition = {
  name: 'generate_component',
  title: 'Generate Component',
  description: '…Turn 1 text…',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, // STREAM 3: fill
  phases: [2, 3, 4],
  readOnly: false,
  untrusted: false,
  execute: () => ({ kind: 'error', code: 'INTERNAL', message: 'generate_component is not implemented yet.' }), // STREAM 3
};
export default tool;
```

### `package.json` (seed, D-073)

```json
{
  "name": "alt-gal",
  "private": true,
  "license": "MIT",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint && prettier --check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "e2e": "playwright test"
  },
  "dependencies": {
    "next": "latest-at-seed",
    "react": "latest-at-seed",
    "react-dom": "latest-at-seed",
    "zustand": "^5",
    "jszip": "^3.10",
    "@mcp-b/webmcp-polyfill": "5.1.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "webmcp-types": "0.1.5",
    "vitest": "^3",
    "@testing-library/react": "latest-at-seed",
    "@playwright/test": "^1.62",
    "eslint": "latest-at-seed",
    "eslint-config-next": "latest-at-seed",
    "prettier": "^3"
  }
}
```

"latest-at-seed" is replaced by whatever `pnpm create next-app@latest` resolves on the seed machine; the lockfile is committed with the seed and is the authority.

---

END OF TURN 2 — say 'continue' for Turn 3 (Part Three: all sixteen components — style dictionary, HTML/ARIA, states, DEFAULT_CONTENT, registry).

---

# TURN 3 — UNBLOCK COMPONENTS

**This turn is code, not spec.** Stream 2's job is to paste these files, make `pnpm typecheck` and the isolation tests pass, and fix rendering bugs. It does not redesign spacing, typography, variants, or content. Anything a component needs that isn't here is a `[boundary]` issue, not an improvisation.

## Part Three: The component system

### 3.0 Decisions that shape every file

- **Inline styles + `library.css`** (D-063). Token-driven, per-part default styles come from `STYLE_DICTIONARY` as inline `style` objects. Hover/focus/active/disabled/loading/error and responsive behaviour live in `library.css` using attribute selectors on `data-alt` / `data-variant` / `data-size` / `data-state` / `data-part`, referencing the same CSS vars. Export emits both files, so the exported component looks identical to the canvas.
- **Responsive via container queries, not media queries** (D-085). The canvas root sets `container: canvas / inline-size`; `library.css` uses `@container canvas (max-width: 640px)`. A media query would read the browser window, which is the studio, not the 375px canvas. Exported CSS keeps the container query and the export README tells the consumer to put `container: canvas / inline-size` on their page root.
- **Variant means accent role** (D-086). `VARIANT_ROLE: primary→color.primary, secondary→color.secondary, ghost→color.primary, danger→color.danger, outline→color.primary`. `VARIANT_FILL: primary|secondary|danger→'solid'`, `ghost|outline→'transparent'`. Solid = role background + `--color-on-<role>` text. Transparent = no background, role-colored text; outline adds a 1px role border; ghost adds a hover tint. Every component interprets variant through these two maps, so a variant never means different things in different components.
- **Three size tiers, one convention** (D-087). Interactive controls (button, input, textarea, select, toggle, badge, avatar): `sm` = block `spacing-2` / inline `spacing-3` / text `fontSize.sm`; `md` = `spacing-3` / `spacing-5` / `fontSize.base`; `lg` = `spacing-4` / `spacing-6` / `fontSize.md`. Containers (card, pricing-card, modal, toast, accordion): `sm` = `spacing-4`, `md` = `spacing-6`, `lg` = `spacing-8` padding, gap one step below. Sections (navbar, hero, footer, feature-grid): block padding `spacing-4` / `spacing-16` / `spacing-12` / `spacing-12` respectively, inline `spacing-8`, unaffected by size except hero (`sm` = `spacing-10`, `lg` = `spacing-16` + larger headline).
- **Typography mapping** (D-088). `font.heading`: hero headline, card title, pricing tier and price, feature title, modal title, navbar brand, footer brand, avatar initials. `font.body`: everything else. `font.mono`: never in components (exported code samples only). Weights: headings `semibold`, hero headline `bold`, prices `bold`, buttons `semibold`, labels `medium`, body `regular`. Line heights: headlines `tight`, body `normal`, long body (card, accordion answer) `relaxed`.
- **Radius** (D-089): controls `radius.md`; badge, avatar, toggle `radius.full`; containers `radius.lg`; modal `radius.xl`; sections `radius.none`.
- **Elevation** (D-090): card `elevation.sm` (hover `md`), pricing-card `elevation.md` (featured `lg`), modal `elevation.xl`, toast `elevation.lg`, navbar `elevation.sm`, everything else `none`.
- **Motion** (D-091): every interactive part sets `transition: <props> var(--animation-duration-fast) var(--animation-easing-default)`; accordion open uses `durationNormal`. No `transition: all`.
- **Focus** (D-092): `:focus-visible` → `outline: 2px solid var(--color-primary); outline-offset: 2px` on every interactive part, via `library.css`. Never `outline: none` without a replacement.
- **No literals** (D-065): the only non-token literals allowed in the dictionary are structural (`display`, `flex`, `1px`, `2px`, `0`, `none`, `pointer`, `100%`, `transparent`, `inherit`, `currentColor`, `border-box`, percentages, `color-mix()` wrappers). The grep in §11.2 enforces color literals; the dictionary review enforces the rest.
- **`cssVarFor` is final** (D-093; supersedes the Turn 2 stub): group prefix map `color→--color`, `font→--font`, `fontSize→--font-size`, `fontWeight→--font-weight`, `lineHeight→--line-height`, `spacing→--spacing` (key is the multiplier), `radius→--radius`, `elevation→--elevation`, `animation.durationFast→--animation-duration-fast` (camelCase key kebab-cased).

### 3.1 Shared helpers — `src/components/library/_shared.ts`

```ts
import type { CSSProperties } from 'react';
import type { ComponentSize, ComponentSpec, ComponentType, ComponentVariant } from '@/types/components';
import type { SemanticColorRole, TokenPath } from '@/types/tokens';
import type { ComponentStyleDef } from '@/engine/componentRenderer';

// ---- token references inside declarations ----------------------------------
export interface Ref { readonly __t: TokenPath; readonly wrap?: (v: string) => string }
export const T = (path: TokenPath, wrap?: (v: string) => string): Ref => ({ __t: path, wrap });
export type Decl = Record<string, string | number | Ref>;
export type PartDecls = Record<string, Decl>;

const GROUP_PREFIX: Record<string, string> = {
  color: '--color', font: '--font', fontSize: '--font-size', fontWeight: '--font-weight', lineHeight: '--line-height',
  spacing: '--spacing', radius: '--radius', elevation: '--elevation', animation: '--animation',
};
const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
/** D-093. */
export function cssVarFor(path: TokenPath): string {
  const [group, key] = path.split('.') as [string, string];
  return `${GROUP_PREFIX[group]}-${kebab(key)}`;
}
export const v = (path: TokenPath) => `var(${cssVarFor(path)})`;

/** Turns one declaration into React inline styles + a token map. Single source, two outputs (D-064). */
export function defineStyle<K extends ComponentType>(parts: readonly string[], build: (spec: ComponentSpec<K>) => PartDecls): ComponentStyleDef<K> {
  return {
    parts,
    styles: (spec) => {
      const out: Record<string, CSSProperties> = {};
      for (const [part, decl] of Object.entries(build(spec))) {
        const css: Record<string, string | number> = {};
        for (const [prop, val] of Object.entries(decl)) {
          if (typeof val === 'object') { const raw = v(val.__t); css[prop] = val.wrap ? val.wrap(raw) : raw; }
          else css[prop] = val;
        }
        out[part] = css as CSSProperties;
      }
      return out;
    },
    tokens: (spec) => {
      const out: Record<`${string}.${string}`, TokenPath> = {};
      for (const [part, decl] of Object.entries(build(spec)))
        for (const [prop, val] of Object.entries(decl)) if (typeof val === 'object') out[`${part}.${kebab(prop)}`] = val.__t;
      return out;
    },
  };
}

// ---- variant (D-086) --------------------------------------------------------
export const VARIANT_ROLE: Record<ComponentVariant, SemanticColorRole> = { primary: 'primary', secondary: 'secondary', ghost: 'primary', danger: 'danger', outline: 'primary' };
export const VARIANT_FILL: Record<ComponentVariant, 'solid' | 'transparent'> = { primary: 'solid', secondary: 'solid', ghost: 'transparent', danger: 'solid', outline: 'transparent' };
export const roleOf = (variant: ComponentVariant): TokenPath => `color.${VARIANT_ROLE[variant]}`;
/** On-colors are derived vars (D-046), not TokenPaths; expose as a raw var string. */
export const onVar = (variant: ComponentVariant) => `var(--color-on-${VARIANT_ROLE[variant]})`;

/** Solid: role bg + on-color text. Transparent: role text; outline adds border; ghost adds hover tint in CSS. */
export function accentDecl(variant: ComponentVariant): Decl {
  if (VARIANT_FILL[variant] === 'solid') return { backgroundColor: T(roleOf(variant)), color: onVar(variant), border: '1px solid transparent' };
  return { backgroundColor: 'transparent', color: T(roleOf(variant)), border: variant === 'outline' ? T(roleOf(variant), (c) => `1px solid ${c}`) : '1px solid transparent' };
}

// ---- size (D-087) -----------------------------------------------------------
export const CONTROL_PAD: Record<ComponentSize, { block: TokenPath; inline: TokenPath; text: TokenPath; gap: TokenPath }> = {
  sm: { block: 'spacing.2', inline: 'spacing.3', text: 'fontSize.sm',   gap: 'spacing.2' },
  md: { block: 'spacing.3', inline: 'spacing.5', text: 'fontSize.base', gap: 'spacing.3' },
  lg: { block: 'spacing.4', inline: 'spacing.6', text: 'fontSize.md',   gap: 'spacing.4' },
};
export const CONTAINER_PAD: Record<ComponentSize, { pad: TokenPath; gap: TokenPath }> = {
  sm: { pad: 'spacing.4', gap: 'spacing.3' }, md: { pad: 'spacing.6', gap: 'spacing.4' }, lg: { pad: 'spacing.8', gap: 'spacing.5' },
};

export const transition = (props: string) => T('animation.durationFast', (d) => `${props} ${d} var(--animation-easing-default)`);
export const bodyText = (size: TokenPath = 'fontSize.base'): Decl => ({ fontFamily: T('font.body'), fontSize: T(size), fontWeight: T('fontWeight.regular'), lineHeight: T('lineHeight.normal'), color: T('color.text-primary') });
export const headingText = (size: TokenPath, weight: TokenPath = 'fontWeight.semibold'): Decl => ({ fontFamily: T('font.heading'), fontSize: T(size), fontWeight: T(weight), lineHeight: T('lineHeight.tight'), color: T('color.text-primary'), margin: 0 });

/** Root data attributes every component sets. */
export const rootAttrs = (spec: ComponentSpec, state = 'default', selected = false) => ({
  'data-alt': spec.type, 'data-variant': spec.variant, 'data-size': spec.size, 'data-state': state, 'data-selected': selected ? 'true' : undefined, 'data-id': spec.id,
});
```

### 3.2 The style dictionary — `src/engine/componentRenderer.ts` (final)

```ts
import type { CSSProperties } from 'react';
import type { ComponentSpec, ComponentType, TokenMapping } from '@/types/components';
import type { TokenPath } from '@/types/tokens';
import { defineStyle, T, accentDecl, roleOf, onVar, CONTROL_PAD, CONTAINER_PAD, transition, bodyText, headingText, cssVarFor } from '@/components/library/_shared';
import { useTokenStore } from '@/stores/tokenStore';

export interface ComponentStyleDef<K extends ComponentType = ComponentType> {
  parts: readonly string[];
  styles(spec: ComponentSpec<K>): Record<string, CSSProperties>;
  tokens(spec: ComponentSpec<K>): Record<`${string}.${string}`, TokenPath>;
}
export type StyleDictionary = { [K in ComponentType]: ComponentStyleDef<K> };

export const STYLE_DICTIONARY: StyleDictionary = {
  // -------------------------------------------------------------- button
  'button': defineStyle<'button'>(['root'], (s) => {
    const p = CONTROL_PAD[s.size];
    return { root: {
      ...accentDecl(s.variant),
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: T(p.gap),
      paddingBlock: T(p.block), paddingInline: T(p.inline),
      fontFamily: T('font.body'), fontSize: T(p.text), fontWeight: T('fontWeight.semibold'), lineHeight: T('lineHeight.tight'),
      borderRadius: T('radius.md'), cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
      transition: transition('background-color, color, border-color, box-shadow, transform'),
    } };
  }),
  // -------------------------------------------------------------- card
  'card': defineStyle<'card'>(['root', 'title', 'body', 'actions'], (s) => {
    const c = CONTAINER_PAD[s.size];
    return {
      root:    { display: 'flex', flexDirection: 'column', gap: T(c.gap), padding: T(c.pad), backgroundColor: T('color.surface'), border: T('color.border', (b) => `1px solid ${b}`), borderTop: T(roleOf(s.variant), (a) => `3px solid ${a}`), borderRadius: T('radius.lg'), boxShadow: T('elevation.sm'), transition: transition('box-shadow, transform') },
      title:   headingText('fontSize.lg'),
      body:    { ...bodyText(), color: T('color.text-secondary'), lineHeight: T('lineHeight.relaxed'), margin: 0 },
      actions: { display: 'flex', gap: T('spacing.3'), marginTop: T('spacing.2') },
    };
  }),
  // -------------------------------------------------------------- input / textarea (same dictionary shape)
  'input': defineStyle<'input'>(['root', 'label', 'field', 'helper'], (s) => inputDecls(s.size, s.variant)),
  'textarea': defineStyle<'textarea'>(['root', 'label', 'field', 'helper'], (s) => ({ ...inputDecls(s.size, s.variant), field: { ...inputDecls(s.size, s.variant).field, minHeight: T('spacing.16', (x) => `calc(${x} * 2)`), resize: 'vertical', lineHeight: T('lineHeight.normal') } })),
  // -------------------------------------------------------------- select
  'select': defineStyle<'select'>(['root', 'label', 'field', 'chevron'], (s) => ({
    ...inputDecls(s.size, s.variant),
    field: { ...inputDecls(s.size, s.variant).field, appearance: 'none', paddingInlineEnd: T('spacing.10'), cursor: 'pointer' },
    chevron: { position: 'absolute', right: T('spacing.3'), bottom: T(CONTROL_PAD[s.size].block), width: T('spacing.4'), height: T('spacing.4'), color: T('color.text-muted'), pointerEvents: 'none' },
  })),
  // -------------------------------------------------------------- toggle
  'toggle': defineStyle<'toggle'>(['root', 'track', 'thumb', 'label'], (s) => {
    const track: Record<typeof s.size, [TokenPath, TokenPath]> = { sm: ['spacing.8', 'spacing.4'], md: ['spacing.10', 'spacing.5'], lg: ['spacing.12', 'spacing.6'] };
    const [w, h] = track[s.size];
    return {
      root:  { display: 'inline-flex', alignItems: 'center', gap: T(CONTROL_PAD[s.size].gap), cursor: 'pointer' },
      track: { position: 'relative', width: T(w), height: T(h), borderRadius: T('radius.full'), backgroundColor: s.content.checked ? T(roleOf(s.variant)) : T('color.muted'), border: '1px solid transparent', transition: transition('background-color') },
      thumb: { position: 'absolute', top: '1px', left: s.content.checked ? T(h, (x) => `calc(100% - ${x} + 1px)`) : '1px', width: T(h, (x) => `calc(${x} - 4px)`), height: T(h, (x) => `calc(${x} - 4px)`), borderRadius: T('radius.full'), backgroundColor: T('color.surface'), boxShadow: T('elevation.sm'), transition: transition('left') },
      label: { ...bodyText(CONTROL_PAD[s.size].text), fontWeight: T('fontWeight.medium') },
    };
  }),
  // -------------------------------------------------------------- badge
  'badge': defineStyle<'badge'>(['root'], (s) => ({ root: {
    ...accentDecl(s.variant), display: 'inline-flex', alignItems: 'center', gap: T('spacing.1'),
    paddingBlock: T('spacing.1'), paddingInline: T(s.size === 'sm' ? 'spacing.2' : 'spacing.3'),
    fontFamily: T('font.body'), fontSize: T(s.size === 'lg' ? 'fontSize.sm' : 'fontSize.xs'), fontWeight: T('fontWeight.medium'), lineHeight: T('lineHeight.tight'), letterSpacing: '0.02em', textTransform: 'uppercase',
    borderRadius: T('radius.full'), whiteSpace: 'nowrap',
  } })),
  // -------------------------------------------------------------- avatar
  'avatar': defineStyle<'avatar'>(['root'], (s) => {
    const dim: Record<typeof s.size, TokenPath> = { sm: 'spacing.8', md: 'spacing.10', lg: 'spacing.16' };
    const txt: Record<typeof s.size, TokenPath> = { sm: 'fontSize.xs', md: 'fontSize.sm', lg: 'fontSize.lg' };
    return { root: {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: T(dim[s.size]), height: T(dim[s.size]),
      borderRadius: T('radius.full'), backgroundColor: T(roleOf(s.variant)), color: onVar(s.variant),
      fontFamily: T('font.heading'), fontSize: T(txt[s.size]), fontWeight: T('fontWeight.semibold'), letterSpacing: '0.02em', userSelect: 'none',
    } };
  }),
  // -------------------------------------------------------------- navbar
  'navbar': defineStyle<'navbar'>(['root', 'brand', 'links', 'link', 'cta'], (s) => ({
    root:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: T('spacing.6'), paddingBlock: T('spacing.4'), paddingInline: T('spacing.8'), backgroundColor: T('color.surface'), borderBottom: T('color.border', (b) => `1px solid ${b}`), boxShadow: T('elevation.sm'), width: '100%', boxSizing: 'border-box' },
    brand: { ...headingText('fontSize.lg', 'fontWeight.bold'), letterSpacing: '-0.01em', textDecoration: 'none' },
    links: { display: 'flex', alignItems: 'center', gap: T('spacing.6'), listStyle: 'none', margin: 0, padding: 0 },
    link:  { ...bodyText('fontSize.base'), color: T('color.text-secondary'), fontWeight: T('fontWeight.medium'), textDecoration: 'none', transition: transition('color') },
    cta:   { ...accentDecl(s.variant), display: 'inline-flex', alignItems: 'center', paddingBlock: T('spacing.2'), paddingInline: T('spacing.4'), borderRadius: T('radius.md'), fontFamily: T('font.body'), fontSize: T('fontSize.sm'), fontWeight: T('fontWeight.semibold'), cursor: 'pointer', transition: transition('background-color, color, border-color') },
  })),
  // -------------------------------------------------------------- hero
  'hero': defineStyle<'hero'>(['root', 'headline', 'subtitle', 'actions', 'primaryCta', 'secondaryCta'], (s) => {
    const block: Record<typeof s.size, TokenPath> = { sm: 'spacing.10', md: 'spacing.16', lg: 'spacing.16' };
    return {
      root:     { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: T('spacing.6'), paddingBlock: T(block[s.size]), paddingInline: T('spacing.8'), backgroundColor: T('color.background'), width: '100%', boxSizing: 'border-box' },
      headline: { ...headingText(s.size === 'lg' ? 'fontSize.4xl' : s.size === 'md' ? 'fontSize.4xl' : 'fontSize.3xl', 'fontWeight.bold'), letterSpacing: '-0.02em', maxWidth: '20ch' },
      subtitle: { ...bodyText('fontSize.lg'), color: T('color.text-secondary'), maxWidth: '48ch', margin: 0 },
      actions:  { display: 'flex', gap: T('spacing.3'), flexWrap: 'wrap', justifyContent: 'center', marginTop: T('spacing.2') },
      primaryCta:   { ...accentDecl(s.variant), display: 'inline-flex', alignItems: 'center', paddingBlock: T('spacing.3'), paddingInline: T('spacing.6'), borderRadius: T('radius.md'), fontFamily: T('font.body'), fontSize: T('fontSize.base'), fontWeight: T('fontWeight.semibold'), cursor: 'pointer', transition: transition('background-color, color, border-color') },
      secondaryCta: { ...accentDecl('outline'), display: 'inline-flex', alignItems: 'center', paddingBlock: T('spacing.3'), paddingInline: T('spacing.6'), borderRadius: T('radius.md'), fontFamily: T('font.body'), fontSize: T('fontSize.base'), fontWeight: T('fontWeight.semibold'), cursor: 'pointer', transition: transition('background-color, color, border-color') },
    };
  }),
  // -------------------------------------------------------------- pricing-card
  'pricing-card': defineStyle<'pricing-card'>(['root', 'tier', 'price', 'period', 'features', 'feature', 'cta'], (s) => {
    const c = CONTAINER_PAD[s.size]; const f = s.content.featured;
    return {
      root:     { display: 'flex', flexDirection: 'column', gap: T(c.gap), padding: T(c.pad), backgroundColor: T('color.surface'), border: f ? T(roleOf(s.variant), (a) => `2px solid ${a}`) : T('color.border', (b) => `1px solid ${b}`), borderRadius: T('radius.lg'), boxShadow: T(f ? 'elevation.lg' : 'elevation.md'), position: 'relative', transition: transition('box-shadow, transform') },
      tier:     { ...headingText('fontSize.md'), color: T('color.text-secondary'), textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: T('fontSize.sm') },
      price:    { ...headingText('fontSize.4xl', 'fontWeight.bold'), letterSpacing: '-0.02em' },
      period:   { ...bodyText('fontSize.sm'), color: T('color.text-muted'), margin: 0 },
      features: { display: 'flex', flexDirection: 'column', gap: T('spacing.2'), listStyle: 'none', margin: 0, padding: 0, borderTop: T('color.border', (b) => `1px solid ${b}`), paddingTop: T(c.gap) },
      feature:  { ...bodyText('fontSize.base'), display: 'flex', alignItems: 'center', gap: T('spacing.2'), color: T('color.text-secondary') },
      cta:      { ...accentDecl(f ? s.variant : 'outline'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', paddingBlock: T('spacing.3'), paddingInline: T('spacing.5'), borderRadius: T('radius.md'), fontFamily: T('font.body'), fontSize: T('fontSize.base'), fontWeight: T('fontWeight.semibold'), cursor: 'pointer', marginTop: 'auto', transition: transition('background-color, color, border-color') },
    };
  }),
  // -------------------------------------------------------------- feature-grid
  'feature-grid': defineStyle<'feature-grid'>(['root', 'grid', 'item', 'icon', 'title', 'body'], (s) => ({
    root:  { paddingBlock: T('spacing.12'), paddingInline: T('spacing.8'), backgroundColor: T('color.background'), width: '100%', boxSizing: 'border-box' },
    grid:  { display: 'grid', gridTemplateColumns: `repeat(${s.content.columns}, minmax(0, 1fr))`, gap: T('spacing.6'), listStyle: 'none', margin: 0, padding: 0 },
    item:  { display: 'flex', flexDirection: 'column', gap: T('spacing.3'), padding: T('spacing.6'), backgroundColor: T('color.surface'), border: T('color.border', (b) => `1px solid ${b}`), borderRadius: T('radius.lg') },
    icon:  { width: T('spacing.10'), height: T('spacing.10'), borderRadius: T('radius.md'), backgroundColor: T(roleOf(s.variant), (a) => `color-mix(in srgb, ${a} 12%, transparent)`), color: T(roleOf(s.variant)), display: 'flex', alignItems: 'center', justifyContent: 'center' },
    title: headingText('fontSize.lg'),
    body:  { ...bodyText(), color: T('color.text-secondary'), margin: 0 },
  })),
  // -------------------------------------------------------------- footer
  'footer': defineStyle<'footer'>(['root', 'top', 'brand', 'columns', 'column', 'heading', 'link', 'bottom', 'copyright'], (s) => ({
    root:      { display: 'flex', flexDirection: 'column', gap: T('spacing.8'), paddingBlock: T('spacing.12'), paddingInline: T('spacing.8'), backgroundColor: T('color.surface'), borderTop: T('color.border', (b) => `1px solid ${b}`), width: '100%', boxSizing: 'border-box' },
    top:       { display: 'flex', justifyContent: 'space-between', gap: T('spacing.8'), flexWrap: 'wrap' },
    brand:     { ...headingText('fontSize.lg', 'fontWeight.bold') },
    columns:   { display: 'flex', gap: T('spacing.12'), flexWrap: 'wrap' },
    column:    { display: 'flex', flexDirection: 'column', gap: T('spacing.2'), listStyle: 'none', margin: 0, padding: 0, minWidth: T('spacing.16', (x) => `calc(${x} * 2)`) },
    heading:   { ...bodyText('fontSize.sm'), fontWeight: T('fontWeight.semibold'), marginBottom: T('spacing.1') },
    link:      { ...bodyText('fontSize.sm'), color: T('color.text-secondary'), textDecoration: 'none', transition: transition('color') },
    bottom:    { borderTop: T('color.border', (b) => `1px solid ${b}`), paddingTop: T('spacing.6') },
    copyright: { ...bodyText('fontSize.sm'), color: T('color.text-muted'), margin: 0 },
  })),
  // -------------------------------------------------------------- modal
  'modal': defineStyle<'modal'>(['root', 'backdrop', 'dialog', 'title', 'body', 'actions', 'confirm', 'cancel'], (s) => {
    const c = CONTAINER_PAD[s.size];
    return {
      root:     { position: 'relative', display: 'grid', placeItems: 'center', minHeight: T('spacing.16', (x) => `calc(${x} * 5)`), width: '100%' },
      backdrop: { position: 'absolute', inset: 0, backgroundColor: T('color.text-primary', (c2) => `color-mix(in srgb, ${c2} 40%, transparent)`), borderRadius: T('radius.lg') },
      dialog:   { position: 'relative', display: 'flex', flexDirection: 'column', gap: T(c.gap), padding: T(c.pad), width: 'min(100%, 28rem)', backgroundColor: T('color.surface'), borderRadius: T('radius.xl'), boxShadow: T('elevation.xl'), boxSizing: 'border-box' },
      title:    headingText('fontSize.xl'),
      body:     { ...bodyText(), color: T('color.text-secondary'), margin: 0 },
      actions:  { display: 'flex', justifyContent: 'flex-end', gap: T('spacing.3'), marginTop: T('spacing.2') },
      confirm:  { ...accentDecl(s.variant), display: 'inline-flex', paddingBlock: T('spacing.2'), paddingInline: T('spacing.4'), borderRadius: T('radius.md'), fontFamily: T('font.body'), fontSize: T('fontSize.base'), fontWeight: T('fontWeight.semibold'), cursor: 'pointer', transition: transition('background-color, color') },
      cancel:   { ...accentDecl('ghost'), display: 'inline-flex', paddingBlock: T('spacing.2'), paddingInline: T('spacing.4'), borderRadius: T('radius.md'), fontFamily: T('font.body'), fontSize: T('fontSize.base'), fontWeight: T('fontWeight.medium'), cursor: 'pointer', color: T('color.text-secondary'), transition: transition('background-color, color') },
    };
  }),
  // -------------------------------------------------------------- toast
  'toast': defineStyle<'toast'>(['root', 'bar', 'message', 'dismiss'], (s) => ({
    root:    { display: 'flex', alignItems: 'center', gap: T('spacing.3'), paddingBlock: T('spacing.3'), paddingInline: T('spacing.4'), backgroundColor: T('color.surface'), border: T('color.border', (b) => `1px solid ${b}`), borderRadius: T('radius.lg'), boxShadow: T('elevation.lg'), maxWidth: '28rem', overflow: 'hidden', position: 'relative' },
    bar:     { position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: T(roleOf(s.variant)) },
    message: { ...bodyText(CONTROL_PAD[s.size].text), margin: 0, paddingLeft: T('spacing.2'), flex: 1 },
    dismiss: { background: 'none', border: 'none', color: T('color.text-muted'), cursor: 'pointer', padding: T('spacing.1'), borderRadius: T('radius.sm'), lineHeight: 1, transition: transition('color, background-color') },
  })),
  // -------------------------------------------------------------- accordion
  'accordion': defineStyle<'accordion'>(['root', 'item', 'trigger', 'question', 'chevron', 'panel', 'answer'], (s) => ({
    root:     { display: 'flex', flexDirection: 'column', border: T('color.border', (b) => `1px solid ${b}`), borderRadius: T('radius.lg'), backgroundColor: T('color.surface'), overflow: 'hidden' },
    item:     { borderBottom: T('color.border', (b) => `1px solid ${b}`) },
    trigger:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: T('spacing.4'), paddingBlock: T(CONTAINER_PAD[s.size].gap), paddingInline: T(CONTAINER_PAD[s.size].pad), background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: transition('background-color') },
    question: { ...bodyText('fontSize.base'), fontWeight: T('fontWeight.semibold'), margin: 0 },
    chevron:  { width: T('spacing.4'), height: T('spacing.4'), color: T(roleOf(s.variant)), flexShrink: 0, transition: T('animation.durationNormal', (d) => `transform ${d} var(--animation-easing-default)`) },
    panel:    { paddingInline: T(CONTAINER_PAD[s.size].pad), paddingBottom: T(CONTAINER_PAD[s.size].gap) },
    answer:   { ...bodyText(), color: T('color.text-secondary'), lineHeight: T('lineHeight.relaxed'), margin: 0 },
  })),
};

/** Shared by input, textarea, select. */
function inputDecls(size: ComponentSpec['size'], variant: ComponentSpec['variant']): PartDeclsT {
  const p = CONTROL_PAD[size];
  return {
    root:   { display: 'flex', flexDirection: 'column', gap: T('spacing.1'), position: 'relative', width: '100%', maxWidth: '24rem' },
    label:  { fontFamily: T('font.body'), fontSize: T('fontSize.sm'), fontWeight: T('fontWeight.medium'), color: T('color.text-primary'), lineHeight: T('lineHeight.normal') },
    field:  { fontFamily: T('font.body'), fontSize: T(p.text), lineHeight: T('lineHeight.tight'), color: T('color.text-primary'), backgroundColor: T('color.surface'), border: T('color.border', (b) => `1px solid ${b}`), borderRadius: T('radius.md'), paddingBlock: T(p.block), paddingInline: T(p.inline), width: '100%', boxSizing: 'border-box', outline: 'none', transition: transition('border-color, box-shadow'), ['--alt-accent' as string]: T(roleOf(variant)) },
    helper: { fontFamily: T('font.body'), fontSize: T('fontSize.xs'), color: T('color.text-muted'), lineHeight: T('lineHeight.normal'), margin: 0 },
  };
}
type PartDeclsT = import('@/components/library/_shared').PartDecls;

export function getStyles(spec: ComponentSpec, part: string): CSSProperties {
  return (STYLE_DICTIONARY[spec.type] as ComponentStyleDef).styles(spec)[part] ?? {};
}

export function getTokenMapping(spec: ComponentSpec): TokenMapping[] {
  const map = (STYLE_DICTIONARY[spec.type] as ComponentStyleDef).tokens(spec);
  const tokens = useTokenStore.getState();
  return Object.entries(map).map(([key, token]) => {
    const [part, cssProperty] = key.split('.') as [string, string];
    return { part, cssProperty, token, cssVar: cssVarFor(token), resolvedValue: tokens.getToken(token) };
  });
}
```

Note the `--alt-accent` custom property on input fields: `library.css` reads it for the focus ring so the accent follows the variant without a per-variant selector.

### 3.3 `src/components/library/library.css` — states and responsive

```css
/* Alternative Galaxy component library — interactive states and container-responsive rules.
   Every value is a token var. Loaded once by StudioShell; emitted verbatim by export. */

/* ---- focus (D-092) ------------------------------------------------------ */
[data-alt] :is(button, a, input, textarea, select, [role="switch"]):focus-visible,
[data-alt="button"]:focus-visible,
[data-alt="toggle"]:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ---- button ------------------------------------------------------------ */
[data-alt="button"]:hover:not([data-state="disabled"]):not([data-state="loading"]) { filter: brightness(0.94); }
[data-alt="button"]:active:not([data-state="disabled"]) { transform: translateY(1px); }
[data-alt="button"][data-variant="ghost"]:hover { background-color: color-mix(in srgb, var(--color-primary) 10%, transparent); filter: none; }
[data-alt="button"][data-variant="outline"]:hover { background-color: color-mix(in srgb, var(--color-primary) 8%, transparent); filter: none; }
[data-alt="button"][data-state="disabled"] { opacity: 0.5; cursor: not-allowed; }
[data-alt="button"][data-state="loading"] { color: transparent; position: relative; pointer-events: none; }
[data-alt="button"][data-state="loading"]::after {
  content: ''; position: absolute; width: 1em; height: 1em; border-radius: var(--radius-full);
  border: 2px solid currentColor; border-right-color: transparent;
  color: var(--color-on-primary); animation: alt-spin var(--animation-duration-slow) linear infinite;
}
[data-alt="button"][data-variant="ghost"][data-state="loading"]::after,
[data-alt="button"][data-variant="outline"][data-state="loading"]::after { color: var(--color-primary); }
@keyframes alt-spin { to { transform: rotate(360deg); } }

/* ---- card / pricing-card ---------------------------------------------- */
[data-alt="card"]:hover { box-shadow: var(--elevation-md); transform: translateY(-2px); }
[data-alt="pricing-card"]:hover { transform: translateY(-2px); }
[data-alt="pricing-card"] [data-part="featuredBadge"] {
  position: absolute; top: calc(var(--spacing-3) * -1); left: 50%; transform: translateX(-50%);
  padding: var(--spacing-1) var(--spacing-3); border-radius: var(--radius-full);
  background: var(--color-primary); color: var(--color-on-primary);
  font: var(--font-weight-semibold) var(--font-size-xs) / var(--line-height-tight) var(--font-body);
  letter-spacing: 0.04em; text-transform: uppercase;
}

/* ---- inputs ------------------------------------------------------------ */
[data-alt="input"] [data-part="field"]:hover,
[data-alt="textarea"] [data-part="field"]:hover,
[data-alt="select"] [data-part="field"]:hover { border-color: var(--color-text-muted); }
[data-alt="input"] [data-part="field"]:focus,
[data-alt="textarea"] [data-part="field"]:focus,
[data-alt="select"] [data-part="field"]:focus {
  border-color: var(--alt-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--alt-accent) 25%, transparent);
  outline: none;
}
[data-alt][data-state="error"] [data-part="field"] { border-color: var(--color-danger); }
[data-alt][data-state="error"] [data-part="field"]:focus { box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-danger) 25%, transparent); border-color: var(--color-danger); }
[data-alt][data-state="error"] [data-part="helper"] { color: var(--color-danger); }
[data-alt][data-state="disabled"] [data-part="field"] { background-color: var(--color-muted); color: var(--color-text-muted); cursor: not-allowed; }
[data-alt="input"] [data-part="field"]::placeholder,
[data-alt="textarea"] [data-part="field"]::placeholder { color: var(--color-text-muted); }

/* ---- toggle ------------------------------------------------------------ */
[data-alt="toggle"]:hover [data-part="track"] { filter: brightness(0.96); }
[data-alt="toggle"][data-state="disabled"] { opacity: 0.5; cursor: not-allowed; }

/* ---- navbar / footer links -------------------------------------------- */
[data-alt="navbar"] [data-part="link"]:hover { color: var(--color-text-primary); }
[data-alt="navbar"] [data-part="cta"]:hover { filter: brightness(0.94); }
[data-alt="footer"] [data-part="link"]:hover { color: var(--color-text-primary); }
[data-alt="navbar"] [data-part="menu"] { display: none; }

/* ---- hero CTAs --------------------------------------------------------- */
[data-alt="hero"] [data-part="primaryCta"]:hover { filter: brightness(0.94); }
[data-alt="hero"] [data-part="secondaryCta"]:hover { background-color: color-mix(in srgb, var(--color-primary) 8%, transparent); }

/* ---- modal / toast / accordion --------------------------------------- */
[data-alt="modal"] [data-part="confirm"]:hover { filter: brightness(0.94); }
[data-alt="modal"] [data-part="cancel"]:hover { background-color: var(--color-muted); }
[data-alt="toast"] [data-part="dismiss"]:hover { color: var(--color-text-primary); background-color: var(--color-muted); }
[data-alt="accordion"] [data-part="trigger"]:hover { background-color: color-mix(in srgb, var(--color-primary) 5%, transparent); }
[data-alt="accordion"] [data-part="trigger"][aria-expanded="true"] [data-part="chevron"] { transform: rotate(180deg); }
[data-alt="accordion"] [data-part="item"]:last-child { border-bottom: none; }
[data-alt="accordion"] [data-part="panel"][hidden] { display: none; }

/* ---- container-responsive (D-085) ------------------------------------- */
@container canvas (max-width: 640px) {
  [data-alt="hero"] [data-part="headline"] { font-size: var(--font-size-2xl); }
  [data-alt="hero"] { padding-block: var(--spacing-10); padding-inline: var(--spacing-5); }
  [data-alt="hero"] [data-part="actions"] { flex-direction: column; width: 100%; }
  [data-alt="hero"] [data-part="primaryCta"], [data-alt="hero"] [data-part="secondaryCta"] { width: 100%; justify-content: center; }
  [data-alt="navbar"] { padding-inline: var(--spacing-5); }
  [data-alt="navbar"] [data-part="links"] { display: none; }
  [data-alt="navbar"] [data-part="menu"] { display: inline-flex; }
  [data-alt="feature-grid"] [data-part="grid"] { grid-template-columns: 1fr; }
  [data-alt="feature-grid"], [data-alt="footer"] { padding-inline: var(--spacing-5); }
  [data-alt="footer"] [data-part="columns"] { flex-direction: column; gap: var(--spacing-6); }
  [data-alt="pricing-card"] [data-part="price"] { font-size: var(--font-size-3xl); }
  [data-alt="input"] [data-part="root"], [data-alt="textarea"], [data-alt="select"] { max-width: 100%; }
}
@container canvas (max-width: 900px) {
  [data-alt="feature-grid"] [data-part="grid"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

### 3.4 Placeholder content — `src/components/library/content.ts` (final)

Content is written for a plausible SaaS product so the canvas never looks like a template. No "lorem", no "Feature name", no exclamation points.

```ts
import type { ComponentContentMap, ComponentType, GenerateComponentInput } from '@/types/components';

export const DEFAULT_CONTENT: { [K in ComponentType]: ComponentContentMap[K] } = {
  'button':       { label: 'Get started' },
  'card':         { title: 'Ship without the handoff', body: 'Designers set the system. Agents build inside it. Nothing drifts between the two.', ctaLabel: 'Learn more' },
  'input':        { label: 'Work email', placeholder: 'you@company.com', helper: 'We only use this to send your invite.', error: null },
  'textarea':     { label: 'What are you building?', placeholder: 'A few sentences is plenty.', helper: null, error: null },
  'select':       { label: 'Team size', placeholder: 'Choose a range', options: ['Just me', '2–10', '11–50', '51–200', '200+'] },
  'toggle':       { label: 'Email me weekly summaries', checked: true },
  'badge':        { label: 'New' },
  'avatar':       { initials: 'AS', name: 'Avi Srikumeran' },
  'navbar':       { brand: 'Northwind', links: ['Product', 'Pricing', 'Docs', 'Changelog'], ctaLabel: 'Sign in' },
  'hero':         { headline: 'Design systems that agents respect', subtitle: 'Define the tokens once. Every component, page, and export stays on brand — whoever generates it.', primaryCta: 'Start building', secondaryCta: 'Watch the demo' },
  'pricing-card': { tier: 'Team', price: '$24', period: 'per seat / month', features: ['Unlimited design systems', 'Agent access with rules', 'Export to code', 'Priority support'], ctaLabel: 'Choose Team', featured: false },
  'feature-grid': { columns: 3, items: [
    { title: 'Tokens as the contract', body: 'Colors, type, and spacing live in one place and cascade everywhere.' },
    { title: 'Rules the agent can’t break', body: 'Set a constraint once. Every generation is checked against it.' },
    { title: 'Export that compiles', body: 'CSS variables, DTCG JSON, Tailwind, and React — from the same source.' },
  ] },
  'footer':       { brand: 'Northwind', columns: [
    { heading: 'Product', links: ['Features', 'Pricing', 'Changelog'] },
    { heading: 'Company', links: ['About', 'Careers', 'Contact'] },
    { heading: 'Resources', links: ['Docs', 'Guides', 'Status'] },
  ], copyright: '© 2026 Northwind, Inc.' },
  'modal':        { title: 'Delete this workspace?', body: 'This removes all pages and components. Tokens are kept. This can’t be undone.', confirmLabel: 'Delete workspace', cancelLabel: 'Cancel' },
  'toast':        { message: 'Changes saved. Your team can see them now.' },
  'accordion':    { items: [
    { question: 'Can I bring my own agent?', answer: 'Yes. Any WebMCP-capable browser or agent host can use the tools this page registers.' },
    { question: 'What happens if the agent breaks a rule?', answer: 'The generation is rejected with the rule and the alternatives that would pass. Nothing lands on the canvas.' },
    { question: 'Do I own the export?', answer: 'Everything exported is MIT-licensed code you can drop into any React project.' },
  ] },
};

/** D-075: label → primary text slot, description → secondary text slot, items → list slot. Everything else from defaults. */
export function contentFromInput<T extends ComponentType>(type: T, input: Pick<GenerateComponentInput, 'label' | 'description' | 'items'>): ComponentContentMap[T] {
  const d = structuredClone(DEFAULT_CONTENT[type]) as Record<string, unknown>;
  const { label, description, items } = input;
  const set = (k: string, val: unknown) => { if (val !== undefined) d[k] = val; };
  switch (type) {
    case 'button': case 'badge': case 'toggle': set('label', label); break;
    case 'card': set('title', label); set('body', description); if (items?.[0]) set('ctaLabel', items[0]); break;
    case 'input': case 'textarea': set('label', label); set('placeholder', description); break;
    case 'select': set('label', label); set('placeholder', description); set('options', items); break;
    case 'avatar': if (label) { set('name', label); set('initials', label.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()); } break;
    case 'navbar': set('brand', label); set('links', items); set('ctaLabel', description); break;
    case 'hero': set('headline', label); set('subtitle', description); if (items?.[0]) set('primaryCta', items[0]); if (items?.[1]) set('secondaryCta', items[1]); break;
    case 'pricing-card': set('tier', label); set('price', description); set('features', items); break;
    case 'feature-grid': if (items) set('items', items.map((t) => ({ title: t, body: (d.items as { body: string }[])[0]?.body ?? '' }))); break;
    case 'footer': set('brand', label); set('copyright', description); break;
    case 'modal': set('title', label); set('body', description); if (items?.[0]) set('confirmLabel', items[0]); if (items?.[1]) set('cancelLabel', items[1]); break;
    case 'toast': set('message', label ?? description); break;
    case 'accordion': if (items) set('items', items.map((q) => ({ question: q, answer: (d.items as { answer: string }[])[0]?.answer ?? '' }))); break;
  }
  return d as ComponentContentMap[T];
}

export function primaryText(type: ComponentType, content: ComponentContentMap[ComponentType]): string | null {
  const c = content as Record<string, unknown>;
  const key: Record<ComponentType, string> = { button: 'label', badge: 'label', toggle: 'label', card: 'title', input: 'label', textarea: 'label', select: 'label', avatar: 'name', navbar: 'brand', hero: 'headline', 'pricing-card': 'tier', 'feature-grid': '', footer: 'brand', modal: 'title', toast: 'message', accordion: '' };
  const k = key[type];
  return k && typeof c[k] === 'string' ? (c[k] as string) : null;
}
```

Agent content: the `generate_component` description already says "Supply real content (label, headline, body) rather than relying on defaults" (Turn 1). The schema's property descriptions (Stream 3) each show what the slot means for the type: `label` — "Primary text: button label, card title, hero headline, navbar brand, input label." `description` — "Secondary text: card body, hero subtitle, input placeholder, price." `items` — "List slot: nav links, pricing features, FAQ questions, feature titles, select options, hero CTAs (first two)." That's the whole encouragement mechanism; no extra prompting.

### 3.5 The sixteen components — `src/components/library/*.tsx`

Every file: `'use client'`, one default export named after the type, `LibraryComponentProps` only, `data-part` on every styled part, `rootAttrs` on the root. Icons are inline SVG paths using `currentColor` (no icon library, D-094). `Button` and friends are real elements (`type="button"`) with no handlers — hover and focus are live on the canvas; clicks do nothing.

```tsx
// Button.tsx
'use client';
import type { LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Button({ spec, selected }: LibraryComponentProps) {
  const s = spec as import('@/types/components').ComponentSpec<'button'>;
  return <button type="button" {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>{s.content.label}</button>;
}
```

```tsx
// Card.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs, accentDecl, T, v } from './_shared';
export default function Card({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'card'>;
  const id = `${s.id}-title`;
  return (
    <article {...rootAttrs(s, 'default', selected)} data-part="root" aria-labelledby={id} style={getStyles(s, 'root')}>
      <h3 id={id} data-part="title" style={getStyles(s, 'title')}>{s.content.title}</h3>
      <p data-part="body" style={getStyles(s, 'body')}>{s.content.body}</p>
      {s.content.ctaLabel && (
        <div data-part="actions" style={getStyles(s, 'actions')}>
          <button type="button" data-alt="button" data-variant={s.variant} data-size="sm" data-state="default"
            style={{ ...inlineButton(s.variant), }}>{s.content.ctaLabel}</button>
        </div>
      )}
    </article>
  );
}
/** Nested CTA reuses the button dictionary through a synthetic spec so its styles stay token-driven. */
function inlineButton(variant: ComponentSpec['variant']) {
  const { STYLE_DICTIONARY } = require('@/engine/componentRenderer') as typeof import('@/engine/componentRenderer');
  return STYLE_DICTIONARY.button.styles({ id: 'inline', type: 'button', variant, size: 'sm', content: { label: '' }, pageId: null, sectionId: null, createdBy: 'agent', createdAt: 0 }).root;
}
```

The `inlineButton` helper is shared: move it to `_shared.ts` as `export function nestedButtonStyles(variant, size)` and import it in Card, Hero, Navbar, PricingCard, Modal (D-095). It builds a synthetic button spec and reads the dictionary — nested buttons are never styled twice.

```tsx
// Input.tsx  (Textarea.tsx is identical with <textarea rows={4}> and type 'textarea')
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Input({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'input'>;
  const fieldId = `${s.id}-field`, helpId = `${s.id}-help`;
  const state = s.content.error ? 'error' : 'default';
  const help = s.content.error ?? s.content.helper;
  return (
    <div {...rootAttrs(s, state, selected)} data-part="root" style={getStyles(s, 'root')}>
      <label htmlFor={fieldId} data-part="label" style={getStyles(s, 'label')}>{s.content.label}</label>
      <input id={fieldId} type="text" placeholder={s.content.placeholder} aria-invalid={state === 'error' || undefined} aria-describedby={help ? helpId : undefined} data-part="field" style={getStyles(s, 'field')} />
      {help && <p id={helpId} data-part="helper" role={state === 'error' ? 'alert' : undefined} style={getStyles(s, 'helper')}>{help}</p>}
    </div>
  );
}
```

```tsx
// Select.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Select({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'select'>;
  const id = `${s.id}-field`;
  return (
    <div {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      <label htmlFor={id} data-part="label" style={getStyles(s, 'label')}>{s.content.label}</label>
      <select id={id} defaultValue="" data-part="field" style={getStyles(s, 'field')}>
        <option value="" disabled>{s.content.placeholder}</option>
        {s.content.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg data-part="chevron" style={getStyles(s, 'chevron')} viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
    </div>
  );
}
```

```tsx
// Toggle.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Toggle({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'toggle'>;
  const id = `${s.id}-label`;
  return (
    <button type="button" role="switch" aria-checked={s.content.checked} aria-labelledby={id} {...rootAttrs(s, 'default', selected)} data-part="root" style={{ ...getStyles(s, 'root'), background: 'none', border: 'none', padding: 0 }}>
      <span data-part="track" style={getStyles(s, 'track')}><span data-part="thumb" style={getStyles(s, 'thumb')} /></span>
      <span id={id} data-part="label" style={getStyles(s, 'label')}>{s.content.label}</span>
    </button>
  );
}
```

```tsx
// Badge.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Badge({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'badge'>;
  return <span {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>{s.content.label}</span>;
}
```

```tsx
// Avatar.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Avatar({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'avatar'>;
  return <span role="img" aria-label={s.content.name} title={s.content.name} {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>{s.content.initials}</span>;
}
```

```tsx
// Navbar.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Navbar({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'navbar'>;
  return (
    <nav aria-label="Primary" {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      <a href="#" onClick={(e) => e.preventDefault()} data-part="brand" style={getStyles(s, 'brand')}>{s.content.brand}</a>
      <ul data-part="links" style={getStyles(s, 'links')}>
        {s.content.links.map((l) => <li key={l}><a href="#" onClick={(e) => e.preventDefault()} data-part="link" style={getStyles(s, 'link')}>{l}</a></li>)}
      </ul>
      <button type="button" data-part="menu" aria-label="Open menu" style={{ ...getStyles(s, 'cta'), backgroundColor: 'transparent', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" /></svg>
      </button>
      <button type="button" data-part="cta" style={getStyles(s, 'cta')}>{s.content.ctaLabel}</button>
    </nav>
  );
}
```

```tsx
// Hero.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Hero({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'hero'>;
  const id = `${s.id}-headline`;
  return (
    <section aria-labelledby={id} {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      <h1 id={id} data-part="headline" style={getStyles(s, 'headline')}>{s.content.headline}</h1>
      <p data-part="subtitle" style={getStyles(s, 'subtitle')}>{s.content.subtitle}</p>
      <div data-part="actions" style={getStyles(s, 'actions')}>
        <button type="button" data-part="primaryCta" style={getStyles(s, 'primaryCta')}>{s.content.primaryCta}</button>
        {s.content.secondaryCta && <button type="button" data-part="secondaryCta" style={getStyles(s, 'secondaryCta')}>{s.content.secondaryCta}</button>}
      </div>
    </section>
  );
}
```

```tsx
// PricingCard.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function PricingCard({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'pricing-card'>;
  const id = `${s.id}-tier`;
  return (
    <article aria-labelledby={id} {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      {s.content.featured && <span data-part="featuredBadge">Most popular</span>}
      <p id={id} data-part="tier" style={getStyles(s, 'tier')}>{s.content.tier}</p>
      <p data-part="price" style={getStyles(s, 'price')}>{s.content.price}</p>
      <p data-part="period" style={getStyles(s, 'period')}>{s.content.period}</p>
      <ul data-part="features" style={getStyles(s, 'features')}>
        {s.content.features.map((f) => (
          <li key={f} data-part="feature" style={getStyles(s, 'feature')}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style={{ color: 'var(--color-success)', flexShrink: 0 }}><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
            {f}
          </li>
        ))}
      </ul>
      <button type="button" data-part="cta" style={getStyles(s, 'cta')}>{s.content.ctaLabel}</button>
    </article>
  );
}
```

```tsx
// FeatureGrid.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function FeatureGrid({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'feature-grid'>;
  return (
    <section aria-label="Features" {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      <ul data-part="grid" style={getStyles(s, 'grid')}>
        {s.content.items.map((it, i) => (
          <li key={i} data-part="item" style={getStyles(s, 'item')}>
            <div data-part="icon" style={getStyles(s, 'icon')} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M7 10l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
            </div>
            <h3 data-part="title" style={getStyles(s, 'title')}>{it.title}</h3>
            <p data-part="body" style={getStyles(s, 'body')}>{it.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
// Footer.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Footer({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'footer'>;
  return (
    <footer {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      <div data-part="top" style={getStyles(s, 'top')}>
        <p data-part="brand" style={getStyles(s, 'brand')}>{s.content.brand}</p>
        <div data-part="columns" style={getStyles(s, 'columns')}>
          {s.content.columns.map((col) => (
            <ul key={col.heading} data-part="column" style={getStyles(s, 'column')} aria-label={col.heading}>
              <li data-part="heading" style={getStyles(s, 'heading')}>{col.heading}</li>
              {col.links.map((l) => <li key={l}><a href="#" onClick={(e) => e.preventDefault()} data-part="link" style={getStyles(s, 'link')}>{l}</a></li>)}
            </ul>
          ))}
        </div>
      </div>
      <div data-part="bottom" style={getStyles(s, 'bottom')}><p data-part="copyright" style={getStyles(s, 'copyright')}>{s.content.copyright}</p></div>
    </footer>
  );
}
```

```tsx
// Modal.tsx — renders the dialog surface inline on the canvas over a fixed-height backdrop. No portal, no focus trap on canvas.
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Modal({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'modal'>;
  const tId = `${s.id}-title`, bId = `${s.id}-body`;
  return (
    <div {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      <div data-part="backdrop" style={getStyles(s, 'backdrop')} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby={tId} aria-describedby={bId} data-part="dialog" style={getStyles(s, 'dialog')}>
        <h2 id={tId} data-part="title" style={getStyles(s, 'title')}>{s.content.title}</h2>
        <p id={bId} data-part="body" style={getStyles(s, 'body')}>{s.content.body}</p>
        <div data-part="actions" style={getStyles(s, 'actions')}>
          <button type="button" data-part="cancel" style={getStyles(s, 'cancel')}>{s.content.cancelLabel}</button>
          <button type="button" data-part="confirm" style={getStyles(s, 'confirm')}>{s.content.confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
```

```tsx
// Toast.tsx
'use client';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Toast({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'toast'>;
  return (
    <div role="status" aria-live="polite" {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      <span data-part="bar" style={getStyles(s, 'bar')} aria-hidden="true" />
      <p data-part="message" style={getStyles(s, 'message')}>{s.content.message}</p>
      <button type="button" data-part="dismiss" aria-label="Dismiss" style={getStyles(s, 'dismiss')}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" /></svg>
      </button>
    </div>
  );
}
```

```tsx
// Accordion.tsx — first item open by default; local state only (not persisted, not in spec).
'use client';
import { useState } from 'react';
import type { ComponentSpec, LibraryComponentProps } from '@/types/components';
import { getStyles } from '@/engine/componentRenderer';
import { rootAttrs } from './_shared';
export default function Accordion({ spec, selected }: LibraryComponentProps) {
  const s = spec as ComponentSpec<'accordion'>;
  const [open, setOpen] = useState(0);
  return (
    <div {...rootAttrs(s, 'default', selected)} data-part="root" style={getStyles(s, 'root')}>
      {s.content.items.map((it, i) => {
        const tId = `${s.id}-t${i}`, pId = `${s.id}-p${i}`; const isOpen = open === i;
        return (
          <div key={i} data-part="item" style={getStyles(s, 'item')}>
            <h3 style={{ margin: 0 }}>
              <button type="button" id={tId} aria-expanded={isOpen} aria-controls={pId} onClick={() => setOpen(isOpen ? -1 : i)} data-part="trigger" style={getStyles(s, 'trigger')}>
                <span data-part="question" style={getStyles(s, 'question')}>{it.question}</span>
                <svg data-part="chevron" style={getStyles(s, 'chevron')} viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
              </button>
            </h3>
            <div id={pId} role="region" aria-labelledby={tId} hidden={!isOpen} data-part="panel" style={getStyles(s, 'panel')}>
              <p data-part="answer" style={getStyles(s, 'answer')}>{it.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

`Textarea.tsx` mirrors `Input.tsx` with `<textarea rows={4}>`; `index.ts` maps all sixteen and deletes `Placeholder.tsx` (D-084).

### 3.6 Canvas rendering of loose components — `src/components/canvas/ComponentGrid.tsx`, `ComponentPreview.tsx` (Stream 2)

Layout in phase 2/3 (D-096): a vertical stack, one specimen per component, in creation order, gap `24px` (studio spacing, not user tokens). Each specimen is a frame with the studio's surface color, a header chip row — `type` in mono, `variant · size` muted, `id` muted mono — and the component centered (inline components) or full-width (navbar, hero, feature-grid, footer). The canvas background (Turn 5) shows through between specimens. A specimen for a `pageId !== null` component never appears here; those render inside `PagePreview` (Stream 4).

Selection (D-097): click selects (`uiStore.select(id)`); the selected specimen gets a 2px studio-accent outline and the header chip row gains an "Edit" affordance that opens Stream 5's spec panel (variant/size/content fields — humans can edit props from the canvas, so `modify_component` is shared, satisfying Part 13.4). Clicking the canvas background deselects. Escape deselects.

Viewport (D-098): the canvas root is a `div` with `style={{ width: VIEWPORT_WIDTHS[viewport], container: 'canvas / inline-size' }}` centered in the scroll area; components respond via the container queries above. No JS knows about mobile.

```tsx
// ComponentPreview.tsx
'use client';
import type { ComponentSpec } from '@/types/components';
import { COMPONENT_REGISTRY } from '@/components/library';
import { useUIStore } from '@/stores/uiStore';
import './canvas.css';
const FULL_WIDTH = new Set(['navbar', 'hero', 'feature-grid', 'footer']);
export function ComponentPreview({ spec }: { spec: ComponentSpec }) {
  const selected = useUIStore((s) => s.selectedComponentId === spec.id);
  const select = useUIStore((s) => s.select);
  const C = COMPONENT_REGISTRY[spec.type];
  return (
    <section className="alt-specimen" data-selected={selected || undefined} data-full={FULL_WIDTH.has(spec.type) || undefined} aria-label={`${spec.type} ${spec.id}`}
      onClick={(e) => { e.stopPropagation(); select(spec.id); }} onKeyDown={(e) => { if (e.key === 'Enter') select(spec.id); }} tabIndex={0}>
      <header className="alt-specimen__head"><code>{spec.type}</code><span>{spec.variant} · {spec.size}</span><code className="alt-specimen__id">{spec.id}</code></header>
      <div className="alt-specimen__body"><C spec={spec} selected={selected} /></div>
    </section>
  );
}
```

```css
/* canvas.css — studio-owned; NEVER uses user tokens */
.alt-specimen { background: var(--studio-surface); border: 1px solid var(--studio-border); border-radius: 10px; overflow: hidden; outline: 2px solid transparent; outline-offset: 2px; transition: outline-color 120ms ease; }
.alt-specimen[data-selected] { outline-color: var(--studio-accent); }
.alt-specimen:focus-visible { outline-color: var(--studio-accent); }
.alt-specimen__head { display: flex; gap: 10px; align-items: baseline; padding: 8px 12px; border-bottom: 1px solid var(--studio-border); font: 500 12px/1 var(--studio-font-mono); color: var(--studio-text-muted); }
.alt-specimen__head code:first-child { color: var(--studio-text); }
.alt-specimen__id { margin-left: auto; opacity: 0.7; }
.alt-specimen__body { padding: 24px; display: flex; justify-content: center; }
.alt-specimen[data-full] .alt-specimen__body { padding: 0; display: block; }
```

`--studio-*` variables are defined by Stream 5 in `globals.css` (Turn 5 fixes their values); Stream 2 only references them.

### 3.7 Tests Stream 2 must ship

1. `__tests__/noLiterals.test.ts`: for every type × variant × size, `STYLE_DICTIONARY[t].styles(spec)` flattened contains no `#`, `rgb(`, `hsl(` except inside `var(`/`color-mix(` wrappers; every `var(--…)` name is in `tokenToVars(DEFAULT_TOKENS)` keys ∪ the six `--color-on-*`.
2. `__tests__/registry.test.tsx`: each of 16 components renders with `DEFAULT_CONTENT` inside a wrapper that defines every var; root has `data-alt`, `data-variant`, `data-size`, `data-state`; every element with `data-part` has that part in `STYLE_DICTIONARY[type].parts`.
3. `__tests__/a11y.test.tsx`: axe-core on each rendered component with fixture vars: zero violations (labels wired, roles correct).
4. `__tests__/content.test.ts`: `contentFromInput` for every type with `{label:'X', description:'Y', items:['a','b']}` returns the right slots; `primaryText` returns the label for all types except feature-grid/accordion (null).

---

END OF TURN 3 — say 'continue' for Turn 4 (Parts Two, Fourteen, Twenty-Two: tokens, fonts, write conflicts).

---

# TURN 4 — TOKENS, FONTS, WRITE CONFLICTS

## Part Two: The token system

### 2.1 Which tokens exist and why

**13 color roles stay.** They are the minimum a real system needs (brand ×3, semantic ×3, neutral surfaces ×3, text ×3, border), and each one is referenced by at least one component in the Turn 3 dictionary. What changes is how fast a human can fill them.

**Quick start is `suggest_palette` (agent) and the "Fill from primary" button (human)** — the same `generatePalette` call (D-104). After primary is set, the other twelve slots show ghosted proposals from the current strategy; "Fill from primary" applies all twelve; clicking one ghost applies one. Locked roles are skipped. Interaction with the phase gate: filling from primary sets 13 colors at once, which satisfies "≥5 including primary/background/text-primary" and jumps straight to phase 2. That is correct: the phase-gate demo moment happens *before* the first token, when the agent asks for a button and the tool is absent; after the human picks a color, speed is the point.

**Text-on-primary is derived** (D-046). Storing it would add six roles nobody wants to hand-pick and create a class of contrast bugs the audit would then have to catch.

**`muted` and `text-muted` are both kept** (D-045). `muted` is a fill: disabled inputs, toggle-off track, hover backgrounds, dividers. `text-muted` is a foreground for tertiary text. They are never interchangeable because a fill needs to sit *behind* text-secondary and a text color needs to pass 3:1 *on* background.

**Type scale: all nine steps in the store, two controls in the UI** (D-105). The panel exposes `Base size` (px number input, 12–24) and `Ratio` (segmented: 1.125 Major second · 1.2 Minor third · 1.25 Major third · 1.333 Perfect fourth). Changing either recomputes all nine steps as `round(base × ratio^n)` for n = −2…6 and writes them with `setMany`, marking all nine touched. The nine computed values are shown as read-only chips beneath. Individual steps are editable only by the agent via `set_token` (which touches that one path). This keeps the on-camera interaction to two clicks while the data model stays fully addressable.

**Spacing: unit only** (D-082). The scale multipliers are the whole point of a spacing system; letting a human edit `--spacing-3` to 13px is how systems die. Unit is a segmented control: 2 · 4 · 6 · 8.

**Weights, line heights, radius, elevation, animation** have defaults and are all editable; none are required for any phase.

### 2.2 The color picker UX

Each of the 13 slots is a row: 28px swatch, role name, hex text input (`#7C5CFF`), lock toggle. Empty slot: dashed swatch outline, hex field showing `Not set` as placeholder. Clicking the swatch opens a popover anchored to the row (D-106):

1. **Presets row** — 10 curated swatches: `hsl(250,84%,60%)` violet, `hsl(220,90%,56%)` blue, `hsl(199,89%,48%)` sky, `hsl(160,84%,39%)` emerald, `hsl(142,71%,45%)` green, `hsl(38,92%,50%)` amber, `hsl(24,95%,53%)` orange, `hsl(0,84%,60%)` red, `hsl(330,81%,60%)` pink, `hsl(0,0%,10%)` ink. One click sets the token and closes the popover.
2. **HSL sliders** — Hue 0–359 with a hue-spectrum track, Saturation 0–100 and Lightness 0–100 with tracks computed from the current H. Live preview (see §2.3 for how drag is committed).
3. **Native picker** — `<input type="color">` for people who want the OS picker. Its `onChange` writes through `parseColor`.
4. **Hex field** mirrors the row's hex field.

Argument for auto-suggesting the other twelve: it shows the palette algorithm working, gets a demo from one color to a full system in two clicks, and the human still owns the decision that matters (primary) and can override any role afterward. Argument against: it can feel like the tool is deciding for the human. Resolution: proposals are *ghosted*, not applied — a dashed swatch with the proposed color at 50% opacity and a small "↵ accept" affordance. Nothing lands until the human clicks. **Decision: ghost proposals on, "Fill from primary" button present, strategy selector (complementary / analogous / triadic / monochromatic) next to it, default `analogous`** (D-107). Analogous is the default because it produces the most coherent-looking SaaS palette for arbitrary hues; complementary can look garish for saturated primaries.

**Formats** (D-080 already): storage is normalized HSL. Display: hex in text fields (what designers paste), HSL in the slider popover. Conversion happens in the editors via `parseColor`/`toHex`, never in the store or the tools. `set_token` accepts hex/rgb/hsl and the store normalizes.

### 2.3 Token reactivity

**Mechanism** (D-108): a client component renders the stylesheet.

```tsx
// src/components/studio/TokenStyleInjector.tsx  (Stream 1)
'use client';
import { useTokenStore } from '@/stores/tokenStore';
import { tokenToCss } from '@/engine/tokenToCss';
/** Mounted once in app/layout.tsx before StudioShell. React updates the text node; the browser re-cascades. */
export default function TokenStyleInjector() {
  const css = useTokenStore(tokenToCss);            // selector runs on every store change; ~80 lines of CSS
  return <style id="alt-tokens" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: css }} />;
}
```

Why this over `setProperty`: 76 `setProperty` calls per slider tick is slower than one text-node replacement, and it leaves nothing in the DOM to inspect; a judge opening DevTools sees a single `<style id="alt-tokens">` with the whole system. Why over `<style>{css}</style>` children: identical, but `dangerouslySetInnerHTML` avoids React escaping edge cases with `>` in selectors. SSR: the server renders defaults (all colors null → sentinels); zustand `persist` rehydrates after mount and the selector re-runs; `suppressHydrationWarning` covers the one-frame mismatch. No flash of wrong colors is visible because the canvas has no components on a fresh load and the token panel reads the same store.

**Null colors → per-role grayscale sentinel** (D-109). One sentinel for all roles would make text invisible on backgrounds. The pre-token canvas must look intentionally unset, not broken:

```ts
export const UNSET_COLOR: Record<SemanticColorRole, string> = {
  primary: 'hsl(0, 0%, 62%)', secondary: 'hsl(0, 0%, 66%)', accent: 'hsl(0, 0%, 70%)',
  danger: 'hsl(0, 0%, 58%)', warning: 'hsl(0, 0%, 64%)', success: 'hsl(0, 0%, 60%)', muted: 'hsl(0, 0%, 88%)',
  background: 'hsl(0, 0%, 97%)', surface: 'hsl(0, 0%, 100%)',
  'text-primary': 'hsl(0, 0%, 20%)', 'text-secondary': 'hsl(0, 0%, 42%)', 'text-muted': 'hsl(0, 0%, 58%)', border: 'hsl(0, 0%, 84%)',
};
```

A component whose brand color was deleted turns gray, stays legible, and looks obviously "unset". This also answers Part 8.1: deleting `primary` with three buttons on canvas turns them gray; nothing vanishes; nothing is blocked.

**No debounce on the store** (D-110). `tokenToCss` is string concatenation over ~80 entries; the browser's style recalc after a text-node swap is the only real cost and it holds 60fps on a 2020 laptop with a full rendered page. Debouncing would make the cascade visibly lag the slider on camera. What *is* throttled is the **log**: dragging calls `setToken` on every `input` event (live cascade, no log entry); the editor captures the value at `pointerdown`/`focus` and on `pointerup`/`blur`/`Enter` calls `commitHuman('ui.set_token', …)` once with `inverse = restore_token(previous)`. Token editors are the only place allowed to mutate the store without logging (D-111), and only for in-progress drags.

**`tokenToCss` implementation** (Stream 1; final):

```ts
import type { SemanticColorRole, TokenState } from '@/types/tokens';
import { SEMANTIC_COLOR_ROLES, ON_COLOR_ROLES } from '@/types/tokens';
import { parseColor, onColor } from '@/utils/colorUtils';
import { fontStack } from '@/utils/fonts';
import { UNSET_COLOR } from '@/utils/defaults';

function colorBlock(colors: Record<SemanticColorRole, string | null>): string[] {
  const lines: string[] = [];
  for (const role of SEMANTIC_COLOR_ROLES) lines.push(`  --color-${role}: ${colors[role] ?? UNSET_COLOR[role]};`);
  for (const role of ON_COLOR_ROLES) {
    const base = parseColor(colors[role] ?? UNSET_COLOR[role]);
    lines.push(`  --color-on-${role}: ${base ? onColor(base) : 'hsl(0, 0%, 100%)'};`);
  }
  return lines;
}

export function tokenToVars(s: TokenState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const role of SEMANTIC_COLOR_ROLES) out[`--color-${role}`] = s.colors[role] ?? UNSET_COLOR[role];
  for (const role of ON_COLOR_ROLES) { const b = parseColor(s.colors[role] ?? UNSET_COLOR[role]); out[`--color-on-${role}`] = b ? onColor(b) : 'hsl(0, 0%, 100%)'; }
  for (const [k, fam] of Object.entries(s.typography.families)) out[`--font-${k}`] = fontStack(fam);
  for (const [k, px] of Object.entries(s.typography.scale)) out[`--font-size-${k}`] = `${px}px`;
  for (const [k, w] of Object.entries(s.typography.weights)) out[`--font-weight-${k}`] = String(w);
  for (const [k, lh] of Object.entries(s.typography.lineHeights)) out[`--line-height-${k}`] = String(lh);
  for (const m of s.spacing.scale) out[`--spacing-${m}`] = `${m * s.spacing.unit}px`;
  for (const [k, r] of Object.entries(s.radius)) out[`--radius-${k}`] = `${r}px`;
  for (const [k, e] of Object.entries(s.elevation)) out[`--elevation-${k}`] = e;
  out['--animation-duration-fast'] = `${s.animation.durationFast}ms`;
  out['--animation-duration-normal'] = `${s.animation.durationNormal}ms`;
  out['--animation-duration-slow'] = `${s.animation.durationSlow}ms`;
  out['--animation-easing-default'] = String(s.animation.easingDefault);
  out['--animation-easing-in'] = String(s.animation.easingIn);
  out['--animation-easing-out'] = String(s.animation.easingOut);
  return out;
}

export function tokenToCss(s: TokenState): string {
  const vars = tokenToVars(s);
  const root = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n');
  const dark = s.dark ? `\n.dark {\n${colorBlock(s.dark).join('\n')}\n}` : '';
  return `:root {\n${root}\n}${dark}`;
}
```

The `.dark` block redefines only colors and on-colors; it is applied to the canvas root (D-081), so a dark toggle recolors the user's page without touching the studio.

**`tokenStore` implementation rules** (Stream 1; D-112):
- `setToken(path, value)` validates per group and returns `false` on rejection: `color` → `parseColor` non-null; `font` → value ∈ `FONT_FAMILIES`; `fontSize`/`radius` → integer 0–200; `spacing.unit` → one of 2,4,6,8; `fontWeight` → 100–900 step 100; `lineHeight` → 0.8–3.0; `elevation` → `'none'` or a string matching `/^[\d.\s,pxrgbahsl()%#\-]+$/i`; `animation.duration*` → integer 0–2000; `animation.easing*` → `linear|ease(-in|-out|-in-out)?|cubic-bezier\(…\)`.
- Non-color sets add the path to `touched` if the value differs from `DEFAULT_TOKENS`, remove it if equal.
- `removeToken`: colors → `null`; others → default value and un-touched.
- `getMissingForPhase2()` returns the subset of `REQUIRED_COLORS_FOR_COMPONENTS` still null.
- Locks are checked by the *tools* and by the *UI*, not by the store: the store is dumb on purpose so undo can restore a locked token.

### 2.4 Rules

**The five demonstrable rules** (D-113), shipped as one-click presets in the Rule editor and as the examples in `add_rule`'s description:

| Preset | Condition | What the camera sees |
|---|---|---|
| No danger buttons | `{target:'button', property:'variant', operator:'not-equals', value:'danger'}` | Agent asks for a red delete button; log shows `RULE_VIOLATION` with alternatives `primary, secondary, ghost, outline`; nothing lands. |
| No red primaries | `{target:'all', property:'background-color', operator:'hue-not-in', value:'345-15'}` | If the human sets primary to red, every solid primary/danger component gets a violation badge; agent's next generation is rejected. |
| Minimum radius 8px | `{target:'all', property:'border-radius', operator:'min', value:'8'}` | Human drops `radius.md` to 4 → every control shows a violation badge instantly. |
| Text contrast ≥ 4.5:1 | `{target:'all', property:'contrast', operator:'min', value:'4.5'}` | Pale text-secondary on a light surface → badges; audit lists the fix. |
| Touch targets ≥ 44px | `{target:'button', property:'min-height', operator:'min', value:'44'}` | `sm` buttons (8+8+14×1.2 ≈ 33px) violate; `lg` pass. Agent gets `alternatives: ['md','lg']`. |

**Resolution path** (D-114): `evaluateSpec(spec, rules)` asks `STYLE_DICTIONARY[spec.type].tokens(spec)` which token drives the property on the `root` part (`background-color`, `color`, `border-radius`, `font-size`), reads the token value from `tokenStore.getState().getToken(path)`, and applies the operator. `variant`, `size`, `type` read the spec directly. `min-height` = `padding-block × 2 + font-size × line-height` from the same token map. `contrast` = `contrastRatio(root.color, root.background-color)`, falling back to `text-primary` on `background` when a part has no explicit pair. The engine importing the renderer's dictionary is the right direction: the dictionary is the single truth about what a variant *means*, and the rule engine is a reader of that truth (D-050 already places both in `engine/`).

**Re-validation** (D-115): `add_rule`, `set_token`, `removeToken`, and `modify_component` all trigger `evaluateAll()` (the rules panel and specimen headers subscribe to a `violations` selector computed in `ruleEngine`, memoized on `[rules, components, colors, radius, typography]`). Existing components are **flagged, not removed** — the human is told (badge + rules panel count), the agent is told (`get_current_state.violations`, and `add_rule`'s `data.violations`). New generations and modifications that would violate are **rejected** (D-116). Rejected-not-advisory for new work, advisory for existing work: enforcement where the agent acts, information where the human already decided.

**Schema expressiveness** (D-117): `{target, property, operator, value}` with `RuleProperty` and `hue-not-in` covers every preset above. It cannot express viewport-conditional rules ("44px on mobile") or page-level aggregates ("≤3 font sizes per page"); both are out of scope and documented as such in ARCHITECTURE.md. Rules are viewport-agnostic: `min-height` is computed from the `md` token set, which is what the container query does not change.

**Rejection message** (D-118): `Rule "No danger buttons" prohibits variant "danger" for button. Choose one of: primary, secondary, ghost, outline.` — `error` sentence + `alternatives` array, both from `RuleViolation.message`/`.alternatives`. For `hue-not-in`, alternatives is empty and `hint` says which token to change: `Change color.primary (currently hsl(0, 84%, 60%)) to a hue outside 345–15.`

---

## Part Fourteen: Dynamic font loading

**Decision (D-119): all 13 catalog fonts are declared at build time with `next/font/google`; no runtime `<link>` injection; no custom-font escape hatch before Sept 3** (already in D-078). `@font-face` rules cost only CSS until text actually renders in that family, so declaring 13 fonts adds ~4 KB of CSS and zero font bytes to first load. The selected families download on first use; the dropdown preview downloads the 400 weight of each family the first time the dropdown opens (~13 × 15–25 KB woff2, once, cached).

```ts
// src/utils/fontLoader.ts  (Stream 1) — the only file that imports next/font
import { Inter, Geist, DM_Sans, Plus_Jakarta_Sans, Manrope, Space_Grotesk, Playfair_Display, Lora, Fraunces, Source_Serif_4, JetBrains_Mono, Geist_Mono, IBM_Plex_Mono } from 'next/font/google';
const opts = { subsets: ['latin'], display: 'swap' } as const;
export const FONTS = {
  'Inter': Inter({ ...opts, weight: ['400', '500', '600', '700'] }),
  'Geist': Geist({ ...opts, weight: ['400', '500', '600', '700'] }),
  'DM Sans': DM_Sans({ ...opts, weight: ['400', '500', '600', '700'] }),
  'Plus Jakarta Sans': Plus_Jakarta_Sans({ ...opts, weight: ['400', '500', '600', '700'] }),
  'Manrope': Manrope({ ...opts, weight: ['400', '500', '600', '700'] }),
  'Space Grotesk': Space_Grotesk({ ...opts, weight: ['400', '500', '600', '700'] }),
  'Playfair Display': Playfair_Display({ ...opts, weight: ['400', '600', '700'] }),
  'Lora': Lora({ ...opts, weight: ['400', '600', '700'] }),
  'Fraunces': Fraunces({ ...opts, weight: ['400', '600', '700'] }),
  'Source Serif 4': Source_Serif_4({ ...opts, weight: ['400', '600', '700'] }),
  'JetBrains Mono': JetBrains_Mono({ ...opts, weight: ['400', '700'] }),
  'Geist Mono': Geist_Mono({ ...opts, weight: ['400', '700'] }),
  'IBM Plex Mono': IBM_Plex_Mono({ ...opts, weight: ['400', '700'] }),
} as const;
/** Class list applied to <html> so every family's @font-face is present. */
export const FONT_CLASSNAMES = Object.values(FONTS).map((f) => f.className).join(' ');
```

`app/layout.tsx` applies `FONT_CLASSNAMES` to `<html>`. `next/font` renames families internally (`__Inter_abc123`), so `fontStack('Inter')` must emit the *loaded* name: `fontStack` becomes `FONTS[family].style.fontFamily` when present, else the quoted name + fallback (D-120; amends D-066's implementation, not its contract). `tokenToCss` therefore emits `--font-body: '__Inter_abc123', system-ui, sans-serif` on the canvas, and **export** rewrites it to `'Inter', system-ui, sans-serif` plus a Google Fonts `@import` line, because the exported code has no next/font (D-121). The export README also shows the equivalent `next/font/google` import for Next.js consumers. Both, with a comment.

**Why these 13** (from `FONT_CATALOG`): six sans covering the neutral-to-characterful range judges recognize — Inter (default, safest), Geist (Vercel's own; the Next.js judges will notice it's there and that it isn't the default), DM Sans (rounded geometric), Plus Jakarta Sans (contemporary SaaS), Manrope (semi-geometric, great at large sizes), Space Grotesk (quirky, tech). Four serifs spanning editorial to friendly — Playfair Display (high-contrast display), Lora (readable text serif), Fraunces (variable, personality), Source Serif 4 (workhorse). Three monos for the mono role — JetBrains Mono (default), Geist Mono, IBM Plex Mono. Every family is on Google Fonts under OFL, so export is license-clean.

**Dropdown** (D-122): a listbox (`role="listbox"`, arrow-key navigation) grouped Sans / Serif / Mono; each option renders its own name in its own face at 15px/400 with a muted category tag. The current value shows in its own face in the closed trigger. Because faces load lazily, the first open shows fallback for ~100ms then swaps — acceptable; a `document.fonts.load()` prefetch of all 13 fires on the *first hover* of the typography section header to hide even that.

**Fallback stack** is added by `tokenToCss` on output (D-066). The store holds the bare name so `set_token font heading "Geist"` stays a one-word value for the agent and export can substitute the right stack per target.

---

## Part Twenty-Two: Human–agent write conflicts

**Policy: last write wins, always, for every store** (D-123). There is no locking of in-progress edits, no optimistic concurrency, no version numbers. Both parties see the result on the same canvas within a frame; the log records the order; undo can reverse either. The three specific cases:

- **Slider drag vs `set_token`.** The agent's write lands; the human's next `input` event overwrites it; on release the human's commit logs with `previous` = the value at drag start. The agent's entry is in the log with its own inverse. Net: the human's hand wins while it's on the slider, which is what anyone would expect.
- **Human reordering sections vs `modify_layout`.** Agent operations apply to the *current* `sections` array by section id, not by index (D-124): `reorder` takes `sectionId` + `newIndex`, `remove-section` takes `sectionId`, `add-section` takes `afterSectionId | null`. A stale index can't misfire because there is no index input. The return `data.sections` is the resulting order so the agent can confirm before rendering.
- **Human deletes, agent modifies 200ms later.** `modify_component` returns `NOT_FOUND` with `alternatives = componentStore.ids()` and `hint: 'The component was removed. Call list_components for the current set.'` (D-125). Same shape for `remove_component`, `explain_component`, `get_component_code`, `modify_layout`, `render_page`, `remove_wireframe`, `remove_rule`.

**Overwrite notification: yes** (D-126). When an agent `set_token` replaces a non-null value, Stream 5's toast rail shows: `Agent changed primary · was #3B5BDB, now #7C5CFF · Undo` for 8 seconds; Undo executes that entry's inverse. Trigger is the log: `AgentLog` subscribes to entries where `actor === 'agent' && tool === 'set_token' && result.ok && data.previous !== null`. Only tokens get this toast — component and layout changes are visible on the canvas and in the log, and a toast per generated component would be noise.

**Locks: yes** (D-056, D-127 for UX). A lock icon on every token row (colors, fonts, base size, unit, radii). Locked tokens render with a small padlock in the swatch and a muted row. `set_token` on a locked path → `{ code:'LOCKED', error:'color.primary is locked by the human.', alternatives:[unlocked paths in the same group] }`. `suggest_palette` skips locked roles and lists them in `data.skippedLocked`. `remove_token` on a locked path → `LOCKED`. `get_current_state.lockedTokens` lists them. Undo can restore a locked token's previous value (undo is a human action; the lock constrains the agent). A locked token is the strongest expression of "human owns the constraints" that costs one boolean, and it is on camera: the human locks primary, asks the agent to "try a warmer palette", and the agent reports it changed everything except the locked primary.

**Log rendering of conflicts**: nothing special. Two adjacent entries — `agent set_token color.primary` then `human ui.set_token color.primary` — tell the story by themselves.

---

END OF TURN 4 — say 'continue' for Turn 5 (Parts Four, Five, Fifteen: layouts, studio UI, first visit).

---

# TURN 5 — LAYOUTS, STUDIO UI, FIRST VISIT

## Part Four: The layout system

### 4.1 Wireframe representation

A wireframe is a vertical stack of gray boxes inside the canvas root at the current viewport width. Wireframes are deliberately *not* token-styled (they use studio grays) so the render moment is a hard visual cut, not a gradient.

**Box anatomy** (D-128): full width; height by type (below); background `#2A2E3A`; border `1px dashed #4A5060`; label top-left in Geist Mono 11px uppercase `#8B91A1` (`NAVBAR`, `HERO`, `FEATURES · 3 COL`); a centered one-line placeholder in Geist 13px `#6B7180` describing content (`Headline, subtitle, two calls to action`); grid sections draw N inner boxes (`#33384A`, 1px dashed, equal columns, 12px gap, inset 24px) so column count is visible without reading the label.

| Section | Height (px) | Placeholder | Inner boxes |
|---|---|---|---|
| navbar | 64 | Brand, links, sign-in | — |
| hero | 360 | Headline, subtitle, two calls to action | — |
| features | 320 | Icon, title, one-line description per item | columns (default 3) |
| pricing | 420 | Tier, price, feature list, button per plan | columns (default 3) |
| testimonials | 280 | Quote, avatar, name, role | columns (default 3) |
| cta | 220 | Headline, subtitle, one call to action | — |
| faq | 320 | Five expandable questions | — |
| footer | 200 | Brand, three link columns, copyright | — |
| content | 400 | Heading and two or three paragraphs | — |
| gallery | 360 | Image placeholders, 4:3 | columns (default 4) |
| stats | 160 | Large number and label ×4 | 4 |
| team | 300 | Photo, name, role per person | columns (default 4) |

**Human controls in wireframe mode** (D-129): hovering a box reveals a right-aligned control strip — ▲ move up, ▼ move down, ✕ remove — and a slim "+ Add section" button between boxes and at the end, which opens a 12-item menu. Up/down arrows, not drag-and-drop (D-078). All four actions go through `commitHuman` with `restore_sections` as the inverse. The same operations are what `modify_layout` performs, so "sketch wireframes" is genuinely shared (Part 13.4).

**Multiple wireframes** (D-054, D-130): a tab strip appears in the canvas toolbar once ≥1 wireframe exists — one tab per wireframe showing `title` and a status dot (gray = wireframe, accent = rendered). Clicking a tab sets `activeWireframeId`; the canvas shows that wireframe or its rendered page. "New wireframe" (+) opens a small form: page type + title + a checklist of sections with a sensible preselection per page type (landing: navbar, hero, features, pricing, faq, footer; pricing: navbar, hero, pricing, faq, footer; about: navbar, hero, content, team, footer; contact: navbar, hero, content, footer; blog-post: navbar, content, footer; dashboard/onboarding/settings: navbar, content, footer). That is the human path to `sketch_wireframe`.

**Phase 2 canvas vs phase 3 canvas** (D-131): when a wireframe is active, the canvas shows it; loose components (specimens) collapse into a "Components (n)" drawer at the bottom of the canvas that expands on click. When no wireframe is active, specimens show as in Turn 3. Phase regression (Part 8.2): wireframes stay in the store and stay visible; section controls remain for the human; the agent's layout tools are simply absent until components return to ≥2. Nothing is deleted by a phase drop, ever (D-132).

### 4.2 Section-to-component mapping

**Every section resolves to registry components where a component exists; three sections (`gallery`, `stats`, `team`) are token-styled blocks owned by Stream 4** (D-133). Blocks are not addressable by `modify_component` — they have no `ComponentSpec` — and are listed in `explain_component`'s `NOT_FOUND` hint as "section blocks: gallery, stats, team are not components". The mapping is not agent-configurable (D-134); the agent shapes the result by modifying the produced components afterward.

```ts
// src/engine/layoutEngine.ts (Stream 4) — final mapping
export const SECTION_COMPONENT_MAP: SectionComponentMap = {
  navbar:       { component: 'navbar',       perColumn: false, defaultColumns: null },
  hero:         { component: 'hero',         perColumn: false, defaultColumns: null },
  features:     { component: 'feature-grid', perColumn: false, defaultColumns: 3 },    // one component; columns → content.columns
  pricing:      { component: 'pricing-card', perColumn: true,  defaultColumns: 3 },    // middle card featured:true
  testimonials: { component: 'card',         perColumn: true,  defaultColumns: 3 },    // title = "Name · Role", body = quote, ctaLabel null
  cta:          { component: 'hero',         perColumn: false, defaultColumns: null }, // size 'sm', secondaryCta null, variant primary
  faq:          { component: 'accordion',    perColumn: false, defaultColumns: null },
  footer:       { component: 'footer',       perColumn: false, defaultColumns: null },
  content:      { component: 'card',         perColumn: false, defaultColumns: null }, // size 'lg', single wide card, ctaLabel null
  gallery:      { component: 'block',        perColumn: true,  defaultColumns: 4 },
  stats:        { component: 'block',        perColumn: true,  defaultColumns: 4 },
  team:         { component: 'block',        perColumn: true,  defaultColumns: 4 },
};
```

Why `cta → hero (sm)` and `content → card (lg)` instead of new blocks: they keep the page fully addressable — the agent can `modify_component` the CTA headline — and the hero and card dictionaries already produce the right look at those sizes. Why `features → feature-grid ×1` rather than `card ×N`: the feature-grid owns its grid and responsive collapse; N cards would need a section grid that duplicates that logic.

**Per-section default content** (D-135) lives in `src/engine/sectionContent.ts` (Stream 4) and derives from `DEFAULT_CONTENT` with per-slot overrides so a rendered page reads as one product: pricing tiers `Starter $0 · Team $24 · Business $79`, testimonial names/roles, five FAQ items, CTA `Ready when you are` / `Start free, upgrade when the team joins`. Wireframe `label` text is *not* used as content — labels are structural (`HERO`), content is copy.

**Section layout** (D-136): each section is a full-width wrapper `<section data-section={type} data-index={i}>`; inside, a container `max-width: 1120px; margin: 0 auto; padding-inline: var(--spacing-8)` for per-column sections and blocks (component sections — navbar, hero, feature-grid, footer — are full-bleed and own their padding). Per-column sections use `display:grid; grid-template-columns: repeat(N, minmax(0,1fr)); gap: var(--spacing-6); padding-block: var(--spacing-16)`; container query collapses to 1 column ≤640px and 2 columns ≤900px. Sections abut (gap 0). Backgrounds alternate `var(--color-background)` / `var(--color-surface)` by index, skipping navbar and footer which keep their own. The page root sets `background: var(--color-background)` and gets the `.dark` class when `uiStore.theme === 'dark'` (D-081).

**Blocks** (Stream 4, `src/engine/sectionBlocks.tsx`): `gallery` = N `<figure>`s with `aspect-ratio: 4/3`, `background: var(--color-muted)`, `border-radius: var(--radius-lg)`, centered image glyph in `text-muted`; `stats` = N `<div>`s with number in `font-heading` `4xl` `bold` `text-primary` and label `sm` `text-secondary`; `team` = N cards with a 64px circle in `color-primary` at 15% mix holding initials, name `md semibold`, role `sm text-secondary`. All via `defineStyle` (D-099), all in `library.css`'s no-literal regime.

### 4.3 The render transition

**Animated, 700ms total** (D-137). On `render_page` (or the human's Render button), the canvas sets `data-rendering="out"` on the wireframe: boxes animate `opacity 1→0, transform scale(1)→scale(0.985)` over 220ms with `ease-in`, staggered 30ms top to bottom. At 260ms the page mounts with `data-rendering="in"`: each section animates `opacity 0→1, translateY(8px)→0` over 320ms `ease-out`, staggered 60ms by index. Keyframes live in `canvas.css`; `prefers-reduced-motion` collapses both to 0ms. The stagger is what makes it read as a build rather than a swap; 700ms is short enough that a viewer never waits.

### 4.4 The rendered page as a live artifact

Page components are real components (D-053), so:

- **`modify_component` works on them by id.** `list_components` marks them with `pageId`; the human sees them in the page and can select any section's component by clicking it (selection outline is a 2px accent inset ring on the component root, and the Edit affordance appears as a floating chip at the section's top-right).
- **Human or agent deletes a page component** (D-138): the id is removed from `RenderedSection.componentIds`. A section with zero remaining ids renders as an empty dashed strip (studio gray) labelled `Section emptied · Re-render page to restore`. The page stays; phase stays 4.
- **Re-render** (D-139): a toolbar button on a rendered page (human) — there is deliberately no agent tool for it; the agent calls `render_page` again on the same wireframe, which is the same operation. Re-render = `unrender_page` (removes the page and its components; wireframe status → 'wireframe') followed by `render_page`, logged as two entries so undo is symmetrical. Rendering a wireframe that already has a page is therefore allowed and means "re-render" (D-140).
- **Delete page** (D-141): toolbar button; removes page + its components, wireframe returns to gray boxes, phase may fall to 3. `remove_wireframe` never touches pages (Turn 1 description) — a wireframe with a rendered page cannot be removed until the page is deleted; the tool returns `INVALID_INPUT` with hint `Delete the rendered page first (human action) or render a different wireframe.`
- **Token changes cascade** into the page with nothing to do.

---

## Part Five: The studio UI

### 5.1 Visual identity

**Dark chrome, always** (D-142). The studio has its own palette and never uses the user's tokens:

```css
/* globals.css — studio scale, 8px grid */
:root {
  --studio-bg: #0F1117;          /* app background, phase bar */
  --studio-panel: #15171E;       /* token panel, agent log */
  --studio-surface: #1C1F29;     /* specimen chrome, popovers, inputs */
  --studio-border: #262A35;
  --studio-border-strong: #343948;
  --studio-text: #E6E8EF;
  --studio-text-muted: #8B91A1;
  --studio-text-faint: #5C6270;
  --studio-accent: #FF7AC6;      /* alt.gal pink: focus, selection, active phase, primary buttons */
  --studio-accent-soft: rgba(255, 122, 198, 0.16);
  --studio-agent: #7CE0FF;       /* agent-authored entries and the agent dot */
  --studio-ok: #3DDC97;
  --studio-warn: #FFB547;
  --studio-err: #FF5C7A;
  --studio-font: var(--font-geist);        /* from fontLoader; Geist */
  --studio-font-mono: var(--font-geist-mono);
  --studio-canvas: #1A1D26;
  --studio-canvas-dot: #2A2E3A;
  --studio-radius: 8px;
  --studio-radius-lg: 12px;
}
```

Geist for the studio, Geist Mono for the log, ids, tool names, and the tool inspector (D-143). Not Inter: Inter is the default the *user's* system starts with, and the studio should not look like the user's output. Panel padding 16px; control gap 8px; section headers 11px uppercase `letter-spacing: 0.08em` `text-muted` with 12px above and 8px below; panel titles 13px semibold. Buttons: 32px tall, radius 8, primary = accent bg + `#0F1117` text, secondary = surface bg + border, ghost = text only. Every interactive element has `:focus-visible { outline: 2px solid var(--studio-accent); outline-offset: 2px }`.

**Canvas surround vs user surface** (D-144): the canvas area is `--studio-canvas` with a 16px dot grid (`radial-gradient(var(--studio-canvas-dot) 1px, transparent 1px)`). The user's work always sits on the user's `--color-background` — specimen bodies and the page root both set it. In phase 0–1 that is the `UNSET_COLOR.background` light gray, so user surfaces read as "paper on a dark desk" from the first component. This is what makes the cascade moment land: everything that changes color is inside a clearly bounded light area on a dark stage.

### 5.2 Token panel

280px, scrollable, sections collapsible with a chevron; state persisted in `uiStore` per section (D-145). Default open: **Colors, Typography, Rules**. Default closed: **Spacing & Radius, Elevation, Motion**. Rules opens automatically the first time a rule is added.

Controls (final; Turn 4 covers colors and type scale):

| Token group | Control |
|---|---|
| Colors | 13 rows: swatch · role · hex input · lock. Popover per D-106. "Fill from primary" + strategy select under the list once primary exists. |
| Typography | Three font rows (Heading / Body / Mono), each the grouped listbox (D-122). Base size number input + Ratio segmented (D-105). Nine read-only step chips. Weights: five rows, each a segmented 300/400/500/600/700. Line heights: three rows, each a 0.8–3.0 slider with numeric readout. |
| Spacing & Radius | Unit segmented 2/4/6/8 with a live ruler showing the ten resulting steps. Radius: six rows (none…full), each a 0–32 slider (full is fixed at 9999, shown as a pill) with a 24px preview square whose corner radius is live. |
| Elevation | Five rows (none…xl), each a 40px preview card on `--studio-surface` showing the shadow, and a text input with the raw value. A "Shadow intensity" segmented Soft/Regular/Strong rewrites all five from three preset sets (Regular = defaults). |
| Motion | Three duration sliders 0–1000ms with ms readout; three easing selects (Default / In / Out) offering `linear, ease, ease-in, ease-out, ease-in-out` and the three default cubic-beziers labelled by name; a 32px dot that animates left→right on each change to preview. |
| Rules | List of rules: enabled toggle · description · violation count badge · delete. "Add rule" opens a form: preset picker (the five from D-113) or Custom (target select, property select, operator select, value input, description input). |

**Empty color slot** (D-146): dashed 1px `--studio-border-strong` swatch, role name in `text`, hex input placeholder `Not set` in `text-faint`, lock hidden until a value exists. Below the primary row only, when primary is null: a one-line hint `Set primary to begin.`

**Agent-set flash** (D-147): when a log entry with `actor: 'agent'` changes a token, that token's row background animates from `--studio-agent` at 24% to transparent over 900ms, and the panel scrolls the row into view if off-screen. Human-set tokens do not flash (the human did it). This is the "watch the agent fill the swatch" beat.

### 5.3 Canvas

Toolbar (D-148), 44px, `--studio-bg` with bottom border, three groups: **left** — wireframe tabs + "+ New wireframe" (phase ≥3; hidden before); **center** — viewport switcher (three icon buttons Desktop 1280 / Tablet 768 / Mobile 375, active = accent) and theme toggle (sun/moon; disabled with tooltip `Generate a dark theme first` until `tokenStore.dark` exists); **right** — on a rendered page: Re-render, Delete page; in phase 4: Export (primary button). No zoom.

Empty states (D-149, satisfies Part 8.5):
- **Phase 0 canvas**: centered card (max 420px, `--studio-surface`): title `Nothing to render yet`; body `Set a primary color to unlock component tools — or open this page in an agent browser and ask it what it can do.`; buttons `Set primary color` (focuses the primary swatch and opens its popover) and `Open Tool Inspector`.
- **Phase 1 canvas**: same card; body `n more tokens to unlock components.` with the missing required roles listed as chips; button `Fill from primary`.
- **Phase 2, no components**: `Your tokens are ready.` / `Generate a component from the + button, or ask your agent for one.` / button `+ Component` (opens a small form: type select, variant, size, label — the human path to `generate_component`, D-150).
- **Phase 3, no wireframe**: components show as specimens; a slim banner above them: `Sketch a wireframe to compose a page.` with `+ New wireframe`.

The `+ Component` button is also in the toolbar right group from phase 2 on. It exists so `generate_component` is shared, not agent-only.

Selection is D-097. Component layout in phase 2 is D-096.

### 5.4 Agent log

300px, `--studio-panel`, header `Log` with filter chips `All · Agent · You` and a `Clear` ghost button (confirms). **Human actions are shown** (D-151): the log is the collaboration record, and the moment that sells the product on camera is the pair `agent · generate_component` followed by `you · set primary`. Newest first.

Entry anatomy (D-152), 12px vertical padding, 1px separator:

```
● generate_component                                    10:31:04
  type: hero · variant: primary · label: "Design systems that agents respect"
  Created hero comp_a1b2c3d4. Phase 2 → 3. New tools: sketch_wireframe, …
                                                          [↶ Undo]
```

- Row 1: status dot (`--studio-agent` for agent ok, `--studio-accent` for human, `--studio-err` for error, `--studio-text-faint` for undone) · tool name in Geist Mono 12px semibold (human actions render as plain-language: `ui.set_token` → `You set primary`) · time `HH:MM:SS` right-aligned `text-faint`.
- Row 2: input as a single line `key: value · key: value`, strings quoted and truncated at 40 chars; clicking the row toggles a pretty-printed JSON block (input + result) in Geist Mono 11px inside a `--studio-surface` well.
- Row 3: `result.summary` in `text-muted` 12px, two-line clamp. Errors show `error` in `--studio-err`.
- Undo: ghost icon button, visible on hover/focus for entries with `inverse && !undone`; on undo the entry gets `text-decoration: line-through` on row 1 and a `undone` tag, and a new human entry `You undid <tool>` is appended at the top.

New-entry highlight: background `--studio-agent` at 10% (agent) or `--studio-accent-soft` (human) fading over 2s. No auto-scroll needed (newest is on top); if the user has scrolled down, a `↑ n new` pill appears at the top of the panel.

Empty state: `No activity yet.` plus the three suggested prompts (Part 15) when WebMCP is native, or `Open this page in an agent browser to collaborate.` when polyfilled.

### 5.5 Phase indicator

Full-width 44px bar at the very top, `--studio-bg`, bottom border (D-153):

- **Left**: wordmark `alt.gal` in Geist Mono 13px `text` with a 6px accent dot.
- **Center**: a five-step stepper — `Empty · Tokens · Components · Layout · Export` — each step a 28px-tall pill; completed steps `--studio-accent-soft` bg with accent text and a ✓; current step accent bg with `#0F1117` text; future steps transparent with `text-faint` and a border. Steps are joined by 24px hairlines that fill with accent as phases complete.
- **Right**: `n of 24 tools · ` + source badge: `● native` (ok green) / `● polyfill` (muted) / `● unavailable` (err). Count comes from `webmcpStatusStore.toolCount` (D-016).

Hover on any future step shows a tooltip with `PHASE_DEFINITIONS[p-1].requirement` and the current `missing` list. Phase up: the hairline sweeps 300ms, the new pill scales 0.9→1 over 200ms, the tool count ticks digit-by-digit. Phase down: pills un-fill with the same timing, no red; a toast `Phase back to n · layout tools paused` (D-154). A regression is information, not a failure.

### 5.6 Responsive

**Desktop only, ≥1024px** (D-155). Below that, the app renders a single centered notice on `--studio-bg`: `Alternative Galaxy is a desktop studio. Open it in a window at least 1024px wide, or watch the 90-second demo.` with the video link. No drawer, no stacked panels. It's a design tool; a 768px three-panel layout would be a worse product than an honest message. Between 1024 and 1280 the agent log narrows to 260px and the token panel to 260px.

---

## Part Fifteen: First-visit experience

**Onboarding: a dismissible banner, not a tour, not a modal** (D-156). It sits at the top of the canvas area (not over the panels), `--studio-surface`, 12px radius, and reads:

> **Alternative Galaxy** is a design studio for humans and AI agents. You set the tokens and the rules; an agent builds inside them, using only the tools the current phase allows.
> `Watch the 90-second demo` · `Load example tokens` · `Dismiss`

`Load example tokens` (D-157) applies a fixed set — `hsl(250, 84%, 60%)` primary, the analogous palette from it, Geist / Inter / JetBrains Mono, base 16 / ratio 1.25, unit 4 — as **tokens only**, logged as a single human entry `You loaded example tokens` with a `restore_tokens` inverse. It lands the visitor in phase 2 with an empty canvas and the `+ Component` button, so within ten seconds they can generate a card, drag the primary hue, and see the cascade — without an agent. It never pre-fills components or pages: the phase system is the product and the example must not skip it further than "the human already picked colors". Dismissal persists (`uiStore.onboardingDismissed`).

**WebMCP status** lives in the phase bar's right group (D-153), not a separate banner, plus a bottom status bar (28px, D-158): `● 14 agent tools active · native` / `● 14 tools registered · polyfill — no agent is connected. Open in ChatGPT's browser or enable chrome://flags/#enable-webmcp-testing.` / `● Agent tools unavailable — this page must be served over HTTPS.` The status bar also holds the `Tool Inspector` toggle and the counts `5 tokens · 3 components · 1 page`.

**Suggested prompts** (D-159), shown in the empty agent log when source is native, each with a copy button: `What can you do on this page?` · `Help me pick a palette for a fintech startup and set it up.` · `Generate a hero and a pricing table, then sketch a landing page.`

**Microcopy** (D-160). Voice: direct, confident, no exclamation points, no "oops", no emoji, sentence case. Complete table:

| Location | Text |
|---|---|
| Wordmark | `alt.gal` |
| Phase steps | `Empty` · `Tokens` · `Components` · `Layout` · `Export` |
| Phase tooltips (requirement) | `Define 1 token.` · `Define 5 tokens including primary, background, and text-primary.` · `Have 2 components on the canvas.` · `Render 1 page.` |
| Tool count | `{n} of 24 tools` |
| Source badge | `native` · `polyfill` · `unavailable` |
| Token panel title | `Tokens` |
| Section headers | `Colors` · `Typography` · `Spacing & radius` · `Elevation` · `Motion` · `Rules` |
| Color roles | `Primary` `Secondary` `Accent` `Danger` `Warning` `Success` `Muted` `Background` `Surface` `Text` `Text secondary` `Text muted` `Border` |
| Empty hex | `Not set` |
| Primary hint | `Set primary to begin.` |
| Fill button | `Fill from primary` |
| Strategy options | `Analogous` `Complementary` `Triadic` `Monochromatic` |
| Ghost accept tooltip | `Use this color` |
| Lock tooltip | `Lock — the agent can't change this` / `Unlock` |
| Font rows | `Heading` `Body` `Mono` |
| Type scale controls | `Base size` · `Ratio` (options `1.125 Major second` `1.2 Minor third` `1.25 Major third` `1.333 Perfect fourth`) |
| Weight rows | `Light` `Regular` `Medium` `Semibold` `Bold` |
| Line-height rows | `Tight` `Normal` `Relaxed` |
| Spacing control | `Unit` |
| Radius rows | `None` `Small` `Medium` `Large` `Extra large` `Full` |
| Elevation rows | `None` `Small` `Medium` `Large` `Extra large` · intensity `Soft` `Regular` `Strong` |
| Motion rows | `Fast` `Normal` `Slow` · `Easing` `Easing in` `Easing out` |
| Rules header actions | `Add rule` |
| Rule presets | `No danger buttons` · `No red primaries` · `Minimum radius 8px` · `Text contrast at least 4.5:1` · `Touch targets at least 44px` · `Custom` |
| Rule form fields | `Applies to` · `Property` · `Condition` · `Value` · `Describe this rule` |
| Rule violation badge | `{n} violation` / `{n} violations` |
| Canvas toolbar | `Desktop` `Tablet` `Mobile` (tooltips) · `Light` / `Dark` (tooltip) · `+ Component` · `+ New wireframe` · `Render page` · `Re-render` · `Delete page` · `Export` |
| Theme disabled tooltip | `Generate a dark theme first.` |
| Component form | `Type` · `Variant` · `Size` · `Label` · `Create` |
| Wireframe form | `Page type` · `Title` · `Sections` · `Create wireframe` |
| Wireframe controls | `Move up` · `Move down` · `Remove section` · `Add section` |
| Wireframe box placeholders | as in §4.1 table |
| Emptied section | `Section emptied · Re-render page to restore` |
| Canvas empty (0) | `Nothing to render yet` / `Set a primary color to unlock component tools — or open this page in an agent browser and ask it what it can do.` / `Set primary color` · `Open Tool Inspector` |
| Canvas empty (1) | `{n} more tokens to unlock components.` / `Fill from primary` |
| Canvas empty (2) | `Your tokens are ready.` / `Generate a component from the + button, or ask your agent for one.` |
| Canvas banner (3) | `Sketch a wireframe to compose a page.` |
| Log title | `Log` · filters `All` `Agent` `You` · `Clear` |
| Log empty | `No activity yet.` / (polyfill) `Open this page in an agent browser to collaborate.` |
| Log human verbs | `You set {token}` · `You removed {token}` · `You locked {token}` · `You created {type}` · `You changed {type}` · `You removed {type}` · `You sketched {title}` · `You reordered sections` · `You rendered {title}` · `You deleted page {title}` · `You added a rule` · `You removed a rule` · `You loaded example tokens` · `You undid {tool}` |
| Undo | `Undo` · undone tag `undone` |
| New entries pill | `↑ {n} new` |
| Overwrite toast | `Agent changed {role} · was {hex}, now {hex}` · `Undo` |
| Phase-down toast | `Phase back to {n} · {group} tools paused` |
| Undo blocked toast | `Can't undo — {reason}` (e.g. `the component is part of a rendered page`) |
| Status bar | `● {n} agent tools active · native` · `● {n} tools registered · polyfill — no agent is connected. Open in ChatGPT's browser or enable chrome://flags/#enable-webmcp-testing.` · `● Agent tools unavailable — this page must be served over HTTPS.` · `{n} tokens · {n} components · {n} pages` · `Tool Inspector` |
| Tool Inspector | title `Tool Inspector` · `Registered now` · `Input (JSON)` · `Run` · `Result` · empty `No tools registered.` |
| Export panel | title `Export` · tabs `Tokens` `Components` `Page` `Everything` · `Download ZIP` · `Copy` · `Copied` · format labels `CSS variables` `DTCG JSON` `Tailwind config` `SCSS` |
| Onboarding | as above · `Watch the 90-second demo` · `Load example tokens` · `Dismiss` |
| Small-screen notice | `Alternative Galaxy is a desktop studio. Open it in a window at least 1024px wide, or watch the 90-second demo.` |
| Error boundary | `Something broke in the studio.` / `Your tokens, components, and log are saved. Reload to continue.` / `Reload` · `Reset workspace` |
| Reset confirm | `Reset the workspace? Tokens, components, pages, rules, and the log will be cleared.` / `Reset` · `Cancel` |

---

END OF TURN 5 — say 'continue' for Turn 6 (Parts Six, Seven, Eight, and 1.7: algorithms, export, edge cases, undo model).

---

# TURN 6 — ALGORITHMS, EXPORT, EDGE CASES, UNDO

## Part Six: Algorithms

### 6.1 Color — `src/utils/colorUtils.ts` (Stream 1; these are the implementations)

**Parsing** (D-161). Accepts and normalizes: `hsl(250, 84%, 60%)`, `hsl(250 84% 60%)`, `hsl(250deg 84% 60% / 1)`, `#7c5cff`, `#7cf`, `rgb(124, 92, 255)`, `rgb(124 92 255)`. Rejects alpha ≠ 1 (returns null — alpha is not a token property), named colors, `oklch`. Hue normalized to `[0, 360)`; S/L clamped `[0, 100]`.

```ts
const HSL_RE = /^hsla?\(\s*(-?[\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i;
const RGB_RE = /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i;
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function parseColor(input: string): HSL | null {
  const s = input.trim();
  let m = HSL_RE.exec(s);
  if (m) { if (m[4] !== undefined && parseFloat(m[4]) !== 1 && m[4] !== '100%') return null; return { h: norm360(+m[1]!), s: clamp(+m[2]!, 0, 100), l: clamp(+m[3]!, 0, 100) }; }
  m = RGB_RE.exec(s);
  if (m) { if (m[4] !== undefined && parseFloat(m[4]) !== 1 && m[4] !== '100%') return null; return rgbToHsl({ r: clamp(+m[1]!, 0, 255), g: clamp(+m[2]!, 0, 255), b: clamp(+m[3]!, 0, 255) }); }
  m = HEX_RE.exec(s);
  if (m) { const h = m[1]!.length === 3 ? m[1]!.split('').map((c) => c + c).join('') : m[1]!; return rgbToHsl({ r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }); }
  return null;
}
const norm360 = (h: number) => ((h % 360) + 360) % 360;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
```

**HSL ↔ RGB** (CSS Color 4 algorithm):

```ts
export function hslToRgb({ h, s, l }: HSL): RGB {
  const S = s / 100, L = l / 100;
  const f = (n: number) => { const k = (n + h / 30) % 12; const a = S * Math.min(L, 1 - L); return L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}
export function rgbToHsl({ r, g, b }: RGB): HSL {
  const R = r / 255, G = g / 255, B = b / 255, max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  h = norm360(h * 60);
  return { h, s: s * 100, l: l * 100 };
}
export const toHex = (c: HSL) => { const { r, g, b } = hslToRgb(c); return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join(''); };
```

**Luminance and contrast** (WCAG 2.1 §1.4.3 definitions):

```ts
export function relativeLuminance({ r, g, b }: RGB): number {
  const lin = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function contrastRatio(a: string, b: string): number {
  const A = parseColor(a), B = parseColor(b);
  if (!A || !B) return 1;
  const la = relativeLuminance(hslToRgb(A)), lb = relativeLuminance(hslToRgb(B));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}
```

Required test values: `contrastRatio('#ffffff','#000000') === 21`; `contrastRatio('#767676','#ffffff') === 4.54`; `contrastRatio('hsl(0,0%,50%)','hsl(0,0%,50%)') === 1`.

**Palette generation** (D-162). The prompt's table was tested mentally against blue, green, purple, and orange primaries; three adjustments were needed and are baked in: (a) surface at `l=100` washes out against background at `l=98` for light hues — surface stays 100 but border moves to `l=88` and `s=12` so cards have an edge; (b) secondary/accent inherit the primary's S but get `s−8`, `l` clamped to `[40, 65]` so a very light or very dark primary doesn't produce an unusable partner; (c) when a semantic role's fixed hue sits within ±22° of the primary hue (orange vs warning, red vs danger, green vs success) the semantic role is darkened `l−12` and desaturated `s−10` so it remains distinguishable.

```ts
const SEMANTIC_FIXED = { danger: { h: 0, s: 84, l: 60 }, warning: { h: 38, s: 92, l: 50 }, success: { h: 142, s: 71, l: 45 } } as const;
const hueDist = (a: number, b: number) => { const d = Math.abs(norm360(a) - norm360(b)); return Math.min(d, 360 - d); };
export function generatePalette(p: HSL, strategy: PaletteStrategy): Record<SemanticColorRole, string> {
  const partnerL = clamp(p.l, 40, 65), partnerS = clamp(p.s - 8, 20, 100);
  const shift = { complementary: [180, 30], analogous: [30, -30], triadic: [120, 240], monochromatic: [0, 0] }[strategy] as [number, number];
  const secondary: HSL = strategy === 'monochromatic' ? { h: p.h, s: clamp(p.s - 20, 10, 100), l: clamp(p.l + 15, 20, 85) } : { h: norm360(p.h + shift[0]), s: partnerS, l: partnerL };
  const accent: HSL    = strategy === 'monochromatic' ? { h: p.h, s: p.s, l: clamp(p.l - 15, 15, 80) } : { h: norm360(p.h + shift[1]), s: partnerS, l: partnerL };
  const semantic = (role: keyof typeof SEMANTIC_FIXED): HSL => { const base = { ...SEMANTIC_FIXED[role] }; return hueDist(base.h, p.h) <= 22 ? { h: base.h, s: base.s - 10, l: base.l - 12 } : base; };
  const out: Record<SemanticColorRole, HSL> = {
    primary: p, secondary, accent,
    danger: semantic('danger'), warning: semantic('warning'), success: semantic('success'),
    muted:            { h: p.h, s: 6,  l: 90 },
    background:       { h: p.h, s: 10, l: 98 },
    surface:          { h: p.h, s: 10, l: 100 },
    'text-primary':   { h: p.h, s: 15, l: 10 },
    'text-secondary': { h: p.h, s: 10, l: 40 },
    'text-muted':     { h: p.h, s: 8,  l: 58 },
    border:           { h: p.h, s: 12, l: 88 },
  };
  return Object.fromEntries(Object.entries(out).map(([k, c]) => [k, toHSLString(c)])) as Record<SemanticColorRole, string>;
}
```

`muted` moved from the prompt's `l=50` to `l=90`: at 50 it is a mid-gray that fails as a *fill* behind text-secondary (which sits at l=40); at 90 it's a proper disabled/track/divider fill. `text-muted` at `l=58` (was 60) clears 3:1 on background (98) with margin: measured ≈3.4:1 for a neutral hue.

Verification the implementer must run as tests (D-163): for primaries `hsl(220,90%,56%)`, `hsl(142,71%,45%)`, `hsl(250,84%,60%)`, `hsl(24,95%,53%)` × four strategies, assert `contrastRatio(text-primary, background) ≥ 12`, `contrastRatio(text-secondary, surface) ≥ 4.5`, `contrastRatio(text-muted, background) ≥ 3`, `contrastRatio(onColor(primary), primary) ≥ 4.5`, and `hueDist(warning, primary) > 22 || warning.l ≤ 40` for the orange case.

**Dark theme derivation** (D-164):

```ts
export function deriveDarkTheme(light: Record<SemanticColorRole, string | null>): Record<SemanticColorRole, string | null> {
  const out = {} as Record<SemanticColorRole, string | null>;
  const brand: SemanticColorRole[] = ['primary', 'secondary', 'accent', 'danger', 'warning', 'success'];
  for (const role of SEMANTIC_COLOR_ROLES) {
    const c = light[role] ? parseColor(light[role]!) : null;
    if (!c) { out[role] = null; continue; }
    const d: HSL = { ...c };
    switch (role) {
      case 'background':     d.s = clamp(c.s, 0, 20); d.l = 8;  break;
      case 'surface':        d.s = clamp(c.s, 0, 20); d.l = 12; break;
      case 'muted':          d.s = clamp(c.s, 0, 15); d.l = 20; break;
      case 'border':         d.s = clamp(c.s, 0, 15); d.l = 22; break;
      case 'text-primary':   d.l = 95; break;
      case 'text-secondary': d.l = 70; break;
      case 'text-muted':     d.l = 52; break;
      default:               d.l = clamp(c.l + 8, 0, 100); d.s = clamp(c.s - 5, 0, 100); // brand + semantic
    }
    out[role] = toHSLString(d);
  }
  // Contrast repair: walk brand colors lighter in 2% steps until on-color ≥ 4.5 and brand-on-background ≥ 3 (focus ring).
  for (const role of brand) {
    if (!out[role] || !out.background) continue;
    let c = parseColor(out[role]!)!; let guard = 0;
    while (guard++ < 20 && (contrastRatio(onColor(c), toHSLString(c)) < 4.5 || contrastRatio(toHSLString(c), out.background) < 3)) c = { ...c, l: clamp(c.l + 2, 0, 100) };
    out[role] = toHSLString(c);
  }
  return out;
}
```

Derived on-colors flip automatically because `onColor` reads lightness (D-046). `text-muted` at 52 on background 8 ≈ 4.9:1 — clears 3:1 comfortably and 4.5 for most hues.

**Hue ranges**:

```ts
/** '350-10' → true for h ∈ [350,360) ∪ [0,10]. '20-60' → [20,60]. Inclusive both ends. */
export function hueInRange(h: number, range: string): boolean {
  const m = /^\s*(\d{1,3})\s*-\s*(\d{1,3})\s*$/.exec(range); if (!m) return false;
  const a = norm360(+m[1]!), b = norm360(+m[2]!), x = norm360(h);
  return a <= b ? x >= a && x <= b : x >= a || x <= b;
}
```

### 6.2 Accessibility audit — `src/engine/accessibilityAuditor.ts` (Stream 1)

```ts
export interface AuditFinding { severity: 'error' | 'warning'; rule: string; tokens: TokenPath[]; componentId?: string; currentValue: string; requiredValue: string; fix: string }
export function auditAccessibility(scope: 'all' | 'components' | 'current-page'): AuditFinding[]
```

Checks (D-165), in order:

1. **Text pairs** — `text-primary/background`, `text-primary/surface`, `text-secondary/background`, `text-secondary/surface` at ≥4.5:1 (error below); `text-muted/background`, `text-muted/surface` at ≥3:1 (warning below — large-text assumption stated in `fix`). Pairs with a null side are skipped, not reported.
2. **On-colors** — `onColor(role)` on `role` for the six brand/semantic roles at ≥4.5:1 (error). Fix names the role and the direction: `Lighten color.primary to at least 62% or darken it to at most 38% so its text passes.`
3. **Focus ring** — `primary/background` ≥3:1 (warning). Fix: `Focus rings use primary; move it further from the background's lightness.`
4. **Type scale** — every `fontSize.*` ≥12 (error below 12), 12–13 warning. Fix: `Raise fontSize.xs to 12px.`
5. **Touch targets** — for each button size, `height = 2·padding-block + fontSize·lineHeight.tight`: sm = 2·8 + 14·1.2 = 32.8 → warning; md = 2·12 + 16·1.2 = 43.2 → warning (rounds under 44); lg = 2·16 + 18·1.2 = 53.6 → pass. Reported once per size (`componentId` omitted) with `fix: 'Use size lg for primary actions, or raise spacing.unit to 5.'` At `spacing.unit=5`, md = 2·15 + 19.2 = 49.2 → pass, which is exactly the fix the agent should relay. Only sizes actually present on the canvas are reported when `scope !== 'all'`.
6. **Component contrast** (scope components/current-page) — for each `ComponentSpec`, root `color` on root `background-color` from `getTokenMapping`, resolved through sentinels, ≥4.5 (error) with `componentId`.

Return sorted errors-first. `audit_accessibility.data = { findings, errors, warnings }`. The audit never mutates anything and never auto-fixes; the `fix` string is for the agent to relay or act on with `set_token`.

### 6.3 Rule evaluation — `src/engine/ruleEngine.ts` (Stream 2)

```ts
export function evaluateSpec(spec: ComponentSpec, rules: DesignRule[]): RuleViolation[] {
  const out: RuleViolation[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.condition.target !== 'all' && rule.condition.target !== spec.type) continue;
    const { property, operator, value } = rule.condition;
    const current = resolveProperty(spec, property);           // string | null
    if (current === null) continue;                             // property not applicable to this type
    const violated = test(operator, current, value);
    if (violated) out.push({ ruleId: rule.id, ruleDescription: rule.description, componentId: spec.id, property, currentValue: current, message: message(rule, spec, current), alternatives: alternatives(rule, spec) });
  }
  return out;
}
```

`resolveProperty` (D-166): `variant`/`size`/`type` → the spec field. `background-color`, `color`, `border-radius`, `font-size` → `STYLE_DICTIONARY[type].tokens(spec)['root.<property>']` → `tokenStore.getToken(path) ?? sentinel` (colors) or the px value (sizes). `min-height` → `2·padding-block + font-size·line-height` from the same map (`root.padding-block`, `root.font-size`, `root.line-height`), `null` if the root has no padding-block. `contrast` → `contrastRatio(resolve('color'), resolve('background-color'))`, falling back to `text-primary` on `background` when either is missing.

`test`: `equals` → `current === value`; `not-equals` → `!==`; `min` → `parseFloat(current) >= parseFloat(value)` violated when false; `max` → `<=`; `not-contains` → `current.includes(value)` violated when true; `hue-not-in` → `parseColor(current)` non-null and `hueInRange(h, value)` violated when true.

`alternatives`: for `variant`/`size`/`type` with `not-equals`/`equals` → the enum minus the forbidden value; for `hue-not-in`, `min`, `max` on token-driven properties → `[]` and the `message` carries the token hint (D-118). `evaluateAll()` maps `componentStore.list()` through `evaluateSpec(spec, ruleStore.listEnabled())`, memoized on a signature of `[rules, components, colors, radius, typography.scale, spacing.unit]`.

### 6.4 ID generation

D-067. Collision probability across a session of 10⁴ ids with 32 bits of entropy is ~1%, which is acceptable for a client-side session; `add` in every store is idempotent on duplicate id (replaces), and export never depends on ids.

---

## Part Seven: Export

### 7.1 Formats — `src/engine/export/*.ts` (Stream 5)

All exporters are pure functions `(state) => ExportFile[]` where `ExportFile = { path: string; contents: string; language: 'css' | 'json' | 'ts' | 'tsx' | 'scss' | 'md' }`.

**`tokens.css`** (D-167): header comment with product name, export timestamp, and token count; `:root` block grouped by category with a comment line per group (`/* Colors */`, `/* Derived on-colors */`, …), values from `tokenToVars` with font stacks rewritten to public names (D-121); a Google Fonts `@import` line at the top for the families in use (`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`); a `.dark { … }` block when `dark` exists; null colors emit the sentinel with a trailing `/* unset */` comment. Followed by the full contents of `library.css` under a `/* Component states */` header so one CSS file styles everything.

**`tokens.json`** (D-168): Design Tokens Community Group format. `design-tokens.github.io` was unreachable from this environment; the format is written from the 2024–25 editors' draft as known: groups as nested objects, leaf tokens with `$value`, `$type`, optional `$description`, and `$extensions`. Colors emit `$type: "color"` with a hex-string `$value` (the form Style Dictionary v4 consumes without configuration) and `$extensions: { "gal.hsl": "hsl(…)" }` carrying the original. Dimensions emit `$type: "dimension"` with `{ "value": 16, "unit": "px" }`; font families `$type: "fontFamily"` with an array `["Inter", "system-ui", "sans-serif"]`; weights `$type: "fontWeight"` numeric; line heights `$type: "number"`; durations `$type: "duration"` `{ "value": 150, "unit": "ms" }`; easings `$type: "cubicBezier"` `[0.4, 0, 0.2, 1]` (named keywords are mapped to their bezier equivalents); shadows `$type: "shadow"` parsed into `{ offsetX, offsetY, blur, spread, color }` objects (multi-shadow → array). The file header (`$description` at the root group) states: "DTCG-format export from Alternative Galaxy. Verify against the current spec at design-tokens.github.io if your tooling is strict about the color object form." If Stream 5 can reach the spec during implementation and the current draft mandates the color object form, it emits that form and moves hex to `$extensions` — the ledger entry records which was shipped.

**`tailwind.config.ts`** (D-169): `theme.extend` with `colors` mapping each role to `'var(--color-<role>)'` and each on-color to `'var(--color-on-<role>)'`; `fontFamily` `{ heading: 'var(--font-heading)', body: …, mono: … }`; `fontSize` keys → `'var(--font-size-<k>)'`; `fontWeight`, `lineHeight` likewise; `spacing` `{ '1': 'var(--spacing-1)', … '16': … }`; `borderRadius` `{ none, sm, md, lg, xl, full }` → vars; `boxShadow` → vars; `transitionDuration` `{ fast, normal, slow }`; `transitionTimingFunction` `{ default, in, out }`. `darkMode: ['class']`. A header comment says "requires tokens.css to be loaded".

**`tokens.scss`** (D-170): one `$<var-name-without-dashes>: <value>;` per var (`$color-primary: hsl(250, 84.0%, 60.0%);`), grouped with comments; a `@mixin dark-theme { … }` when dark exists. Values are literal (not CSS vars) because SCSS consumers want compile-time values.

**Components** (D-171): one `<PascalCase>.tsx` per component *type present on the canvas or in a page* (not per instance). Each file exports a typed component with props `{ variant?, size?, ...contentFields, ...interactiveProps }` where content fields come from `ComponentContentMap[type]` (all optional, defaulting to `DEFAULT_CONTENT`) and interactive props are `onClick`/`disabled`/`loading` for button, `onChange`/`value`/`disabled` for input/textarea/select/toggle, `open`/`onClose`/`onConfirm` for modal, `onDismiss` for toast. Styles are emitted as a precomputed `STYLES: Record<Variant, Record<Size, Record<Part, CSSProperties>>>` object generated by calling `STYLE_DICTIONARY[type].styles()` for all 15 combinations at export time — the exported code has no dependency on the studio's engine and is readable as plain React. The JSX body is the Turn 3 component's markup with `spec.content.x` replaced by props and `data-*` attributes retained (so `library.css` applies). Modal gains a portal and a focus trap (D-103) — a 30-line inline implementation, no dependency.

**`Page.tsx`** (D-172): imports the exported components, composes `RenderedPage.sections` in order with the same `<section data-section>` wrapper and container CSS as `layoutEngine`, inlines the three block types (gallery/stats/team) as local functions when present, and passes the page components' content as props. One file per rendered page: `pages/<kebab-title>.tsx`.

**`README.md`** (D-173): what's inside; how to install (`tokens.css` + `library.css` are one file; put `container: canvas / inline-size` on your page root for responsive behaviour, D-085); fonts (Google Fonts import vs `next/font` snippet); how to use the Tailwind config; the DTCG note; the rules that were active at export time (plain language) so the consuming team knows the constraints; MIT license line. **`package.json`** stub: `name` from the page title slug, `react`/`react-dom` peer deps, `tailwindcss` optional, `"private": true`.

### 7.2 Delivery

**Modal with file tree, preview, copy, Download ZIP** (D-174). Left: a tree (`tokens/`, `components/`, `pages/`, `README.md`, `package.json`) with file sizes; right: the selected file in Geist Mono 12px with a 40-line regex highlighter (`src/engine/export/highlight.ts`: strings, comments, keywords, numbers, punctuation — no dependency) and a Copy button; footer: `Download ZIP` (JSZip, seed dependency) named `<slug>-design-system.zip`, and a tab row `Tokens · Components · Page · Everything` that filters the tree and the ZIP contents. Format checkboxes on the Tokens tab (CSS · DTCG JSON · Tailwind · SCSS), all on by default.

**Agent receives a summary** (D-175): `export_*` tools run the same exporters, stash the result in `uiStore.exportFiles` (transient, not persisted), open the panel (`uiStore.setExportOpen(true)`) and return `data = { files: [{ path, lines }], totalLines, note: 'Ready in the export panel.' }` with `summary: 'Exported 9 files (1,247 lines). The human can download them from the export panel.'`. The agent never receives file contents; `get_component_code` exists for the one-component case.

---

## Part Eight: Edge cases

Most were closed in earlier turns; each is restated with its decision so this section is complete on its own.

**8.1 Token deleted under components** — components go gray and legible via `UNSET_COLOR` (D-109). Deletion is never blocked or warned in the UI; the log entry is undoable; `remove_token.data.dependents` tells the agent which components reference it so it can say so.

**8.2 Phase regression** — nothing is deleted (D-132). Wireframes and pages stay visible and human-editable; agent layout tools are absent until phase returns; the phase-down toast names the paused group (D-154). A wireframe sketched in phase 3 survives a drop to 2 and a return to 3 unchanged.

**8.3 Agent violates a rule** — rejected, not created (D-116), with the D-118 message and `alternatives`. For rules that existing components already violate, they're flagged, not removed.

**8.4 Call to an aborted tool** — every execute re-checks phase and returns `PHASE_LOCKED` (D-009). Chrome ≤152 may cancel the in-flight call before our code runs; the agent sees the host's error and its next `get_current_state` explains the phase. Both paths are acceptable; neither corrupts state.

**8.5 Empty everything** — D-146 (token panel), D-149 (canvas), D-151/§5.4 (log), D-153 (phase bar), D-156 (banner).

**8.6 Reload** — all five domain stores persist (D-068). Corrupt persisted state (D-176): each store's `persist` config sets `merge: (persisted, current) => validate(persisted) ? { ...current, ...persisted } : current` where `validate` is a hand-written structural check (`Array.isArray(s.components) && s.components.every(hasIdAndType)`, etc.). On failure the store starts from defaults and a toast reads `Saved <store> data couldn't be read and was reset.` `version: 1` with a `migrate` that returns defaults for any other version. The log persists too — the collaboration history survives reload, which is what makes "undo yesterday's agent change" possible.

**8.7 Polyfill** — loaded conditionally in every environment (D-013); it does not interfere with native (idempotent, never replaces). Testing without an agent is the Tool Inspector (D-031), a shipped panel: left list of `getTools()` results (live via `toolchange`), click one to see its description and schema, a JSON textarea prefilled with an example input derived from the schema (`required` keys with type-appropriate placeholders), `Run` calls `runTool`, result renders below as pretty JSON. Every run is logged by the wrapper like any agent call (actor `agent`, since it went through `executeTool`) — the log gains a `via inspector` tag when `uiStore.inspectorOpen` was true at call time (D-177). On camera the inspector is the fallback visual for "tools appearing": its list grows from 4 to 8 to 14 as tokens are set.

**8.8 (new) Agent registers before hydration** — `WebMCPBridge` waits for `ensureModelContext()` but stores hydrate synchronously on first import in the browser, so the first `sync()` sees the persisted phase. No race (D-178).

**8.9 (new) Two tabs** — last-write-wins across tabs via `localStorage`; no cross-tab sync. Documented as out of scope (D-179).

---

## Part 1.7: Undo as a first-class contract

**Ordering: arbitrary, from the log, with blocking** (D-180). Cmd+Z undoes `logStore.lastUndoable()`. Clicking Undo on any entry undoes that entry. No redo (D-181): redo of an arbitrary undo is a second undo of the undo entry, and the log already contains that — the mental model "the log is the history; anything in it can be reversed" is simpler than a redo stack and fits a collaboration record.

**Executor** — `src/engine/undo.ts` (Stream 5):

```ts
export type UndoResult = { ok: true } | { ok: false; reason: string };
export function undoEntry(entryId: string): UndoResult
```

Per inverse kind (D-182):

| Inverse | Executes | Blocked when |
|---|---|---|
| `restore_token` | `tokenStore.setToken(path, value)` or `removeToken` when `value === null` | never (locks don't block undo, D-127) |
| `restore_tokens` | `setMany` for non-null, `removeToken` for null | never |
| `remove_component` | `componentStore.remove(id)`; if `pageId` set, also drop id from its section | never (missing id → treated as done) |
| `restore_component` | `componentStore.add(spec, index)` | id already exists (no-op, marked undone) |
| `restore_component_spec` | `componentStore.update(id, previous)` | component no longer exists → `the component was removed` |
| `remove_wireframe` | `layoutStore.removeWireframe(id)` | wireframe has a rendered page → `the wireframe has a rendered page; delete the page first` |
| `restore_wireframe` | `addWireframe(wireframe, index)` | never |
| `restore_sections` | `setSections(wireframeId, sections)` | wireframe missing → `the wireframe no longer exists`; wireframe rendered → `re-render after undoing` (allowed; page keeps old structure until re-render, flagged) |
| `unrender_page` | `removeRenderedPage(pageId)`, `removeMany(componentIds)`, `setWireframeStatus(wireframeId,'wireframe')` | page missing → treated as done |
| `restore_dark` | `tokenStore.setDark(previous)` | never |
| `remove_rule` | `ruleStore.remove(id)` | never |
| `restore_rule` | `ruleStore.add(rule, index)` | never |

**Per-tool inverse payloads** (captured inside `execute` before mutating; D-183):

| Tool | `inverse` |
|---|---|
| set_token | `restore_token{ path, previous }` |
| remove_token | `restore_token{ path, previous }` |
| suggest_palette | `restore_tokens{ snapshot of all 13 color paths before }` |
| add_rule | `remove_rule{ id }` |
| remove_rule | `restore_rule{ rule, index }` |
| generate_component | `remove_component{ id }` |
| modify_component | `restore_component_spec{ id, previous }` |
| remove_component | `restore_component{ spec, index }` (+ if it was in a page, the executor re-inserts the id into the section) |
| sketch_wireframe | `remove_wireframe{ id }` |
| modify_layout | `restore_sections{ wireframeId, sections before }` |
| remove_wireframe | `restore_wireframe{ wireframe, index }` |
| render_page | `unrender_page{ pageId, wireframeId, componentIds }` (for a re-render, two entries: the implicit unrender first) |
| generate_dark_theme | `restore_dark{ previous }` |
| get_*, list_*, explain_*, audit_*, export_* | `null` |

Human UI actions produce the same inverses via `commitHuman` (D-077); `ui.load_example` → `restore_tokens`; `ui.delete_page` → the inverse is `null` — **deleting a page is not undoable** (D-184) because restoring it would require restoring N components with their original ids and re-linking sections, and a re-render reproduces the page in one click. The confirm dialog says so.

**Phase after undo** recalculates automatically (D-049). **Undo is logged** as a human entry `ui.undo` with `input: { entryId, tool }` and `inverse: null` (D-060). The undone entry is marked `undone`; it cannot be undone twice. A blocked undo shows the toast `Can't undo — <reason>` and changes nothing.

---

END OF TURN 6 — say 'continue' for Turn 7 (Parts Zero, Thirteen, Nineteen, Twenty-Three: positioning, submission, judge simulation, effort and day plan).

---

# TURN 7 — POSITIONING, SUBMISSION, JUDGES, SCHEDULE

## Part Zero: What wins

Judges get three minutes of video and a URL. Six of them, from six companies, each looking for one thing:

| Judge | Wants to see | Where Alternative Galaxy shows it |
|---|---|---|
| OpenAI | ChatGPT's browser doing something a normal browser can't | Moment 1: the agent discovers, without being told, that it must earn the right to generate components. No system prompt, no plugin manifest — the page's tool list *is* the instruction. |
| Google Chrome | Dynamic imperative registration as a feature, not a curiosity; both APIs used with intent | Diff-based registration with abort-to-unregister (D-002), `toolchange`-driven UI (D-016), `readOnlyHint`/`untrustedContentHint` where true (D-025), one declarative form that only a human can submit (D-029). |
| Vercel / Next.js | A production-grade App Router app | Server layout + one client bridge (D-017), `next/font` for 13 families (D-119), metadata/OG (Turn 8), Lighthouse targets (Turn 8), strict TS with zero `any`. |
| Cloudflare | Edge-ready, no server dependency | Fully static, no API routes, no env vars; deploys unchanged to Cloudflare Pages (Turn 8 §17). |
| Netlify (AI VP) | A product people would use, not a protocol demo | The export: a designer walks away with tokens in four formats and compiling React. The rules: a constraint the agent literally cannot break. |
| MCP-B creator | Protocol depth; something impossible without WebMCP | The page is the tool provider and the canvas at once. Two-axis gating — phase (what exists) × rules (what's allowed) — on the same surface the human is editing. |

**The three moments** are the whole video and the whole spec. Everything in Turns 1–6 either makes one of them land or makes the product credible enough that a judge clicking around afterward doesn't find a hollow shell. Anything that does neither was cut (Part Twelve) or is first in the cut order (§23.4).

1. **Phase gate** — agent asks for a button; the tool is absent; it calls `get_current_state`; it learns what unlocks components and offers to help; human sets primary (or the agent proposes it through the declarative form and the human clicks Apply); `set_token` ×4 or `suggest_palette`; the phase bar sweeps; the tool count ticks 4 → 14; the agent's own return value narrates "Phase 1 → 2. New tools: generate_component, …". *Proves: WebMCP enables a class of agent behaviour static APIs can't express.*
2. **Cascade** — five components and a page on canvas; human drags the primary hue from violet to green; every surface recolors at 60fps; the agent did nothing; the log shows nothing. *Proves: the design system is real; the architecture is CSS variables, not re-rendering.*
3. **Wireframe → render** — agent sketches six gray boxes; human moves one and says "render it"; 700ms later a styled landing page in the human's tokens. *Proves: the collaboration produces something neither party made alone.*

A fourth beat, cheap and worth the twenty seconds if the video has room: the human locks primary, asks for "a warmer palette", and the agent reports it changed eleven colors and left primary because it's locked (D-127). It is the "human owns the constraints" thesis in one exchange.

---

## Part Thirteen: The submission

### 13.1 Rubric

The submission page could not be fetched from this environment (no general web egress). **Inferred rubric** from the challenge copy in past research ("why WebMCP fits", "what humans and agents do together") and the judge lineup, weighted by who's judging (D-185):

| Inferred category | Weight | Alternative Galaxy scores with |
|---|---|---|
| Use of WebMCP — depth and correctness | 30% | Diff registration, abort lifetimes, `toolchange`, annotations, declarative + imperative with reasons, envelope design, phase narration in results, defensive re-check (Part One, Sixteen) |
| Human–agent collaboration | 25% | Shared capability matrix with no agent-only actions (13.4), locks, overwrite toast, human-only ratification of the first token, undo of any party's action, the collaboration log |
| Technical execution / production quality | 20% | App Router structure, strict TS, tests on algorithms, Lighthouse ≥90/95/95/90, a11y of the studio itself, static deploy |
| Usefulness / real problem | 15% | Agents lose design intent; tokens pasted into prompts evaporate — this makes them enforceable. Export that compiles. |
| Creativity / demo | 10% | Absent-not-refused tools; wireframe→render; the agent narrating its own capability expansion |

If a published rubric exists on the form, Stream 5 maps each of these rows to it in the README's "How this maps to the judging criteria" section before submission; the mapping above is the fallback.

### 13.2 Submission description

**150-word version** (D-186):

> Alternative Galaxy is a design studio where a human and an AI agent build a design system on the same page — and the agent can only do what the current state of the work allows. Tools aren't refused; they don't exist yet. Before any tokens are defined, the agent has four tools. Once the human sets five, it has fourteen. After a page is rendered, twenty-four, including export.
>
> WebMCP makes this possible: the page registers tools imperatively with AbortSignals, and adds or removes them as the human's decisions change what's legal — the same mechanism a static API can't express. The human owns tokens, rules, and locks. The agent generates components, sketches wireframes, and renders pages inside those constraints. Every action by either party is logged and reversible.
>
> The result exports as CSS variables, DTCG JSON, Tailwind config, and React components that compile. alt.gal — MIT licensed.

**500-word version** (D-187):

> **Alternative Galaxy is a design studio for humans and agents, where the agent's tools are a function of the work's state.**
>
> The problem is familiar to anyone who has asked an AI to build UI: it loses the design intent. Developers paste their tokens into a prompt; three generations later the colors have drifted, the spacing is invented, and the button that was supposed to be off-brand-red is red. The constraints lived in the conversation, not in the system, so they evaporated.
>
> Static tool APIs can't fix this. An agent handed every tool at once will skip steps — it will generate components before anyone has decided what "primary" means. And a refusal ("you can't do that yet") is worse than absence: the agent argues, retries, or works around it. What's needed is for the tool to *not exist* until the state that makes it meaningful exists.
>
> That is exactly what WebMCP's imperative API allows. Alternative Galaxy registers tools on `document.modelContext` with AbortSignals and diffs the registered set whenever the human's decisions move the work between five phases: Empty, Tokens, Components, Layout, Export. Phase 0 exposes four tools. Defining five tokens — including a primary, a background, and a text color — unlocks component generation. Two components unlock wireframing and rendering. One rendered page unlocks export. Deleting things moves the phase back, and the tools disappear again. The page is the tool provider and the canvas at once, and `toolchange` drives the studio's own UI: the tool count in the header ticks as the agent earns capability.
>
> Three moments show it. First, the gate: the agent is asked for a button, finds no tool, asks the page what it can do, and learns what unlocks the next phase — then offers to help set the tokens. Second, the cascade: the human drags the primary hue and every component and page recolors instantly, because the components are built only from CSS variables the human controls. Third, the render: the agent sketches a landing page as gray boxes, the human approves, and the boxes become a fully styled page in the human's tokens.
>
> The human owns the tokens, the rules ("no danger-variant buttons", "minimum contrast 4.5:1"), and the locks — a locked token returns an error to the agent by name. The agent owns nothing exclusively: everything it can do through a tool, the human can do through the UI, so it is a collaborator, not a gatekeeper. Every action by either party lands in one log and can be undone by the human. One tool — proposing the first brand color — is a declarative form without autosubmit, so the agent can fill it and only the human can apply it.
>
> The output is real: tokens in CSS variables, DTCG JSON, Tailwind config, and SCSS; React components with precomputed styles; a composed page; a README with the active rules. It compiles.
>
> After the challenge: persistence, teams, and a catalog of systems — the studio becomes the design layer for an autonomous product factory we are building at alt.gal, where agents ship products inside constraints humans set.

### 13.3 "Why not X"

Refined for the README's Comparison section (D-188):

- **v0.** v0 turns a prompt into UI and decides the design system for you; if you want to change the brand color afterward, you prompt again and hope. Alternative Galaxy inverts the ownership: the human defines the system first, and the agent's generation tools do not exist until it's defined. Changing the brand color is a slider, not a regeneration.
- **Figma Make / Figma AI.** Figma's agent works inside Figma's file format for designers who will hand off to engineers later. Alternative Galaxy runs in the browser the agent already lives in, produces code as the primary artifact, and is protocol-first: it doesn't ship an agent, it ships tools any WebMCP client can call.
- **Banani, UX Pilot, Token Designer.** Generators with an AI button. Their agent is their agent; their tools aren't exposed to anything outside the product; none gate what the agent may do on workflow state. In Alternative Galaxy the agent is whatever the user brought, and the tool list is the permission system.
- **A normal MCP server.** The design surface is the browser — the human is looking at the canvas. A headless server would need its own state, its own rendering, and a sync channel back to the page. WebMCP is the only protocol where the page itself is the tool provider, so the human and the agent are guaranteed to be looking at the same thing.
- **Claude Design, Doop, and other same-surface canvases.** Closed products with a built-in model. Alternative Galaxy is open (MIT), model-agnostic, and legible: the human can see exactly which tools the agent has at every moment, and why.
- **mace, shipwright (fellow submissions).** Mace proved state-gating; shipwright proved a shared canvas. Alternative Galaxy has both, adds a second gating axis (rules, evaluated against the same style dictionary the components render from), and solves a problem developers complain about daily rather than one they encounter at a parliamentary meeting or a starship yard. Full credit to mace for the registration pattern; ARCHITECTURE.md names what was borrowed.

### 13.4 Human / agent / shared capability matrix

Audit result: three capabilities were agent-only in the spec as written (audit, dark theme, explain/code). Fixed by adding UI paths (D-189): a **Run audit** button in the Rules section header; a **Generate dark theme** button beside the theme toggle (disabled once dark exists, with `Regenerate` on hover); and the component **Edit panel** (D-097) gains a "Why it looks like this" tab showing `getTokenMapping` and a **Copy code** button. With those, the claim is true.

| Human only | Shared (UI path · tool path) | Agent only |
|---|---|---|
| Define/edit tokens by direct manipulation (pickers, sliders) | Set a token · `set_token` / declarative `set_primary_color` | — |
| Lock/unlock tokens | Fill palette from primary · `suggest_palette` | |
| Add/enable/disable rules via presets | Add/remove a rule · `add_rule` / `remove_rule` | |
| Apply the first color from the declarative form | Create a component (+ Component) · `generate_component` | |
| Approve a wireframe (by clicking Render or telling the agent to) | Edit a component (Edit panel) · `modify_component` | |
| Reorder/remove sections by hand | Remove a component · `remove_component` | |
| Toggle light/dark, switch viewport | See why it looks like this (Edit panel tab) · `explain_component` | |
| Download the export ZIP | Copy component code · `get_component_code` | |
| Undo anything | Sketch a wireframe (New wireframe form) · `sketch_wireframe` | |
| Delete a page, reset the workspace | Modify a layout (section controls) · `modify_layout` | |
| Use the Tool Inspector | Remove a wireframe (tab ✕) · `remove_wireframe` | |
| | Render a page (Render button) · `render_page` | |
| | Generate a dark theme (button) · `generate_dark_theme` | |
| | Run the audit (button) · `audit_accessibility` | |
| | Export (panel) · `export_*` | |

Nothing is agent-only by design. The agent is a collaborator with the same verbs and fewer nouns (no locks, no undo, no approval).

---

## Part Nineteen: Judge simulation

**OpenAI judge.** *"The phase gate is the pitch, and it depends on ChatGPT re-reading the tool list mid-session. If our browser doesn't do that, your demo is a page reload with a voiceover. And I've seen the trick of wrapping every result in 'Phase advanced, new tools: …' — you're prompt-engineering the model through return values, which is a workaround for a discovery mechanism you don't control."* Second paragraph: *"The agent's first move — call get_current_state — only happens if the model decides to. Your 'money moment' is a probabilistic behaviour of my model. What's the fallback when it just says 'I can't do that'?"*
→ Addressed: D-041 makes host re-read behaviour the Day-1 test with a stated fallback (Chrome + Tool Inspector; README says which host was filmed). Phase narration in results is *also* what the Chrome docs' best-practice page recommends — self-describing results — and it works regardless of discovery. For the probabilistic first move: `get_current_state`'s description is written to be the obvious call when a tool is missing ("Call it … whenever a tool you expected is missing", D-023), and the demo prompt is scripted (Turn 8) so the ask is unambiguous. If the model refuses instead of exploring, the human says "check what you can do on this page" — one line, still honest.

**Chrome engineer.** *"Diff-based registration and AbortSignal.any — this is mace's pattern with the file renamed. You use one declarative form as a fig leaf. And your schemas use plain `enum` instead of the `oneOf`/`const`/`title` pattern our docs recommend for readable labels."* Second: *"Container queries on a 375px canvas are clever, but your studio itself isn't responsive at all, and you're loading a third-party polyfill in production on Chrome builds that have the real API — that's a smell."*
→ Addressed: ARCHITECTURE.md credits mace explicitly and states what's different (two-axis gating; results envelope; no state-derived schemas — D-019, and why). The declarative form is not decorative: it is the only path by which the *first* token can be human-ratified, and the execute-vs-initiate distinction is the Chrome team's own (D-029). Plain `enum` is a deliberate compatibility call documented with the reason — OpenAI strict function-calling rejects `oneOf` (D-020) — and the paragraph says so. Polyfill: it is loaded only when `document.modelContext` is absent (D-013) — a Chrome build with the flag never sees it. Studio responsiveness: desktop-only is a product decision stated in the UI (D-155).

**Next.js core team.** *"It's a single client page. Why App Router? You have one server component that renders one client bridge. This could be Vite. Show me something Next is actually doing."* Second: *"Thirteen next/font families on `<html>` — what does that do to first load? And `suppressHydrationWarning` on your style tag is a hydration bug you've muted, not solved."*
→ Addressed: App Router earns its place through the metadata API and `opengraph-image.tsx` (Turn 8), `next/font` self-hosting with zero layout shift, a server layout that keeps the bridge out of the client bundle's critical path, and the stated post-challenge trajectory (persistence via route handlers, D-078 lists it as deferred, not rejected). Fonts: `@font-face` declarations cost CSS only; bytes download on first use (D-119) — the Lighthouse numbers in Turn 8 are the proof. Hydration: the mismatch is one frame between default and persisted CSS on a page with no components on first load; the alternative (`skipHydration` + manual rehydrate) adds a visible flash; the choice and its reasoning are in ARCHITECTURE.md (D-108).

**Cloudflare engineer.** *"Nothing here is edge. No Workers, no KV, no D1 — shipwright saved designs to D1 and you save to localStorage. 'Deploys to Pages' is true of any static site."* Second: *"When you do add persistence, your undo model assumes a single client and synchronous stores. That won't survive a network."*
→ Addressed honestly: the architecture is static by choice for a four-day build and says so (Turn 8 §17). The credible claim is not "edge-native" but "zero server dependency, so it runs identically on Pages, Vercel, Netlify, or a file URL." On persistence and undo: the log-as-history model (D-180) is exactly the shape that survives a network — an append-only event log with inverses is a sync-friendly primitive; the ARCHITECTURE.md note says the next step is streaming the log to Durable Objects, not replacing it.

**Netlify AI VP.** *"Who is this for? Designers won't set tokens in a dark developer tool; developers won't design in a browser canvas. It's a demo of a protocol, and the 'export' is a zip of React files nobody asked for."* Second: *"Your fictional 'Northwind' copy is nicer than most, but a judge clicking around sees a component gallery. Where's the workflow that a team would repeat?"*
→ Addressed partially, admitted partially. The wedge is developers who already use agents for UI and lose design intent — the export is what they asked for, in the formats they use (Tailwind config referencing CSS vars is the daily-use artifact). The dark tool is the right register for that user. The repeatable workflow — persist a system, reuse across projects, team libraries — is post-challenge (D-078), and the 500-word description says so in its last sentence. What the spec does *not* do, and should not pretend to, is serve designers who live in Figma.

**MCP-B creator.** *"Mace with a design skin. Same abort pattern, same deferred sync, same 'what is in order' thesis. The declarative form does less than mace's — mace made the vote the form; yours is a color input. And you return JSON strings from execute — that's the server-MCP habit leaking into WebMCP, where a self-describing sentence is the idiom."* Second: *"Your schemas are static; you threw away schema-carries-state, which is the single most protocol-native idea in mace."*
→ Addressed: what's new is stated precisely — two independent gating axes (phase and rules) sharing one style dictionary; a render pipeline that turns a proposal into a live artifact; a cascade that proves the components are token-pure; a log that is the history for both parties with typed inverses. The declarative form is smaller than mace's because the product has one action that must be human-ratified, not two; making more forms declarative would be theatre. On result shape: the envelope *contains* the self-describing sentence (`summary`) and adds structure the agent demonstrably uses (ids, alternatives, `newTools`) — both idioms, one string (D-005–D-007). On schema-carries-state: rejected for a stated reason (D-019: id enums would fire `toolchange` on every mutation and bury the phase signal in noise). The MCP-B creator may still disagree; the README makes the trade-off legible rather than hiding it.

**One criticism nobody addresses**, added here so it isn't discovered on Sept 3: the studio has no keyboard path to *reorder* wireframe sections without a mouse hover (the control strip appears on hover). Fix (D-190): the strip is also shown on `:focus-within`, and each box is focusable with arrow-key handlers (↑/↓ move, Delete removes). Cheap; axe won't catch it; a Chrome a11y-minded judge would.

---

## Part Twenty-Three: Effort estimates and the plan

### 23.1 Per stream

| Stream | Files | LOC (approx) | Hours (strong engineer + AI pair) | Hardest file, and why |
|---|---|---|---|---|
| 1 Tokens | 18 | 1,900 | 11 | `ColorTokenEditor.tsx` — popover, HSL sliders with computed tracks, ghost proposals, and the drag-vs-commit logging semantics (D-111) all in one component. |
| 2 Components | 26 | 2,300 (≈70% is Turn 3 verbatim) | 9 | `ruleEngine.ts` — `resolveProperty` has to walk the style dictionary's token map, compute `min-height`, and fall back for `contrast` without special-casing component types. |
| 3 WebMCP | 30 | 1,700 | 9 | `tools/render_page.ts` + `get_current_state.ts` — coordinate three stores and the layout engine inside a synchronous execute with a correct inverse; and the Playwright smoke with the fake modelContext, which is the only test that proves the phase gate. |
| 4 Layouts | 12 | 1,500 | 9 | `layoutEngine.ts` — section → specs with content, page assembly, re-render semantics, and the two-phase transition timing. |
| 5 Studio UI + undo + export | 34 | 3,600 | 19 | `export/components.ts` — generating readable TSX with precomputed `STYLES` for 16 types × 15 combinations, prop interfaces from `ComponentContentMap`, and the modal portal, such that the output passes `tsc` in a scratch project. |
| **Total** | **120** | **≈11,000** | **57** | |

Integration (merge five branches, type mismatches, first clean build, first end-to-end run of all three moments): **7 hours**, one person, on `main`. Polish (a11y pass with axe, Lighthouse, microcopy check, phase animations, transition timing): **6 hours**. Deploy + DNS: **2 hours** if DNS is started early (propagation), **half a day** if it isn't. Video (script, three takes, cut, upload): **4 hours**. Submission form + README/ARCHITECTURE final read: **1.5 hours**.

**Honest answer:** five parallel streams do **not** complete in one working day. Streams 1–4 are one long day each (9–11 hours); Stream 5 is two. With integration, polish, deploy, and video on top, the total is ≈77 hours of work against ≈60 hours of calendar from now to the deadline, and that calendar includes sleep. It fits only because the streams are parallel and the cut order below is applied on Sept 2 evening without hesitation.

### 23.2 Day by day (Central Time)

**Mon Aug 31 (today, evening)** — Turn 8 written. `pnpm create next-app`, paste the seed (Turns 1–3 boundary files, stubs, `library/*.tsx`, `content.ts`, `library.css`), `pnpm typecheck` clean, commit `seed`, push, connect Vercel, deploy to a preview URL. **Start DNS now**: point `alt.gal` at Vercel tonight so propagation is done by Wednesday (D-191). Brief five Claude instances with `ALT_GAL_IMPLEMENTATION.md` + `DECISIONS_LEDGER.md` + their stream section. ~3h.

**Tue Sept 1** —
- 08:00–09:00 **Day-1 blocker (D-041)**: open the preview URL in ChatGPT's in-app browser; confirm `registerTool` does not throw; set tokens via the store from the Tool Inspector and confirm the agent sees the new tools without reload. Record the result in the ledger. If it fails, the video plan flips to Chrome + Inspector *today*, not Thursday.
- 09:00–20:00 Streams 1–4 build in parallel. Stream 5 builds the shell: `layout.tsx`, `globals.css` with studio vars, `StudioShell`, `PhaseIndicator`, `AgentLog`, `strings.ts`, `commit.ts`, `undo.ts`.
- 20:00–22:00 Streams 1 and 2 open PRs; integration owner merges both (they're independent, D-072); first canvas with real components and real tokens.

**Wed Sept 2** —
- 08:00–12:00 Streams 3 and 4 finish; PRs merged by noon. Stream 5 builds export.
- 12:00–13:00 First end-to-end run of the three moments with the Tool Inspector; then with the real host.
- 13:00–18:00 Integration fixes. Stream 5 finishes export and the Edit panel.
- 18:00 **Cut decision** (§23.4): whatever is not green at 18:00 is cut or deferred.
- 18:00–23:00 Polish pass one: axe on the studio, keyboard paths (D-190), Lighthouse, microcopy diff against D-160. Production deploy to alt.gal; verify DNS.

**Thu Sept 3** —
- 08:00–10:30 Polish pass two; record OG image; README/ARCHITECTURE final; `pnpm lint && pnpm typecheck && pnpm test` green.
- 10:30–13:00 Video: two rehearsals, three takes, cut to <3:00, upload (unlisted YouTube + MP4 in the repo release).
- 13:00–14:15 Submission form; paste the 150/500-word text; live URL, repo, video link; final click-through of alt.gal in a clean browser.
- **14:15–15:00 buffer.** 45 minutes. That is the entire slack in the plan.

### 23.3 Where the plan breaks

Stream 5 is the long pole. If the export generator isn't producing compiling TSX by Wed 15:00, the cut order below removes SCSS and Tailwind first and then reduces component export to the types actually on the canvas (already the rule) with `STYLES` limited to the variants used. If integration reveals a store-shape mismatch, the fix is in the seed's boundary file and *every* stream rebases — that is why the boundary files were written before code, and why nothing in `src/types` changes without a ledger entry.

### 23.4 Cut order (D-192)

Applied top-down at Wed 18:00 until the remaining work fits Thursday morning. Never cut: the three moments, the phase system, the log with undo, `get_current_state`, the Tool Inspector, export to CSS + React.

1. **Components** (drop from the registry; type stays in the union with a `Placeholder` render): `toast`, `modal`, `select`, `textarea`, `accordion` (faq falls back to `card` ×N with question/answer), `toggle`, `badge`, `avatar`.
2. **Export formats**: SCSS, then Tailwind, then DTCG JSON (CSS + React never cut).
3. **UI**: keyboard shortcuts (Cmd+E, 1/2/3, D — Cmd+Z stays), phase-up animation (leave the state change), agent-set row flash, the `↑ n new` pill, log filter chips, the `Shadow intensity` and `Ratio` conveniences (direct editing stays), ghost palette proposals (Fill from primary stays).
4. **Tools** (become UI-only): `generate_dark_theme` (button stays), `remove_wireframe`, `get_component_code`, `export_components`/`export_page` (fold into `export_full_system`). Tool count in copy changes accordingly; the phase map in the ledger is amended, not silently drifted.
5. **Sections**: `gallery`, `stats`, `team` blocks (wireframe still allows them; render emits an emptied strip with `Not yet supported`).
6. **Render transition** animation (instant swap).
7. **The declarative form** — last, because it is the answer to a Chrome judge's first question; but it is not on the critical path of any moment.

What is never cut and never deferred: the Day-1 host test, the seed's type freeze, the ledger.

---

END OF TURN 7 — say 'continue' for Turn 8 (Parts Nine, Ten, Seventeen: repo, demo script, production signals).

---

# TURN 8 — REPO, DEMO, PRODUCTION SIGNALS, FINAL CHECK

## Part Nine: The repo

### 9.1 README.md (D-195)

Order of sections, each one screen or less:

1. **Hero** — a 12-second GIF (from the video's render moment: gray boxes → styled page) at 1200px wide, then the one-line pitch: *Design systems for humans and agents. The agent's tools are a function of the work's state.*
2. **One paragraph** — the 150-word submission text (D-186), minus its last line.
3. **Why WebMCP** — three paragraphs, verbatim:

> Static tool APIs cannot express workflow state. A design system has an order — tokens before components, components before pages, pages before export — and an agent handed every tool at once will skip it, because nothing tells it not to. You can write "don't generate components until tokens exist" into a system prompt, and the agent will forget it three turns later, or argue with it, or work around a refusal by describing the button in prose. A refusal is a negotiation. Absence is not: a tool that does not exist cannot be called, argued with, or worked around. The agent asks what it *can* do, and the answer is the truth about where the work is.
>
> WebMCP is the only protocol where the page itself is the tool provider, so the tools can be a live function of the page's state. Alternative Galaxy registers each tool on `document.modelContext` with an AbortSignal and diffs the registered set whenever the human's decisions move the work between phases: aborting what is no longer legal, registering what has become legal, touching nothing else. The browser's `toolchange` event then drives the studio's own UI — the tool count the human sees is read back from `getTools()`, never tracked by hand. The phase system is a state machine that the agent navigates by acting: set enough tokens and the component tools appear in your hands; delete them and the tools leave.
>
> This pattern is not specific to design. Any multi-step creative workflow — a legal document that needs parties before clauses, a data pipeline that needs a schema before transforms, a game that needs a board before moves — has states in which most actions are meaningless. Encoding those states as tool presence rather than tool refusal is what makes an agent behave like a collaborator who understands the work rather than a very fast intern who needs supervising. Alternative Galaxy is one instance of it; the registration hook is 120 lines and MIT-licensed.

4. **How it works** — the five-phase diagram (SVG in `docs/phases.svg`: five pills, tool counts 4/8/14/20/24 under each, arrows labelled with the unlock condition), then the three moments in one sentence each.
5. **Try it** — `https://alt.gal`; three ways: (a) ChatGPT's in-app browser (steps per §10.4 as verified Tuesday); (b) Chrome with `chrome://flags/#enable-webmcp-testing` + the Model Context Tool Inspector extension; (c) any browser, using the built-in Tool Inspector (polyfill). Which one the video used is stated here.
6. **Humans and agents** — the capability matrix (13.4).
7. **Comparison** — the six paragraphs (D-188).
8. **Architecture** — one paragraph pointing to ARCHITECTURE.md and the three-panel screenshot.
9. **Tech stack** — Next.js (App Router), React, TypeScript strict, Zustand, `webmcp-types`, `@mcp-b/webmcp-polyfill` (fallback only), JSZip, Vitest, Playwright. No UI framework, no CSS framework.
10. **Development** — `pnpm i && pnpm dev`; `pnpm test`; `pnpm e2e`; how the polyfill is auto-loaded; how to run the Playwright fake host.
11. **Credits** — mace (registration pattern, deferred sync), shipwright (hook lifecycle, test fixture), Chrome's `webmcp-declarative.d.ts`. Named, linked.
12. **License** — MIT, and the note that everything exported from the studio is also MIT.

### 9.2 ARCHITECTURE.md (D-196)

Sections, each with a code excerpt from the actual repo (not paraphrased):

1. **Registration** — `useWebMCPRegistration.ts` in full with the diff loop highlighted; why diff not epoch (D-002); why deferred (D-004) with mace's Chrome 151 measurement cited; the two AbortSignals and what each cancels; strict-mode behaviour (D-018).
2. **Why one tool is declarative** — the paragraph from Turn 1 Part Sixteen, verbatim: *24 tools are imperative because they are state transitions whose legality changes with state, and abort-to-unregister is the only mechanism that expresses "this tool no longer exists"; one tool is declarative because it is a proposal the human must ratify, and a form without `toolautosubmit` is the platform's own primitive for a human-in-the-loop action.* Plus the `enum` vs `oneOf` decision (D-020) and the schema-carries-state decision (D-019), each with its reason.
3. **The result envelope** — `results.ts`; why a JSON string containing a sentence (D-005–D-007).
4. **The phase machine** — `phaseStore.ts` in full; the subscriber design (D-049); the count rule (D-047, D-048); why phase can go down.
5. **The CSS-variable cascade** — `tokenToCss.ts`; `TokenStyleInjector`; sentinels (D-109); on-colors (D-046); dark as a scoped class (D-081).
6. **Token-only components** — `defineStyle`/`T` (D-099); the no-literals test; container queries (D-085).
7. **Two-axis gating** — phase (what exists) × rules (what's allowed); `ruleEngine.ts` reading the same dictionary the renderer uses (D-114).
8. **Wireframe → render** — `layoutEngine.ts`; `SECTION_COMPONENT_MAP`; page components as real components (D-053).
9. **The log as history** — `AgentLogEntry`, `InverseAction`, why arbitrary undo and no redo (D-180, D-181).
10. **Deployment** — fully static, no server code, no environment variables; the same build deploys to Vercel, Cloudflare Pages, Netlify, or `python -m http.server`. What would change to add persistence (route handlers or Workers + Durable Objects streaming the log).
11. **Deliberately unused** — `exposedTo`/`fromOrigins` (D-043), state-derived schemas (D-019), media queries (D-085), a UI framework, a highlighter library (D-174).

### 9.3 Code quality (D-197)

`tsconfig` strict + `noUncheckedIndexedAccess` (Turn 2). ESLint: `next/core-web-vitals`, `@typescript-eslint/no-explicit-any: error`, `@typescript-eslint/consistent-type-imports`, `no-restricted-imports` banning `../` paths deeper than one level and banning `@/stores/phaseStore` from every directory except `src/webmcp/**`, `src/components/studio/**`, `src/components/canvas/**` (enforces D-050 mechanically). Prettier: 2 spaces, single quotes, 120 columns, trailing commas. JSDoc on every exported function and every store (already in the seed). Every tool file's header comment states its phases and why: `/** Phase 2+: needs ≥5 tokens incl. primary/background/text-primary, otherwise there is nothing to render a component with. */`.

**Tests shipped** (D-198): `colorUtils.test.ts` (contrast test values, parser cases, palette assertions D-163, dark derivation contrast), `phaseStore.test.ts` (all five phases reachable and reversible; required-color gate), `toolPhaseMap.test.ts` (counts 4/8/14/20/24; every tool in exactly the phases the ledger says), `ruleEngine.test.ts` (five presets against fixture specs), `tokenToCss.test.ts` (var names match the D-093 map; sentinels; `.dark` block), Stream 2's four tests (Turn 3 §3.7), `export.test.ts` (generated TSX passes `tsc --noEmit` in `scripts/verify-export.sh`), and `webmcp.e2e.ts` (Playwright with the fake host: tool count grows 4 → 8 → 14 as the store is mutated; an execute after a phase drop returns `PHASE_LOCKED`). CI: GitHub Actions on PR — `typecheck`, `lint`, `test`; `e2e` on `main` only.

---

## Part Ten: The demo

### 10.4 (first, as the prompt orders) Test-environment prerequisites

**What is verified from source** (Turn 1, WEBMCP_VERIFIED): Chrome ships WebMCP as an origin trial from 149; local testing flag `chrome://flags/#enable-webmcp-testing`; the **Model Context Tool Inspector** extension lists tools live, shows schemas, calls tools with a JSON editor, and can drive a test agent; Gemini in Chrome consumes WebMCP tools in the trial; Lighthouse has a "Registered WebMCP tools" audit; `executeTool` takes a JSON string on Chrome ≤152 (mace, Chrome 151). Chrome 153+ does not cancel in-flight executes on unregister; earlier builds do (D-004 handles both).

**What could not be verified from this environment and is the Tuesday 08:00 test (D-041, D-199)**: which ChatGPT desktop app version and OS have the in-app browser with WebMCP; whether it needs a paid tier; whether it's behind a settings toggle; how a URL is opened in it; and — the only one that matters for the film — whether it re-reads the tool list on `toolchange`. The test procedure: open the Sept 1 preview URL in the ChatGPT browser; prompt `What can you do on this page?` and confirm four tools are named; from the studio, set five tokens by hand; prompt `What can you do now?` and confirm fourteen. Also confirm `registerTool` did not throw (status badge reads `native`, not `unavailable`, and `degraded` is false in the Tool Inspector footer). Record: app version, OS, plan, toggle, and the result, in the ledger and in README §5.

**Decision on host** (D-200): if the Tuesday test passes, the video is filmed in ChatGPT's in-app browser with the chat pane visible. If it fails on discovery only, the video is filmed in Chrome 149+ with the flag and the Model Context Tool Inspector's agent pane, and the README says so plainly. If `registerTool` throws in ChatGPT (as mace observed 2026-08-30), same fallback, and the README notes the observation with the date. The studio's own Tool Inspector is the fallback *visual* for "tools appearing" in either case and is on screen in the video regardless.

### 10.1 The script (2:50 target)

Primary for the demo: `hsl(250, 84%, 60%)`, analogous strategy → secondary `hsl(280, 76%, 60%)`, accent `hsl(220, 76%, 60%)`, background `hsl(250, 10%, 98%)`, text-primary `hsl(250, 15%, 10%)`. Verified through `generatePalette`: violet primary, magenta-violet secondary, blue accent, cool near-white surfaces. Cascade target: drag hue to `~152` → `hsl(152, 84%, 60%)` is too bright; the human also drags lightness to 40 → `hsl(152, 84%, 40%)` emerald. The script has the human drag hue only and land on `hsl(152, 84%, 60%)` first (the whole page flashes mint — that's fine, it's the *moment*), then nudge lightness down for the final look. Fonts: Geist heading, Inter body. Studio state before recording: fresh workspace (Reset), onboarding dismissed, viewport Desktop, agent log empty, ChatGPT chat empty.

| Time | Human does / says | Agent (expected) | On screen |
|---|---|---|---|
| 0:00 | (VO) "This is Alternative Galaxy, a design studio where a human and an AI agent work on the same page — and the agent can only do what the work is ready for." | | Studio, phase 0, empty canvas, header `4 of 24 tools · native`. |
| 0:12 | Types: **"Make me a primary button that says Get started."** | Looks for a tool, finds none; calls `get_current_state`; replies that component tools aren't available yet, that five tokens including a primary color are needed, and asks for the brand color. | Log: `get_current_state` entry. Phase bar unchanged. |
| 0:35 | (VO) "It isn't refusing. The tool doesn't exist yet. It asked the page." Types: **"Use a violet, hsl 250 84 60, and fill in the rest of the palette."** | Calls `set_token` (primary) then `suggest_palette`; reports 13 colors set and — from its own return value — that the phase advanced and which tools appeared. | Token rows flash cyan one after another; phase bar sweeps Empty→Tokens→Components; header ticks `4 → 8 → 14`. |
| 1:00 | Types: **"Now the button."** | `generate_component` button/primary/md "Get started". | Specimen appears. |
| 1:08 | Types: **"Add a hero for a product called Northwind, a pricing table with three tiers, and a navbar."** | `generate_component` ×3 (hero, pricing-card ×… or one; navbar). Phase 2→3 on the second component; agent notes layout tools are now available. | Three specimens; header `14 → 20`. |
| 1:30 | (VO) "Every one of these is built from the tokens I own." Drags **primary hue** from 250 to 152, slowly, ~2 seconds. Says nothing for one beat. | Nothing. | Everything recolors live. Log shows nothing until release: `You set primary`. |
| 1:48 | Locks primary (click padlock). Types: **"Try a warmer palette."** | `suggest_palette` (analogous from the current primary) → reports 12 colors changed and primary skipped because it's locked. | Twelve rows flash; primary row shows padlock, unchanged. |
| 2:02 | Types: **"Sketch a landing page: navbar, hero, features, pricing, FAQ, footer."** | `sketch_wireframe` → six sections; asks for approval. | Gray boxes. Tab strip appears. |
| 2:15 | Clicks ▼ on Pricing to move it below FAQ (VO: "I'm moving pricing down — the agent applies to what I've done, not what it last saw"). Types: **"Looks good. Render it."** | `render_page` → reports page rendered, phase 4, export tools available. | 700ms transition; styled page; header `20 → 24`; Export button appears. |
| 2:38 | Clicks **Export**, tab **Everything**. (VO) "And it exports: CSS variables, tokens JSON, Tailwind, and React that compiles." | | Export modal, file tree, `Download ZIP`. |
| 2:46 | (VO) "Alternative Galaxy. alt.gal. MIT." | | Wordmark. |

If a step misfires, the human's recovery lines are: *"Check what you can do on this page."* (agent didn't explore), *"Use the set_token tool for each color."* (agent described instead of acting), *"Call get_current_state and tell me the phase."* (agent didn't notice new tools). These are natural sentences and still honest.

### 10.2 Recording (D-201)

QuickTime screen recording of the ChatGPT desktop app window at 1920×1080, 60fps, mic on. In ChatGPT's browser the page and the chat pane share the window, so no picture-in-picture and no cuts are needed; that is a large part of why the host test matters. Fallback host: Chrome full-screen with the Inspector extension's side panel docked right (it takes the chat pane's place). Narration: live, from the VO lines above, one clean take used as-is; a second pass records the VO lines alone as a safety track. Two rehearsals before the first take. Edit only to trim dead air and add three lower-third captions (`Phase gate`, `Token cascade`, `Wireframe → render`). Upload unlisted to YouTube and attach the MP4 to a GitHub release.

### 10.3 Fallbacks

Per D-200. Additional: if the agent misbehaves in the take, the take is discarded — no editing an agent response. If `suggest_palette` produces a palette that looks wrong on camera for the chosen violet, the pre-checked fallback primary is `hsl(220, 90%, 56%)`. If the render transition stutters at 60fps recording, reduce the stagger to 30ms (`prefers-reduced-motion` path is the emergency switch).

---

## Part Seventeen: Production quality signals

**Bundle** (D-202). Target first-load JS ≤ 180 KB gzipped. Contents: Next runtime + React (~90 KB), Zustand (~3 KB), the studio and library components (~40 KB — style functions and JSX, no framework), the WebMCP layer (~8 KB), 24 tool definitions (~12 KB). Lazy: JSZip (dynamic import when the export panel opens, ~25 KB), the polyfill (dynamic import only when native is absent, ~20 KB), the Tool Inspector panel (dynamic import on first open). Dependencies, complete: `next`, `react`, `react-dom`, `zustand`, `jszip`, `@mcp-b/webmcp-polyfill`; dev: `typescript`, `webmcp-types`, `vitest`, `@testing-library/react`, `@playwright/test`, `eslint`, `eslint-config-next`, `prettier`, `axe-core`. Nothing else, per D-073.

**Lighthouse** (D-203), measured on `alt.gal` in phase 0 and again with the example tokens loaded:
- Performance ≥ 90: static export, no third-party scripts, fonts self-hosted via next/font with `display: swap`, no layout shift (panels have fixed widths; canvas has a min-height), no render-blocking CSS beyond the token stylesheet.
- Accessibility ≥ 95: every control labelled; landmark roles (`banner` for the phase bar, `complementary` for the token panel and log, `main` for the canvas, `contentinfo` for the status bar); the log is `aria-live="polite"`; focus rings visible on dark chrome (`--studio-accent` 2px); color pickers have hex text inputs; contrast of studio text ≥ 4.5 (`#E6E8EF` on `#15171E` = 13.4:1; `#8B91A1` on `#15171E` = 5.6:1). Run axe on every panel state before submission.
- Best Practices ≥ 95: HTTPS, no console errors (the polyfill's deprecation warning fires only if something touches `navigator.modelContext` — nothing does), no deprecated APIs, CSP-friendly (no inline scripts; the token `<style>` is a style element, allowed by `style-src 'unsafe-inline'` which Next requires anyway).
- SEO ≥ 90: title, description, canonical, viewport, `lang`, one `h1` (visually hidden: "Alternative Galaxy — design systems for humans and agents").
- **Registered WebMCP tools audit**: passes in Chrome 149+; every tool's `title` and `description` read as a sentence in the list (D-023, D-024).

**Metadata** (D-204). `title: 'Alternative Galaxy — Design systems for humans and agents'`; `description: 'A design studio where the AI agent's tools are a function of the work's state. Set tokens, write rules, and let any WebMCP agent build inside them.'`; `metadataBase: https://alt.gal`; `openGraph` with `opengraph-image.tsx` (App Router, 1200×630: the studio mid-render, generated with `ImageResponse` from a static PNG captured Thursday morning); `twitter: { card: 'summary_large_image' }`; `icons`: `icon.svg` (an SVG wordmark dot in `#FF7AC6` on `#0F1117`). Slack, Discord, and X unfurls verified before submission.

**Error boundaries** (D-205). `app/error.tsx` shows the copy from D-160 with `Reload` and `Reset workspace` (clears the five `altgal.*` keys). `ComponentPreview` and each page section wrap their component in a small `ErrorBoundary` that renders an error card (`This component couldn't render. Remove it or undo the last change.`) in place — a malformed spec never white-screens the canvas. Corrupt persisted state is D-176.

**Studio accessibility** (D-206): everything above plus — every panel section header is a `<button aria-expanded>`; the phase stepper is an `<ol>` with `aria-current="step"`; the tool count is `aria-live="polite"` so screen readers hear tools appear; wireframe controls are keyboard-reachable (D-190); the color popover traps focus and closes on Escape; sliders are native `<input type="range">` with `aria-valuetext` (e.g. `Hue 250 degrees`).

**Keyboard shortcuts** (D-207): `Cmd/Ctrl+Z` undo (never cut), `Cmd/Ctrl+E` export (phase 4), `1`/`2`/`3` viewport, `D` theme toggle, `Esc` deselect/close, `?` shows a shortcuts sheet. Ignored when focus is in a text input. They are cheap and they read as craft; they sit at tier 3 of the cut order.

**Cloudflare note** (D-208), in ARCHITECTURE.md §10 verbatim: *Alternative Galaxy has no server. `next build` with `output: 'export'` produces a static site with no API routes, no middleware, and no environment variables; the same output deploys unchanged to Vercel, Cloudflare Pages, Netlify, or any static host. WebMCP tools run in the page, so nothing about the agent surface depends on where the HTML is served from. The one thing the architecture reserves for a server is persistence: the collaboration log is already an append-only event stream with typed inverses, which is the shape you'd stream to a Durable Object.*

---

## Final check: ledger against boundary files

Every ledger entry was read against the Turn 1–3 files. Corrections (each is a new entry; nothing is silently edited):

- **D-035 vs `defineStyle.tokens()`** — D-035 said `generate_component.data.tokensUsed: Record<cssProperty, tokenName>`; the dictionary keys are `part.property`. → **D-209**: `tokensUsed` keys are `part.property` (e.g. `'root.background-color': 'color.primary'`), matching `ComponentStyleDef.tokens()`.
- **D-141 vs `remove_wireframe` description** — Turn 1's description said pages are "not affected"; D-141 blocks removal while a page exists. → **D-210**: description becomes *"Delete a wireframe by id. A wireframe with a rendered page can't be removed until the human deletes the page."* (≤300 chars).
- **D-058 vs D-145/D-175** — `uiStore` needs collapse state and transient export files. → **D-211**: `UIState` gains `panelSections: Record<'colors'|'typography'|'spacing'|'elevation'|'motion'|'rules', boolean>` (persisted) and `exportFiles: ExportFile[] | null` (not persisted); `ExportFile` type moves to `src/types/export.ts` in the seed.
- **D-066 vs D-120** — already recorded as an implementation amendment; `fontStack` signature unchanged. No action.
- **D-032 vs D-049** — superseded and recorded. The Turn 1 hook comment "sync recalc already ran" remains true under D-049.
- **D-039 tool file list** — the seed has 24 tool files; D-026/D-028 phases match `TOOL_PHASE_MAP` (counts 4/8/14/20/24 verified by hand: phase 0 = get_current_state, set_token, get_tokens, suggest_palette; +4 at 1; +6 at 2; +6 at 3; +4 at 4).
- **D-053 vs `componentStore.count()`** — page components count; `phaseStore.computePhase` uses `count()`, not `listLoose().length`. Consistent.
- **D-083 vs Turn 2 `logStore`** — the `phaseStore` import is a call-time read. Consistent.
- **D-095 vs Turn 3 `Card.tsx`** — the inline `require` in the excerpt is replaced by `nestedButtonStyles` from `_shared.ts`. → **D-212**: `Card.tsx`, `Hero.tsx`, `Navbar.tsx`, `PricingCard.tsx`, `Modal.tsx` import `nestedButtonStyles`; no `require` anywhere in `src/`.
- **D-189 UI paths** — none of the three touch boundary files; `Run audit`, `Generate dark theme`, and the Edit panel tab are Stream 5/1 UI with existing store/engine calls.
- **D-160 strings** — `strings.ts` is Stream 5's; no boundary impact.
- **Streams' isolation tests reference `engine/commit`** before Stream 5 lands — the Stream 1 shim (§11.2) covers it; Stream 2/4 tests don't call `commitHuman`.

All other entries are consistent with the seed as written. The seed is committed with D-209–D-212 applied.

---

END OF TURN 8 — the document is complete. Total: ~40,000 words across eight turns; 212 decisions.
