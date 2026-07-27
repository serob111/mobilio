'use client';

// Next.js renders this in place of the root layout when an error escapes
// every other error boundary, so it must not depend on any provider from
// layout.tsx (theme, query client, auth) — none of those are mounted here.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'sans-serif', padding: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
          {error.digest ? `Error reference: ${error.digest}` : error.message}
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: '1.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: '1px solid #d1d5db',
            background: '#111827',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
