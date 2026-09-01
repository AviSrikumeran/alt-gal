import type { ExportFile } from '@/types/export';
import type { SemanticColorRole } from '@/types/tokens';
import { SEMANTIC_COLOR_ROLES } from '@/types/tokens';
import { parseColor, toHex } from '@/utils/colorUtils';
import { publicFontStack } from '@/engine/export/css';
import type { ExportSnapshot } from '@/engine/export/snapshot';

/**
 * D-168. Design Tokens Community Group format, written from the 2024–25 editors' draft.
 * Colors carry a hex `$value` (the form Style Dictionary v4 consumes without configuration) and
 * the original HSL under `$extensions['gal.hsl']`. The root `$description` says so, because the
 * draft's color-object form was not reachable to verify at build time.
 */
const ROOT_DESCRIPTION =
  'DTCG-format export from Alternative Galaxy. Colors are hex strings with the authored HSL under ' +
  "$extensions['gal.hsl']. Verify against the current spec at design-tokens.github.io if your tooling " +
  'is strict about the color object form.';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const dimension = (value: number, unit: 'px' = 'px'): Json => ({
  $type: 'dimension',
  $value: { value, unit },
});

const NAMED_EASINGS: Record<string, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};

/** `cubic-bezier(.4,0,.2,1)` or a keyword → the four control points the DTCG draft wants. */
export function toCubicBezier(value: string): [number, number, number, number] {
  const named = NAMED_EASINGS[value.trim()];
  if (named) return named;
  const m = /cubic-bezier\(([^)]+)\)/i.exec(value);
  if (m) {
    const parts = m[1]!.split(',').map((n) => Number(n.trim()));
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n)))
      return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
  }
  return NAMED_EASINGS['ease']!;
}

/** Splits a box-shadow list on top-level commas (inside `rgba(…)` commas are not separators). */
export function splitShadows(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of value) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(current.trim());
      current = '';
    } else current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/** `0 4px 6px -1px rgba(0,0,0,0.1)` → a DTCG shadow object. */
export function toShadowObject(shadow: string): Json {
  const colorMatch = /(rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]{3,8})\s*$/i.exec(shadow);
  const color = colorMatch ? colorMatch[1]! : 'rgba(0, 0, 0, 0.1)';
  const lengths = shadow
    .slice(0, colorMatch ? colorMatch.index : undefined)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => parseFloat(n) || 0);
  return {
    offsetX: { value: lengths[0] ?? 0, unit: 'px' },
    offsetY: { value: lengths[1] ?? 0, unit: 'px' },
    blur: { value: lengths[2] ?? 0, unit: 'px' },
    spread: { value: lengths[3] ?? 0, unit: 'px' },
    color,
  };
}

function colorToken(role: SemanticColorRole, value: string | null): Json | null {
  if (!value) return null;
  const hsl = parseColor(value);
  const token: { [k: string]: Json } = {
    $type: 'color',
    $value: hsl ? toHex(hsl) : value,
    $description: `Semantic role: ${role}`,
  };
  if (hsl) token.$extensions = { 'gal.hsl': value };
  return token;
}

/** `tokens.json` — the whole system in DTCG form. */
export function exportDtcg(snap: ExportSnapshot): ExportFile {
  const t = snap.tokens;

  const color: { [k: string]: Json } = {};
  for (const role of SEMANTIC_COLOR_ROLES) {
    const token = colorToken(role, t.colors[role]);
    if (token) color[role] = token;
  }
  if (t.dark) {
    const dark: { [k: string]: Json } = {};
    for (const role of SEMANTIC_COLOR_ROLES) {
      const token = colorToken(role, t.dark[role]);
      if (token) dark[role] = token;
    }
    if (Object.keys(dark).length) color.dark = { $description: 'Dark theme overrides', ...dark };
  }

  const font: { [k: string]: Json } = {};
  for (const [key, family] of Object.entries(t.typography.families))
    font[key] = {
      $type: 'fontFamily',
      $value: publicFontStack(family)
        .split(',')
        .map((s) => s.trim().replace(/^'|'$/g, '')),
    };

  const fontSize: { [k: string]: Json } = {};
  for (const [key, px] of Object.entries(t.typography.scale)) fontSize[key] = dimension(px);

  const fontWeight: { [k: string]: Json } = {};
  for (const [key, w] of Object.entries(t.typography.weights)) fontWeight[key] = { $type: 'fontWeight', $value: w };

  const lineHeight: { [k: string]: Json } = {};
  for (const [key, n] of Object.entries(t.typography.lineHeights)) lineHeight[key] = { $type: 'number', $value: n };

  const spacing: { [k: string]: Json } = { unit: dimension(t.spacing.unit) };
  for (const step of t.spacing.scale) spacing[String(step)] = dimension(t.spacing.unit * step);

  const radius: { [k: string]: Json } = {};
  for (const [key, px] of Object.entries(t.radius)) radius[key] = dimension(px);

  const elevation: { [k: string]: Json } = {};
  for (const [key, value] of Object.entries(t.elevation)) {
    if (value === 'none') {
      elevation[key] = {
        $type: 'shadow',
        $value: {
          offsetX: { value: 0, unit: 'px' },
          offsetY: { value: 0, unit: 'px' },
          blur: { value: 0, unit: 'px' },
          spread: { value: 0, unit: 'px' },
          color: 'transparent',
        },
      };
      continue;
    }
    const shadows = splitShadows(value).map(toShadowObject);
    elevation[key] = { $type: 'shadow', $value: shadows.length === 1 ? shadows[0]! : shadows };
  }

  const animation: { [k: string]: Json } = {};
  for (const [key, value] of Object.entries(t.animation)) {
    if (typeof value === 'number') animation[key] = { $type: 'duration', $value: { value, unit: 'ms' } };
    else animation[key] = { $type: 'cubicBezier', $value: toCubicBezier(value) };
  }

  const doc: { [k: string]: Json } = {
    $description: ROOT_DESCRIPTION,
    color,
    font,
    fontSize,
    fontWeight,
    lineHeight,
    spacing,
    radius,
    elevation,
    animation,
  };

  return { path: 'tokens/tokens.json', contents: JSON.stringify(doc, null, 2) + '\n', language: 'json' };
}
