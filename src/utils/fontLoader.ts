/**
 * D-119: all 13 catalog fonts are declared at build time; no runtime <link> injection.
 * This is the ONLY file that imports next/font — `next/font/google` resolves to an empty module
 * outside the Next compiler, so nothing that tests or tools import may reach it (see utils/fonts.ts).
 *
 * Each family is declared with `variable`, so the loaded face name lands in the CSS custom property
 * `fontVar(family)` returns (D-221). `app/layout.tsx` puts FONT_CLASSNAMES on <html>, which is what
 * gets those @font-face rules and variables onto the page at all (D-249).
 *
 * Shape is dictated by next/font's SWC plugin, not by taste (D-256). Every loader call must be
 * assigned to its own module-scope `const` — an object literal of calls is rejected — and every
 * option must be a written literal, so the variable names below are spelled out rather than
 * computed with `fontVar()`. `utils/__tests__/fontLoader.test.ts` checks the spelling against
 * `fontVar` and `FONT_CATALOG` so the two cannot drift.
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
import { FONT_CATALOG } from '@/utils/fonts';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});
const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-geist',
});
const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
});
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta-sans',
});
const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
});
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '600', '700'],
  variable: '--font-playfair-display',
});
const lora = Lora({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '600', '700'],
  variable: '--font-lora',
});
const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '600', '700'],
  variable: '--font-fraunces',
});
const sourceSerif4 = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '600', '700'],
  variable: '--font-source-serif-4',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '700'],
  variable: '--font-jetbrains-mono',
});
const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '700'],
  variable: '--font-geist-mono',
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '700'],
  variable: '--font-ibm-plex-mono',
});

export const FONTS: Record<string, NextFontWithVariable> = {
  Inter: inter,
  Geist: geist,
  'DM Sans': dmSans,
  'Plus Jakarta Sans': plusJakartaSans,
  Manrope: manrope,
  'Space Grotesk': spaceGrotesk,
  'Playfair Display': playfairDisplay,
  Lora: lora,
  Fraunces: fraunces,
  'Source Serif 4': sourceSerif4,
  'JetBrains Mono': jetbrainsMono,
  'Geist Mono': geistMono,
  'IBM Plex Mono': ibmPlexMono,
};

/** Class list applied to <html> so every family's @font-face and CSS variable is present. */
export const FONT_CLASSNAMES = FONT_CATALOG.map((f) => FONTS[f.family]?.variable ?? '')
  .filter(Boolean)
  .join(' ');
