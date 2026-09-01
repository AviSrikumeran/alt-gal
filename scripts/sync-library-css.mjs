#!/usr/bin/env node
/**
 * Regenerates src/engine/export/libraryCss.ts from src/components/library/library.css.
 * The exporter ships library.css verbatim inside tokens.css (D-167), and Next has no `?raw`
 * import, so the file is inlined as a constant. `export.test.ts` fails if the two drift.
 *
 *   node scripts/sync-library-css.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const src = fileURLToPath(new URL('src/components/library/library.css', root));
const out = fileURLToPath(new URL('src/engine/export/libraryCss.ts', root));

const css = readFileSync(src, 'utf8');
const escaped = css.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

writeFileSync(
  out,
  `/**
 * GENERATED — do not edit. Run \`node scripts/sync-library-css.mjs\` after changing
 * src/components/library/library.css. Shipped verbatim inside the CSS export (D-167).
 */
export const LIBRARY_CSS = \`${escaped}\`;
`,
);
console.log(`wrote ${out} (${css.length} bytes)`);
