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
        <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
                <p className="font-semibold text-sm">Privacy &amp; Data</p>
                <p className="text-xs text-muted">Download a copy of your personal data (GDPR) — emailed to you as a JSON file.</p>
                {status === 'sent' && (
                    <p className="text-xs font-semibold text-success mt-1.5">✓ Export sent — check your email</p>
                )}
                {status === 'error' && (
                    <p className="text-xs font-semibold text-accent mt-1.5">Something went wrong. Please try again.</p>
                )}
            </div>
            <button
                onClick={handleRequest}
                disabled={status === 'loading' || status === 'sent'}
                className={`px-5 py-2 rounded-full border border-border text-sm font-semibold hover:bg-background transition whitespace-nowrap ${status === 'sent' ? 'text-success' : ''}`}
            >
                {status === 'loading' ? 'Sending...' : status === 'sent' ? 'Sent ✓' : 'Export My Data'}
            </button>
        </div>
    )
}
