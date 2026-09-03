import StudioShell from '@/components/studio/StudioShell';

/**
 * A server component that renders one client shell (D-070). Everything stateful is below this
 * line; everything above it — metadata, fonts, the OG image — is generated at build time.
 */
export default function Home() {
  return (
    <>
      <h1 className="alt-sr">alt.gal — a ground station for design systems</h1>
      <StudioShell />
    </>
  );
}
