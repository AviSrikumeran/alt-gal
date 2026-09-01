import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import WebMCPBridge from '@/webmcp/WebMCPBridge';
import './globals.css';

/**
 * Studio chrome type (D-143). Geist, not Inter: Inter is where the *user's* system starts, and the
 * studio should never look like its own output.
 *
 * Integration note: Stream 1's `src/utils/fontLoader.ts` declares the 13 catalog families for the
 * user's tokens (D-119); its `FONT_CLASSNAMES` joins the two classes on <html> below.
 */
const geistSans = Geist({ variable: '--font-geist', subsets: ['latin'], display: 'swap' });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'], display: 'swap' });

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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}
        {/* D-017: mounted once, as a sibling. It never wraps children. */}
        <WebMCPBridge />
      </body>
    </html>
  );
}
