# alt-gal-docs — everything for the Alternative Galaxy build

Generated Aug 31, 2026. Hand this whole folder to every Claude instance working a stream.

## Files

| File | What it is | Who reads it |
|---|---|---|
| `ALT_GAL_IMPLEMENTATION.md` | The full spec, 8 turns, ~39k words. Turns 1–3 are the seed commit (paste them). Turns 4–6 are per-stream detail. Turn 7 is submission copy + schedule. Turn 8 is README/ARCHITECTURE outline, demo script, production checklist. | Everyone. Each stream reads its §11.2 row first. |
| `DECISIONS_LEDGER.md` | 212 numbered decisions. Wins over prose if they ever disagree. Any change to `src/types/**` or a store interface needs a new entry here. | Everyone, before writing any code. |
| `reference/mace_webmcp.js` | mace's registration module — the diff pattern, deferred sync, Chrome 151 measurements. Read, don't copy. | Stream 3 |
| `reference/mace_declarative.js` | mace's declarative form handling (`toolname` add/remove, `respondWith`). | Stream 1 (PrimaryColorForm) |
| `reference/shipwright_useWebMcp.ts` | shipwright's hook — strict-mode lifecycle, schema style, invocation logging. | Stream 3 |
| `reference/shipwright_fake_modelContext.js` | 20-line fake `document.modelContext` for Playwright. Copy into `src/webmcp/__tests__/fixtures/`. | Stream 3 |
| `reference/webmcp-types-0.1.5.d.ts` | The official typings, as published. What `registerTool`/`execute`/`getTools` actually look like. | Streams 3, 5 |
| `reference/webmcp-declarative.d.ts` | Chrome's JSX attribute typings. Copy verbatim to `src/types/`. | Stream 1 |

## Tonight (Aug 31) — from §23.2

1. `pnpm create next-app@latest alt-gal` — TypeScript, App Router, `src/`, `@/*`, ESLint, **no** Tailwind.
2. `pnpm add zustand jszip @mcp-b/webmcp-polyfill@5.1.0 && pnpm add -D webmcp-types@0.1.5 vitest @testing-library/react @playwright/test prettier`
3. Paste every file under "Boundary files" (Turn 2) and Part Three (Turn 3). Apply D-209–D-212. Add `src/types/export.ts` (D-211).
4. `pnpm typecheck` clean → commit `seed` → push → connect Vercel → preview URL.
5. **Point alt.gal DNS at Vercel now** (D-191).
6. Brief 5 instances: this folder + "you are Stream N, read §11.2 row N, then Turns X" (1→T4, 2→T3, 3→T1, 4→T5, 5→T5+T6).

## Tuesday 08:00 CT — the blocker test (D-041, D-199)

Open the preview URL in ChatGPT's in-app browser. Ask "What can you do on this page?" → expect 4 tools. Set 5 tokens by hand. Ask again → expect 14. If it fails, the video is Chrome + Model Context Tool Inspector, decided Tuesday, not Thursday.
