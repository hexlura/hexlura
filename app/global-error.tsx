'use client'

import { useEffect } from 'react'

// Last-resort error screen: it replaces the root layout, so global CSS and fonts are not
// loaded here. Plain inline styles keep it readable whatever failed.
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FAF6F3',
                    color: '#1A0E0C',
                    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
                    padding: 24,
                }}
            >
                <div style={{ textAlign: 'center', maxWidth: 420 }}>
                    <p style={{ fontSize: 28, fontWeight: 800, color: '#E63950', letterSpacing: 2, margin: '0 0 24px' }}>HEXLURA</p>
                    <h1 style={{ fontSize: 28, margin: '0 0 12px' }}>Something went wrong</h1>
                    <p style={{ color: '#6B5D56', margin: '0 0 24px', lineHeight: 1.5 }}>
                        We hit an unexpected problem. Please try again. If it keeps happening, contact support@hexlura.com.
                    </p>
                    <button
                        type="button"
                        onClick={() => reset()}
                        style={{
                            background: '#E63950',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 999,
                            padding: '14px 28px',
                            fontSize: 15,
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Try again
                    </button>
                    {error.digest && (
                        <p style={{ color: '#9a8f89', fontFamily: 'monospace', fontSize: 11, marginTop: 20 }}>Reference: {error.digest}</p>
                    )}
                </div>
            </body>
        </html>
    )
}
