import StudioShell from '@/components/studio/StudioShell';

/**
 * A server component that renders one client shell (D-070). Everything stateful is below this
 * line; everything above it — metadata, fonts, the OG image — is generated at build time.
 */
export default function Home() {
  return (
    <>
      <h1 className="alt-sr">Alternative Galaxy — design systems for humans and agents</h1>
      <StudioShell />
    </>
  );
}
