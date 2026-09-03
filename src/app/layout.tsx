import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Instrument_Sans, IBM_Plex_Mono } from 'next/font/google';
import { FONT_CLASSNAMES } from '@/utils/fontLoader';
import WebMCPBridge from '@/webmcp/WebMCPBridge';
import './globals.css';

/**
 * Studio chrome type (D-143 as amended by D-253). Instrument Sans and IBM Plex Mono, under chrome-only
 * variables: the studio should never look like its own output, and the user's 13-family catalog
 * (`src/utils/fontLoader.ts`, D-119) owns `--font-<family>` for the canvas.
 *
 * `display: 'optional'` by design — the chrome is a tool, not a document. A face that misses its
 * ~100ms block window is skipped for that load rather than swapped in under the operator's cursor.
 * Instrument Sans is variable, so it needs no `weight`; IBM Plex Mono is not, and the chrome asks
 * for 400/500/600.
 */
const studioSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'optional',
  variable: '--font-studio-sans',
});
const studioMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'optional',
  weight: ['400', '500', '600'],
  variable: '--font-studio-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://alt.gal'),
  title: 'Alternative Galaxy — Design systems for humans and agents',
  description:
    "A design studio where the AI agent's tools are a function of the work's state. Set tokens, write rules, and let any WebMCP agent build inside them.",
  openGraph: {
    title: 'Alternative Galaxy — Design systems for humans and agents',
    description:
      "A design studio where the AI agent's tools are a function of the work's state. Set tokens, write rules, and let any WebMCP agent build inside them.",
    url: 'https://alt.gal',
    siteName: 'Alternative Galaxy',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // D-249: FONT_CLASSNAMES is what puts the catalog's @font-face rules and --font-<family>
    // variables on the page; the chrome's own two are separate and named --font-studio-*.
    <html lang="en" className={`${studioSans.variable} ${studioMono.variable} ${FONT_CLASSNAMES}`}>
      <body>
        {children}
        {/* D-017: mounted once, as a sibling. It never wraps children. */}
        <WebMCPBridge />
      </body>
    </html>
  );
}
