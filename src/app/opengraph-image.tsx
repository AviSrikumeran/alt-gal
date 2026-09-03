import { ImageResponse } from 'next/og';

/** D-204: 1200×630, generated at build time — no runtime, which keeps `output: 'export'` intact. */
export const dynamic = 'force-static'; // required by `output: 'export'` (D-208)
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'alt.gal — a ground station for design systems';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#E9E6DD',
        color: '#17150F',
        padding: 72,
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 28, color: '#17150F' }}>
        <svg width="40" height="40" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="21" fill="none" stroke="#17150F" strokeWidth="2" />
          <ellipse
            cx="24"
            cy="24"
            rx="21"
            ry="8"
            fill="none"
            stroke="#17150F"
            strokeWidth="1.5"
            transform="rotate(-24 24 24)"
          />
          <circle cx="24" cy="24" r="5" fill="#C4501B" />
          <path d="M24 3v4 M45 24h-4 M24 45v-4 M3 24h4" stroke="#17150F" strokeWidth="2" fill="none" />
          <circle cx="41" cy="16.5" r="2.2" fill="#17150F" />
        </svg>
        alt.gal
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 68, lineHeight: 1.1, letterSpacing: -1.5, maxWidth: 940 }}>
          A ground station for design systems
        </div>
        <div style={{ fontSize: 30, color: '#5F5A49', maxWidth: 900 }}>
          You set the tokens and the flight rules. GAL builds inside them, running only the systems your clearance
          allows.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, fontSize: 20, letterSpacing: 1 }}>
        {['00 PRELAUNCH', '01 SYSTEMS CHECK', '02 POWERED FLIGHT', '03 ORBIT', '04 DEEP SPACE'].map((step, i) => (
          <div
            key={step}
            style={{
              display: 'flex',
              padding: '10px 18px',
              borderRadius: 2,
              background: i < 3 ? '#17150F' : 'transparent',
              border: i < 3 ? '1px solid #17150F' : '1px solid #A9A390',
              color: i < 3 ? '#F3F1EA' : '#7E7865',
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
