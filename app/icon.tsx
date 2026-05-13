// app/icon.tsx — Next.js will use this as the favicon (replaces /app/favicon.ico)
// Reference: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons

import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0a3d2a',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 900,
          fontSize: 22,
          letterSpacing: '-1px',
        }}
      >
        <span style={{ color: '#fef9e8' }}>f</span>
        <span style={{ color: '#fbbf24' }}>U</span>
      </div>
    ),
    { ...size }
  );
}
