# Architecture

Alternative Galaxy is a static Next.js app with no server. Everything below runs in the page.

The module graph is strictly acyclic and enforced by ESLint (D-050, D-197):

```
types ← utils ← engine ← stores ← webmcp ← components
```

`phaseStore` is the only store that imports other stores. Everything else reads a foreign store
through `useXStore.getState()` inside a function, never at module top level.

---

## 1. Registration

Tools are registered imperatively on `document.modelContext` and kept in sync by a **diff**, not by
an epoch reset (D-002). On a phase change the hook computes the `want` set from `TOOL_PHASE_MAP`,
aborts only the tools that are no longer valid, registers only the ones that have become valid, and
touches everything in between not at all — so a tool that is legal in both phases never flickers and
never fires a spurious `toolchange`.

```ts
// src/webmcp/useWebMCPRegistration.ts
const sync = async () => {
  const phase = usePhaseStore.getState().currentPhase;
  const want = new Set<ToolName>(toolsForPhase(phase));
  const have = new Set<ToolName>(registered.keys());

  for (const name of have) {
    if (!want.has(name)) {
      registered.get(name)!.abort();
      registered.delete(name);
    } // abort-to-unregister
  }
  for (const name of want) {
    if (have.has(name)) continue;
    const ctl = new AbortController();
    registered.set(name, ctl); // set before await (mace)
    try {
      await ctx.registerTool(wrapTool(TOOL_DEFINITIONS[name]), {
        signal: AbortSignal.any([ctl.signal, epoch.signal]), // D-003
      });
    } catch (e) {
      registered.delete(name);
      if (!isAbortError(e)) status.markDegraded(name, e); // D-015
    }
    if (epoch.signal.aborted) return; // D-018
  }
  await refreshCount();
};
```

**Two signals, two lifetimes** (D-003). Each tool owns an `AbortController` that unregisters exactly
that tool when the diff drops it. One epoch controller unregisters everything at once, and aborts
only on unmount or a full reset. `AbortSignal.any([tool, epoch])` composes them, so a tool dies when
either its own removal or the whole registration is cancelled.

**Sync is deferred to the next macrotask and coalesced** (D-004):

```ts
const scheduleSync = () => {
  if (syncQueuedRef.current) return;
  syncQueuedRef.current = true;
  setTimeout(() => {
    syncQueuedRef.current = false;
    if (!epoch.signal.aborted) void sync();
  }, 0);
};
```

This is not a performance tweak. On Chrome 149–152, aborting a registration cancels an execute that
is still in flight (measured by mace on Chrome 151, 2026-08-29). A tool whose own call advances the
phase would otherwise cancel itself mid-answer. Deferring to a macrotask lets the execute return
first; the sync that follows sees the new phase and registers the tools the agent just earned.

**Strict mode.** One `useEffect(…, [])`; the cleanup aborts the epoch and clears the registered map;
every `await` in the loop is followed by an `epoch.signal.aborted` check; `AbortError` rejections
from `registerTool` are swallowed rather than reported as degradation (D-018).

**The count is read back, never tracked.** `getTools()` inside a `toolchange` listener is the only
source for `useWebMCPStatusStore.toolCount` (D-016). The number in the phase bar is the browser's
answer, which is what makes it worth showing.

---

## 2. Why exactly one tool is declarative

> 24 tools are imperative because they are state transitions whose legality changes with state, and
> abort-to-unregister is the only mechanism that expresses "this tool no longer exists"; one tool is
> declarative because it is a proposal the human must ratify, and a form without `toolautosubmit` is
> the platform's own primitive for a human-in-the-loop action.

That tool is `set_primary_color`: a `<form toolname="set_primary_color">` in the token panel with no
`toolautosubmit` (D-029). The agent fills it; only the human clicks Apply. It is the path by which
the _first_ token — the one that moves the work out of phase 0 — is human-ratified. Its submit
handler returns the same envelope the imperative tools return (D-030).

**Enums, not `oneOf`** (D-020). Chrome's docs recommend `oneOf`/`const`/`title` for readable labels.
We use a plain JSON Schema `enum` array with the labels in the property `description`, because
OpenAI's strict function-calling mode rejects `oneOf` — and the agent we most want to serve is the
one in ChatGPT's browser. Both mace and shipwright made the same call.

**Schemas do not carry state** (D-019). No component-ID enums. IDs are `string` inputs validated at
execute; a bad id returns `NOT_FOUND` with the current valid ids in `alternatives`. State-derived
schemas would mean re-registering tools on every mutation, and every re-registration fires
`toolchange` — which would bury the one signal the product is actually about (the phase changed)
under a stream of noise. This is the one idea from mace we deliberately did not take.

---

## 3. The result envelope

Every execute returns `JSON.stringify(ToolResult)` — never a bare string, never an object, never an
MCP content array (D-005). Tool authors never build the envelope; they return a `ToolOutcome` and
the registration wrapper does the rest (D-007).

```ts
// src/webmcp/results.ts
export function toResult(outcome: ToolOutcome, phaseBefore: Phase, phaseAfter: Phase): ToolResult {
  if (outcome.kind === 'error') {
    return { ok: false, phase: phaseAfter, code: outcome.code, error: outcome.message, ... };
  }
  const before = new Set(toolsForPhase(phaseBefore));
  const after = new Set(toolsForPhase(phaseAfter));
  const newTools = [...after].filter((t) => !before.has(t));
  const removedTools = [...before].filter((t) => !after.has(t));
  ...
}
```

The envelope carries a self-describing `summary` sentence _and_ structure the agent demonstrably
uses: ids, `alternatives`, `newTools`, `removedTools`. The sentence is the idiom the Chrome docs
recommend; the structure is what lets an agent recover from a mistake without guessing. Both, in one
string.

Because the wrapper computes `newTools` from the phase before and after, an agent learns it has
gained capability **from its own return value** — which works even on a host that never re-reads the
tool list.

---

## 4. The phase machine

```ts
// src/stores/phaseStore.ts
export function computePhase(): Phase {
  const tokens = useTokenStore.getState();
  const components = useComponentStore.getState().count();
  const pages = useLayoutStore.getState().renderedPages.length;
  if (pages >= 1) return 4;
  if (components >= COMPONENTS_REQUIRED_FOR_PHASE_3) return 3;
  if (tokens.getDefinedTokenCount() >= TOKENS_REQUIRED_FOR_PHASE_2 && tokens.getMissingForPhase2().length === 0)
    return 2;
  if (tokens.getDefinedTokenCount() >= 1) return 1;
  return 0;
}
```

**Nobody calls `recalculatePhase()`** (D-049). `phaseStore` installs itself as a synchronous
subscriber on the token, component, and layout stores at module load:

```ts
if (typeof window !== 'undefined') {
  const recalc = () => usePhaseStore.getState().recalculatePhase();
  useTokenStore.subscribe(recalc);
  useComponentStore.subscribe(recalc);
  useLayoutStore.subscribe(recalc);
  recalc(); // after persisted state hydrates synchronously on first import
}
```

This is why a tool execute needs no mutex and no queue: by the time the mutation returns, the phase
is already correct, so the wrapper's `phaseAfter` read is accurate without an `await` anywhere in
between (D-032, amended by D-049).

**The count rule** (D-047): non-null colors, plus the number of non-color paths in
`TokenState.touched`. Defaults never count — otherwise a fresh page load would open in phase 1 with
sixty tokens it never chose.

**Phase can go down, and that is the point.** Delete tokens below the gate and the component tools
are aborted; the studio shows a neutral toast naming the paused group and deletes nothing (D-132,
D-154). A wireframe sketched in phase 3 survives a drop to 2 and a return to 3 unchanged. The phase
describes what is _legal_, never what exists.

---

## 5. The CSS-variable cascade

`tokenToCss(state)` is the single place the token store becomes CSS: a `:root` block with every
variable and a `.dark` block when a dark palette exists. `TokenStyleInjector` renders it into one
`<style id="alt-tokens">` from a store selector (D-108) — no `setProperty` calls, no debounce, no
per-component subscription. The human drags a hue and one string changes; the browser does the rest.

Three details make the cascade total:

- **Sentinels** (D-109). A null color emits a per-role grayscale value instead of nothing, so a
  component whose token was just deleted turns gray and stays legible. Deleting a referenced color
  is never blocked and never warned about.
- **Derived on-colors** (D-046). `--color-on-primary` and friends are computed from the role's
  lightness rather than stored, so a text color can never drift out of sync with the fill it sits on.
- **Dark is a scoped class** (D-081). The `dark` class goes on the canvas root, never on `<html>` or
  `<body>`. The studio chrome is dark _always_, on its own `--studio-*` palette, and must never
  inherit the user's theme; the user's dark mode has to be visible as a change inside a bounded light
  area, or the moment does not read.

---

## 6. Token-only components

Style declarations are authored once and produce two outputs — React inline styles and a token map —
from the same source (D-064, D-099):

```ts
// src/components/library/_shared.ts
export const T = (path: TokenPath, wrap?: (v: string) => string): Ref => ({ __t: path, wrap });

export function defineStyle<K extends ComponentType>(parts, build): ComponentStyleDef<K> {
  return {
    parts,
    styles: (spec) => /* Ref → `var(--name)` */,
    tokens: (spec) => /* Ref → { 'root.background-color': 'color.primary' } */,
  };
}
```

A component never writes a color, a pixel, or a fallback. `var(--x)` is always bare — null handling
lives in `tokenToCss`, once (D-065). No component interprets `sm`/`md`/`lg`; the dictionary is the
only place a size becomes a spacing token (D-087). Stream 2's isolation test greps every library file
for color literals and expects nothing.

The same `tokens()` output is what `explain_component` returns to the agent and what the exporter
uses to precompute styles, which is why "why does this look like this" has exactly one answer.

**Responsiveness is container queries, not media queries** (D-085). The canvas root declares
`container: canvas / inline-size`, and the viewport switcher just sets its width. A component at
375px in the studio behaves identically to that component at 375px in a real browser, because
nothing anywhere reads the window.

---

## 7. Two-axis gating

Phase answers _what exists_. Rules answer _what is allowed_. They are independent, and both are
enforced against the same style dictionary the renderer uses:

```ts
// src/engine/ruleEngine.ts
const current = resolveProperty(spec, property); // spec field, or STYLE_DICTIONARY[type].tokens(spec)['root.<prop>']
if (current === null) continue; // property not applicable to this type
const violated = test(operator, current, value);
```

A rule like _"no button smaller than 44px"_ resolves through `root.padding-block`,
`root.font-size`, and `root.line-height` — the exact tokens the button is drawn from — so a rule can
never disagree with what is on screen (D-114, D-166).

New generations that would violate a rule are rejected with `RULE_VIOLATION`, the rule's own words,
and the alternatives that would pass (D-116, D-118). Existing components that violate one are
flagged, never removed. Rules are human-owned and component-level; viewport-conditional and
page-aggregate rules are out of scope (D-117).

---

## 8. Wireframe → render

A wireframe is a list of typed sections. Rendering maps each section to registry components through
a fixed table (D-133, D-134):

```ts
// src/engine/layoutEngine.ts
export const SECTION_COMPONENT_MAP: SectionComponentMap = {
  navbar: { component: 'navbar', perColumn: false, defaultColumns: null },
  hero: { component: 'hero', perColumn: false, defaultColumns: null },
  features: { component: 'feature-grid', perColumn: false, defaultColumns: 3 },
  pricing: { component: 'pricing-card', perColumn: true, defaultColumns: 3 },
  testimonials: { component: 'card', perColumn: true, defaultColumns: 3 },
  cta: { component: 'hero', perColumn: false, defaultColumns: null },
  faq: { component: 'accordion', perColumn: false, defaultColumns: null },
  footer: { component: 'footer', perColumn: false, defaultColumns: null },
  content: { component: 'card', perColumn: false, defaultColumns: null },
  gallery: { component: 'block', perColumn: true, defaultColumns: 4 },
  stats: { component: 'block', perColumn: true, defaultColumns: 4 },
  team: { component: 'block', perColumn: true, defaultColumns: 4 },
};
```

The mapping is deliberately not agent-configurable. The agent shapes a page by modifying the
components the render produced, which it can do because **page components are real components**
(D-053): `render_page` writes actual `ComponentSpec`s into `componentStore` with `pageId` and
`sectionId` set. They count toward the phase, they are addressable by `modify_component` and
`remove_component`, and the human can click one on the page and edit it. A rendered page is a live
artifact, not a snapshot.

Removing a page component drops its id from the section; a section with none left renders a dashed
strip that says so, and the page and phase both survive (D-138). Deleting the page is the one human
action with no inverse — restoring N components with their original ids and relinking sections is
strictly worse than one Render click, and the confirm dialog says so (D-184).

---

## 9. The log as history

One list holds both parties' actions. Tools are logged by the registration wrapper; human UI
mutations are logged by `commitHuman`; stores never log (D-077).

```ts
// src/engine/commit.ts
export function commitHuman(action, mutate: () => InverseAction | null, input = {}): AgentLogEntry {
  const startedAt = Date.now();
  const inverse = mutate();
  return useLogStore.getState().addEntry({ actor: 'human', tool: `ui.${action}`, input, result: null, ... });
}
```

Every entry carries a typed `InverseAction` — a twelve-member discriminated union covering tokens,
components, wireframes, sections, pages, dark themes, and rules (D-061). `src/engine/undo.ts` is the
only code that executes one; tools _produce_ inverses and never apply them.

**Undo is arbitrary, with blocking** (D-180, D-182). Any entry in the log can be undone, not just the
last one; `Cmd+Z` undoes `lastUndoable()`. A few inverses can be legitimately impossible — the
component was already removed, the wireframe now has a rendered page — and those return a reason that
becomes a toast, changing nothing.

**There is no redo** (D-181). Undoing an undo is a second undo of the `ui.undo` entry, which is
already in the log. "The log is the history; anything in it can be reversed" is a simpler model than
a redo stack, and it is the right model for a record two parties are writing to at once.

The log persists (D-068), so undoing yesterday's agent change is an ordinary thing to do.

---

## 10. Deployment

> Alternative Galaxy has no server. `next build` with `output: 'export'` produces a static site with
> no API routes, no middleware, and no environment variables; the same output deploys unchanged to
> Vercel, Cloudflare Pages, Netlify, or any static host. WebMCP tools run in the page, so nothing
> about the agent surface depends on where the HTML is served from. The one thing the architecture
> reserves for a server is persistence: the collaboration log is already an append-only event stream
> with typed inverses, which is the shape you'd stream to a Durable Object.

The App Router earns its place through the metadata API and `opengraph-image.tsx` (both generated at
build time, hence `export const dynamic = 'force-static'`), `next/font` self-hosting with no layout
shift, and a server layout that keeps the WebMCP bridge off the client bundle's critical path.

State lives in six Zustand stores; five persist to `localStorage` under `altgal.<store>.v1` with a
`merge` that structurally validates what it reads and falls back to defaults with a toast (D-176).
There is no cross-tab sync: last write wins, and that is documented rather than hidden (D-179).

---

## 11. Deliberately unused

- **`exposedTo` and `fromOrigins`** (D-043). Single origin. There is nothing to scope, and shipping
  unused security surface is worse than shipping none.
- **State-derived schemas** (D-019). See §2 — rejected for a stated reason, not overlooked.
- **Media queries** in the component library (D-085). Container queries only, so the viewport
  switcher is honest.
- **A UI framework and a CSS framework.** The studio is the product's own argument for CSS custom
  properties; using Tailwind to build it would be strange.
- **A syntax highlighter** (D-174). The export preview uses a 40-line regex pass in
  `src/engine/export/highlight.ts`. It is a code viewer, not an editor.
- **A hook package for WebMCP** (D-012). `usewebmcp` and `use-webmcp-tool` are both one-tool-per-hook
  and hide the AbortController, which is the one thing this app needs to hold.
