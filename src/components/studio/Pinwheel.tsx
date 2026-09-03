/**
 * The alt.gal mark (D-254): four blades, each a half-disc seated on a spoke, rotated 90° apart.
 * Same geometry as `app/icon.svg` — the favicon can't read a CSS variable, so the two are kept in
 * step by hand rather than shared. `currentColor` lets the header tint it from --studio-accent.
 */
export default function Pinwheel({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className="alt-pinwheel"
    >
      {[0, 90, 180, 270].map((deg) => (
        <path key={deg} d="M16 16 L16 3 A6.5 6.5 0 0 1 16 16 Z" transform={`rotate(${deg} 16 16)`} />
      ))}
    </svg>
  );
}
