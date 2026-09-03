/**
 * The alt.gal mission patch (ALT_GAL_REBRAND.md §C, D-261): station ring, inclined orbit, payload,
 * four registration ticks, and a carrier dot riding the orbit. Inline SVG so it recolours from the
 * console tokens; `app/icon.svg` repeats the geometry because a favicon is fetched as a standalone
 * document and can read neither React nor a CSS variable.
 */
export function StationMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className="alt-mark"
      role="img"
      aria-label="alt.gal station mark"
    >
      <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="2" />
      <ellipse
        cx="24"
        cy="24"
        rx="21"
        ry="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        transform="rotate(-24 24 24)"
      />
      <circle cx="24" cy="24" r="5" className="alt-mark__payload" />
      <path d="M24 3v4 M45 24h-4 M24 45v-4 M3 24h4" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="41" cy="16.5" r="2.2" fill="currentColor" />
    </svg>
  );
}

/**
 * §C lockup: always lowercase `alt.gal`, never "Alt.Gal" or "AltGal". The "." is a filled amber
 * square echoing the payload and the console signal LED, so the dot is an element, not a glyph.
 */
export function Wordmark() {
  return (
    <span className="alt-wordmark">
      alt
      <i className="alt-wordmark__dot" aria-hidden="true" />
      gal
    </span>
  );
}

/** Mark + wordmark at the lockup's minimum clear space. */
export default function StationLockup() {
  return (
    <span className="alt-lockup">
      <StationMark />
      <Wordmark />
    </span>
  );
}
