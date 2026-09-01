import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPONENT_SIZES, COMPONENT_TYPES, COMPONENT_VARIANTS } from '@/types/components';
import { STYLE_DICTIONARY } from '@/engine/componentRenderer';
import type { ComponentStyleDef } from '@/engine/componentRenderer';
import { FIXTURE_VARS, fixtureSpec } from './fixtures/vars';

/**
 * §3.7 test 1 (D-065). The style dictionary is the only place `sm/md/lg` and variants are interpreted, and it
 * must reach every value through a token var — no colour literals, no computed pixels.
 */

const LIBRARY_DIR = path.join(process.cwd(), 'src/components/library');

/** Everything a declaration is allowed to reference: the D-093 var map plus the six derived on-colors. */
const ALLOWED_VARS = new Set(Object.keys(FIXTURE_VARS));

/** Strips `var(--x)` and `color-mix(in srgb, …)` wrappers so only bare literals are left behind. */
function stripVarRefs(value: string): string {
  return value.replace(/var\(\s*--[a-z0-9-]+\s*\)/gi, '').replace(/color-mix\(|in srgb,?/gi, '');
}

function varsIn(value: string): string[] {
  return [...value.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/gi)].map((m) => m[1] as string);
}

/** Every (type, variant, size) combination, flattened to `type.part.property -> value` entries. */
function everyDeclaration(): { where: string; value: string }[] {
  const out: { where: string; value: string }[] = [];
  for (const type of COMPONENT_TYPES) {
    for (const variant of COMPONENT_VARIANTS) {
      for (const size of COMPONENT_SIZES) {
        const def = STYLE_DICTIONARY[type] as ComponentStyleDef;
        const styles = def.styles(fixtureSpec(type, variant, size));
        for (const [part, decl] of Object.entries(styles))
          for (const [property, value] of Object.entries(decl))
            out.push({ where: `${type}[${variant}/${size}].${part}.${property}`, value: String(value) });
      }
    }
  }
  return out;
}

describe('style dictionary contains no colour literals (D-065)', () => {
  const declarations = everyDeclaration();

  it('covers all 16 types across every variant and size', () => {
    expect(COMPONENT_TYPES).toHaveLength(16);
    expect(declarations.length).toBeGreaterThan(16 * COMPONENT_VARIANTS.length * COMPONENT_SIZES.length);
  });

  it('has no hex, rgb() or hsl() outside a var()/color-mix() wrapper', () => {
    const offenders = declarations
      .filter(({ value }) => /#[0-9a-f]{3,6}\b|rgba?\(|hsla?\(/i.test(stripVarRefs(value)))
      .map(({ where, value }) => `${where} = ${value}`);
    expect(offenders).toEqual([]);
  });

  it('references only token vars and the six derived on-colors', () => {
    const offenders = declarations
      .flatMap(({ where, value }) => varsIn(value).map((name) => ({ where, name })))
      .filter(({ name }) => !ALLOWED_VARS.has(name))
      .map(({ where, name }) => `${where} -> ${name}`);
    expect(offenders).toEqual([]);
  });

  it('emits at least one token reference per component type', () => {
    for (const type of COMPONENT_TYPES) {
      const def = STYLE_DICTIONARY[type] as ComponentStyleDef;
      expect(Object.keys(def.tokens(fixtureSpec(type))).length, type).toBeGreaterThan(0);
    }
  });
});

describe('component sources contain no colour literals (§11.2 grep)', () => {
  const files = readdirSync(LIBRARY_DIR).filter((f) => f.endsWith('.tsx'));

  it('finds all 16 component files', () => {
    expect(files).toHaveLength(16);
  });

  it.each(files)('%s has no hex, rgb() or hsl() literal', (file) => {
    const source = readFileSync(path.join(LIBRARY_DIR, file), 'utf8');
    expect(source.match(/#[0-9a-f]{3,6}\b|rgba?\(|hsla?\(/i)).toBeNull();
  });

  it.each(files)('%s references only token vars', (file) => {
    const source = readFileSync(path.join(LIBRARY_DIR, file), 'utf8');
    const unknown = varsIn(source).filter((name) => !ALLOWED_VARS.has(name));
    expect(unknown).toEqual([]);
  });
});
