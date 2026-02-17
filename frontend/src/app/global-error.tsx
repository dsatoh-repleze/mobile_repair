'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#1a1a2e',
          color: '#eee',
          padding: '2rem',
          fontFamily: 'monospace',
        }}>
          <div style={{
            maxWidth: '900px',
            margin: '0 auto',
          }}>
            <h1 style={{
              color: '#ff6b6b',
              fontSize: '1.5rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              Unhandled Runtime Error
            </h1>

            <div style={{
              backgroundColor: '#16213e',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '1rem',
              border: '1px solid #e94560',
            }}>
              <div style={{
                color: '#ff6b6b',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                marginBottom: '0.5rem',
              }}>
                {error.name}: {error.message}
              </div>

              {error.digest && (
                <div style={{ color: '#888', fontSize: '0.85rem' }}>
                  Digest: {error.digest}
                </div>
              )}
            </div>

            {error.stack && (
              <div style={{
                backgroundColor: '#16213e',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                border: '1px solid #333',
              }}>
                <div style={{
                  color: '#888',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                }}>
                  Call Stack
                </div>
                <pre style={{
                  margin: 0,
                  fontSize: '0.85rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#ccc',
                }}>
                  {error.stack}
                </pre>
              </div>
            )}

            <button
              onClick={reset}
              style={{
                backgroundColor: '#e94560',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
