import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import WebMCPBridge from '@/webmcp/WebMCPBridge';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Alternative Galaxy — Design systems for humans and agents',
  description:
    "A design studio where the AI agent's tools are a function of the work's state. Set tokens, write rules, and let any WebMCP agent build inside them.",
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <WebMCPBridge />
        {children}
      </body>
    </html>
  );
}
