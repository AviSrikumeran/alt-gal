// @vitest-environment node
/**
 * D-256. `fontLoader.ts` cannot compute its own option values: next/font's SWC plugin rejects
 * anything but a written literal, so the thirteen `--font-<family>` names are spelled out by hand
 * rather than produced by `fontVar()`. That is a duplication of D-221's naming rule, and
 * `fontStack()` — which is how every canvas token reaches a loaded face — resolves through
 * exactly those names, so a typo would fail silently at runtime and nowhere else.
 *
 * The file is read as text: importing it would pull in `next/font/google`, which resolves to an
 * empty module outside the Next compiler (D-221).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FONT_CATALOG, fontVar } from '@/utils/fonts';

const source = readFileSync(fileURLToPath(new URL('../fontLoader.ts', import.meta.url)), 'utf8');
const all = (re: RegExp): string[] => [...source.matchAll(re)].map((m) => m[1] ?? '');

describe('fontLoader.ts', () => {
  it('declares every catalog family, in catalog order', () => {
    const declared = all(/^  '?([A-Za-z0-9 ]+?)'?: [a-zA-Z0-9]+,$/gm);
    expect(declared).toEqual(FONT_CATALOG.map((f) => f.family));
  });

  it('spells each CSS variable exactly as fontVar() would build it (D-221)', () => {
    expect(all(/variable: '(--[a-z0-9-]+)'/g)).toEqual(FONT_CATALOG.map((f) => fontVar(f.family)));
  });

  it('loads the weights the catalog advertises', () => {
    const weights = all(/weight: \[([^\]]+)\]/g).map((list) => list.match(/\d+/g)!.map(Number));
    expect(weights).toEqual(FONT_CATALOG.map((f) => f.weights));
  });

  it('assigns every loader call to its own module-scope const, as the SWC plugin requires', () => {
    // The shape that broke the production build: loader calls nested in an object literal.
    expect(source).not.toMatch(/^ +'?[A-Za-z0-9 ]+'?: [A-Z][A-Za-z0-9_]*\(\{/m);
    expect(all(/^const ([a-zA-Z0-9]+) = [A-Z][A-Za-z0-9_]*\(\{$/gm)).toHaveLength(FONT_CATALOG.length);
  });
});
