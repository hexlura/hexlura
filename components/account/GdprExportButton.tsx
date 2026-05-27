'use client'

import { useState } from 'react'

export default function GdprExportButton() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')

    async function handleRequest() {
        setStatus('loading')
        try {
            const res = await fetch('/api/user/data-export', { method: 'POST' })
            if (!res.ok) throw new Error('Failed')
            setStatus('sent')
        } catch {
            setStatus('error')
        }
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0F', margin: '0 0 4px' }}>Download My Data</p>
                <p style={{ fontSize: 13, color: '#666677', margin: 0 }}>
                    Export all data we hold about your account — emailed to you as a JSON file.
                </p>
                {status === 'sent' && (
                    <p style={{ fontSize: 13, color: '#16A34A', margin: '6px 0 0', fontWeight: 600 }}>
                        ✓ Export sent — check your email
                    </p>
                )}
                {status === 'error' && (
                    <p style={{ fontSize: 13, color: '#E63950', margin: '6px 0 0' }}>
                        Something went wrong. Please try again.
                    </p>
                )}
            </div>
            <button
                onClick={handleRequest}
                disabled={status === 'loading' || status === 'sent'}
                style={{
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: 600,
                    border: '1px solid #C0C0C8',
                    background: 'transparent',
                    color: status === 'sent' ? '#16A34A' : '#0A0A0F',
                    cursor: status === 'loading' || status === 'sent' ? 'default' : 'pointer',
                    opacity: status === 'loading' ? 0.6 : 1,
                    borderRadius: 0,
                    whiteSpace: 'nowrap',
                    transition: 'opacity 0.15s',
                }}
            >
                {status === 'loading' ? 'Sending...' : status === 'sent' ? 'Sent ✓' : 'Request Export'}
            </button>
        </div>
    )
}
