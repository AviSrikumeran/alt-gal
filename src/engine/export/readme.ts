import type { ExportFile } from '@/types/export';
import type { ExportSnapshot } from '@/engine/export/snapshot';
import { googleFontsImport } from '@/engine/export/css';
import { pascal, typesPresent, slugify } from '@/engine/export/snapshot';

/** D-173: what's inside, how to install, fonts both ways, Tailwind, the DTCG note, active rules, MIT. */
export function exportReadme(snap: ExportSnapshot): ExportFile {
  const types = typesPresent(snap).sort();
  const families = [...new Set(Object.values(snap.tokens.typography.families))];
  const fontImport = googleFontsImport(families);
  const rules = snap.rules.filter((r) => r.enabled);

  const contents = `# ${snap.productName} — design system

Exported from [Alternative Galaxy](https://alt.gal) on ${new Date(snap.exportedAt).toISOString().slice(0, 10)}.

## What's inside

| Path | What it is |
|---|---|
| \`tokens/tokens.css\` | Every design token as a CSS custom property, plus the component state and responsive rules. |
| \`tokens/tokens.json\` | The same tokens in Design Tokens Community Group format. |
| \`tokens/tailwind.config.ts\` | A Tailwind theme whose every value points at one of those custom properties. |
| \`tokens/tokens.scss\` | Literal values as SCSS variables, for pipelines that need compile-time numbers. |
${types.length ? `| \`components/*.tsx\` | ${types.length} React component${types.length === 1 ? '' : 's'}: ${types.map(pascal).join(', ')}. |` : ''}
${snap.pages.length ? `| \`pages/*.tsx\` | ${snap.pages.length} composed page${snap.pages.length === 1 ? '' : 's'}. |` : ''}

## Install

\`\`\`bash
cp -r tokens components pages your-app/src/design-system
\`\`\`

Import the stylesheet once, as early as you can:

\`\`\`ts
import './design-system/tokens/tokens.css';
\`\`\`

The components are responsive through **container queries**, not media queries, so they adapt to the
box they are placed in rather than the window. Declare the container on whatever element wraps them:

\`\`\`css
.page-root {
  container: canvas / inline-size;
}
\`\`\`

Without that declaration the components render at their widest layout, which is a valid look — it
just never collapses.

## Fonts

\`tokens.css\` already carries a Google Fonts import:

\`\`\`css
${fontImport ?? '/* no catalog fonts in use */'}
\`\`\`

In Next.js, prefer self-hosting with \`next/font\` and delete that \`@import\` line:

\`\`\`ts
import { ${families.map((f) => f.replace(/[^A-Za-z0-9]/g, '_')).join(', ')} } from 'next/font/google';
\`\`\`

Then set \`--font-heading\`, \`--font-body\`, and \`--font-mono\` to the loaded \`style.fontFamily\` values.

## Tailwind

\`tailwind.config.ts\` maps every scale to a CSS variable, so Tailwind classes and raw \`var()\` usage
stay in sync and changing a token needs no rebuild of the config. It requires \`tokens.css\` to be
loaded. \`darkMode\` is \`['class']\`${snap.tokens.dark ? '; add the `dark` class to your page root to use the dark palette in `tokens.css`.' : ' — this export has no dark palette yet.'}

## A note on the DTCG file

\`tokens.json\` follows the Design Tokens Community Group draft as of the export date. Colors are
hex strings with the authored HSL under \`$extensions['gal.hsl']\` — the form Style Dictionary v4
consumes without configuration. If your tooling is strict about the draft's color *object* form,
convert on ingest; every value needed for that conversion is present.

## Rules that were active at export time

${
  rules.length
    ? rules.map((r) => `- ${r.description}`).join('\n')
    : '_No rules were active. Anything generated against these tokens was unconstrained beyond the tokens themselves._'
}

These were enforced on generation inside the studio: a component that would have broken one was
rejected rather than created. They are documented here so the constraint survives the handoff.

## License

MIT. Everything exported from Alternative Galaxy is yours, under the same terms as the studio.
`;
  return { path: 'README.md', contents, language: 'md' };
}

/** package.json stub (D-173). */
export function exportPackageJson(snap: ExportSnapshot): ExportFile {
  const pkg = {
    name: `${slugify(snap.productName)}-design-system`,
    version: '0.1.0',
    private: true,
    description: `Design tokens and components exported from Alternative Galaxy for ${snap.productName}.`,
    license: 'MIT',
    peerDependencies: { react: '>=18', 'react-dom': '>=18' },
    devDependencies: { tailwindcss: '^3.4.0' },
  };
  return { path: 'package.json', contents: JSON.stringify(pkg, null, 2) + '\n', language: 'json' };
}
