import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Space_Grotesk, IBM_Plex_Mono, VT323 } from 'next/font/google';
import { FONT_CLASSNAMES } from '@/utils/fontLoader';
import WebMCPBridge from '@/webmcp/WebMCPBridge';
import './globals.css';

/**
 * Station type (ALT_GAL_REBRAND.md §D, D-260). Space Grotesk for display labels, IBM Plex Mono for
 * the console body — log, data, everything dense — and VT323 for jumbo telemetry numerals ONLY: it
 * is a pixel face and is illegible below the readout sizes.
 *
 * The `--font-station-*` names are chrome-private on purpose (the D-253 rule survives the rebrand).
 * Space Grotesk and IBM Plex Mono are also entries in the *user's* 13-family catalog, where
 * `fontLoader.ts` owns `--font-space-grotesk` / `--font-ibm-plex-mono` at `display: 'swap'` for the
 * canvas. Same families, separate declarations: the console must not repaint when the human
 * retypes their own system.
 *
 * `display: 'optional'` keeps a late face from swapping in under the operator's cursor.
 */
const stationDisplay = Space_Grotesk({
  subsets: ['latin'],
  display: 'optional',
  weight: ['400', '500', '700'],
  variable: '--font-station-display',
});
const stationMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'optional',
  weight: ['400', '500', '600'],
  variable: '--font-station-mono',
});
const stationTele = VT323({
  subsets: ['latin'],
  display: 'optional',
  weight: '400',
  variable: '--font-station-tele',
});

const STATION_FONTS = [stationDisplay.variable, stationMono.variable, stationTele.variable].join(' ');

export const metadata: Metadata = {
  metadataBase: new URL('https://alt.gal'),
  title: 'alt.gal — a ground station for design systems',
  description:
    'A ground station for building design systems. You set the tokens and the flight rules; GAL — any WebMCP agent — builds inside them, running only the systems your clearance allows.',
  openGraph: {
    title: 'alt.gal — a ground station for design systems',
    description:
      'A ground station for building design systems. You set the tokens and the flight rules; GAL — any WebMCP agent — builds inside them, running only the systems your clearance allows.',
    url: 'https://alt.gal',
    siteName: 'alt.gal',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // D-249: FONT_CLASSNAMES is what puts the catalog's @font-face rules and --font-<family>
    // variables on the page; the console's own three are separate, named --font-station-* (D-260).
    <html lang="en" className={`${STATION_FONTS} ${FONT_CLASSNAMES}`}>
      <body>
        {children}
        {/* D-017: mounted once, as a sibling. It never wraps children. */}
        <WebMCPBridge />
      </body>
    </html>
  );
}
