/**
 * D-119: all 13 catalog fonts are declared at build time; no runtime <link> injection.
 * This is the ONLY file that imports next/font — `next/font/google` resolves to an empty module
 * outside the Next compiler, so nothing that tests or tools import may reach it (see utils/fonts.ts).
 *
 * Each family is declared with `variable`, so the loaded face name lands in the CSS custom property
 * `fontVar(family)` returns (D-220). `app/layout.tsx` (Stream 5) puts FONT_CLASSNAMES on <html>; every
 * @font-face is then present and `--font-geist` / `--font-geist-mono` resolve for globals.css (D-142).
 *
 * Each call spells out its own options: next/font types `subsets` per family, so a shared `opts`
 * object widens to `string[]` and stops type-checking.
 */
import {
  Inter,
  Geist,
  DM_Sans,
  Plus_Jakarta_Sans,
  Manrope,
  Space_Grotesk,
  Playfair_Display,
  Lora,
  Fraunces,
  Source_Serif_4,
  JetBrains_Mono,
  Geist_Mono,
  IBM_Plex_Mono,
} from 'next/font/google';
import type { NextFontWithVariable } from 'next/dist/compiled/@next/font';
import { FONT_CATALOG, fontVar } from '@/utils/fonts';

export const FONTS: Record<string, NextFontWithVariable> = {
  Inter: Inter({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '500', '600', '700'],
    variable: fontVar('Inter'),
  }),
  Geist: Geist({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '500', '600', '700'],
    variable: fontVar('Geist'),
  }),
  'DM Sans': DM_Sans({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '500', '600', '700'],
    variable: fontVar('DM Sans'),
  }),
  'Plus Jakarta Sans': Plus_Jakarta_Sans({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '500', '600', '700'],
    variable: fontVar('Plus Jakarta Sans'),
  }),
  Manrope: Manrope({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '500', '600', '700'],
    variable: fontVar('Manrope'),
  }),
  'Space Grotesk': Space_Grotesk({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '500', '600', '700'],
    variable: fontVar('Space Grotesk'),
  }),
  'Playfair Display': Playfair_Display({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '600', '700'],
    variable: fontVar('Playfair Display'),
  }),
  Lora: Lora({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '600', '700'],
    variable: fontVar('Lora'),
  }),
  Fraunces: Fraunces({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '600', '700'],
    variable: fontVar('Fraunces'),
  }),
  'Source Serif 4': Source_Serif_4({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '600', '700'],
    variable: fontVar('Source Serif 4'),
  }),
  'JetBrains Mono': JetBrains_Mono({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '700'],
    variable: fontVar('JetBrains Mono'),
  }),
  'Geist Mono': Geist_Mono({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '700'],
    variable: fontVar('Geist Mono'),
  }),
  'IBM Plex Mono': IBM_Plex_Mono({
    subsets: ['latin'],
    display: 'swap',
    weight: ['400', '700'],
    variable: fontVar('IBM Plex Mono'),
  }),
};

/** Class list applied to <html> so every family's @font-face and CSS variable is present. */
export const FONT_CLASSNAMES = FONT_CATALOG.map((f) => FONTS[f.family]?.variable ?? '')
  .filter(Boolean)
  .join(' ');
