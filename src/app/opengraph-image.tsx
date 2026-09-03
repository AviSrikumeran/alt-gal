import { ImageResponse } from 'next/og';

/** D-204: 1200×630, generated at build time — no runtime, which keeps `output: 'export'` intact. */
export const dynamic = 'force-static'; // required by `output: 'export'` (D-208)
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Alternative Galaxy — design systems for humans and agents';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#111113',
        color: '#EDEEF0',
        padding: 72,
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 28, color: '#B0B4BA' }}>
        <div style={{ width: 14, height: 14, borderRadius: 7, background: '#FF3D9E' }} />
        alt.gal
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 68, lineHeight: 1.1, letterSpacing: -1.5, maxWidth: 940 }}>
          Design systems for humans and agents
        </div>
        <div style={{ fontSize: 30, color: '#B0B4BA', maxWidth: 900 }}>
          The agent&apos;s tools are a function of the work&apos;s state.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, fontSize: 24 }}>
        {['Empty', 'Tokens', 'Components', 'Layout', 'Export'].map((step, i) => (
          <div
            key={step}
            style={{
              display: 'flex',
              padding: '10px 22px',
              borderRadius: 22,
              background: i < 3 ? 'rgba(255, 122, 198, 0.16)' : 'transparent',
              border: i < 3 ? '1px solid #FF3D9E' : '1px solid #43484E',
              color: i < 3 ? '#FF3D9E' : '#696E77',
            }}
          >
            {step}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
