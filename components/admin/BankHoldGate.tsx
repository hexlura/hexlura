'use client'

import { useState } from 'react'

export interface RevealedBank {
    name: string | null
    sortCode: string | null
    accountNumber: string | null
}

interface Props {
    /** Endpoint that returns the withheld details once a reason is given. Omit to only collect the reason. */
    revealUrl?: string
    heldUntil: string | null
    reason: string
    onReasonChange: (reason: string) => void
    onRevealed?: (bank: RevealedBank) => void
    /** Text above the reason box. */
    intro?: string
}

const MIN = 10

function fmtDate(iso: string | null) {
    return iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'a later date'
}

// Shown wherever an admin could otherwise see or pay to bank details that changed in the last 7 days.
// The details are withheld by the server; this collects the audited reason needed to override.
export function BankHoldGate({ revealUrl, heldUntil, reason, onReasonChange, onRevealed, intro }: Props) {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    async function reveal() {
        if (!revealUrl || !onRevealed) return
        setBusy(true)
        setError('')
        try {
            const res = await fetch(revealUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: reason.trim() }),
            })
            const data = await res.json().catch(() => null) as (RevealedBank & { error?: string }) | null
            if (!res.ok || !data) {
                setError(data?.error || 'Could not reveal the details.')
            } else {
                onRevealed({ name: data.name, sortCode: data.sortCode, accountNumber: data.accountNumber })
            }
        } catch {
            setError('Could not reach the server. Please try again.')
        } finally {
            setBusy(false)
        }
    }

    const ready = reason.trim().length >= MIN

    return (
        <div className="mb-4 bg-warm-red/5 border border-warm-red/30 p-3 rounded-lg">
            <p className="text-xs text-accent font-medium">🔒 Bank details changed recently: held until {fmtDate(heldUntil)}</p>
            <p className="text-[11px] text-muted mt-1">
                {intro ?? 'The new details are withheld so nobody pays an account the organiser may not have set. Confirm the change with them by phone or a known email. To act before the hold ends, give a reason (saved in the audit log; every admin is alerted).'}
            </p>
            <label className="text-[11px] text-muted block mt-2 mb-1">Override reason (min {MIN} characters)</label>
            <textarea
                value={reason}
                onChange={e => onReasonChange(e.target.value)}
                rows={2}
                placeholder="e.g. confirmed by phone with the organiser on a known number"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-warm-red/25"
            />
            {error && <p className="text-[11px] text-accent mt-1">{error}</p>}
            {revealUrl && onRevealed && (
                <button
                    type="button"
                    onClick={reveal}
                    disabled={!ready || busy}
                    className="mt-2 text-xs px-3 py-1.5 rounded-full border border-accent text-accent disabled:opacity-40"
                >
                    {busy ? 'Revealing…' : 'Reveal details (logged)'}
                </button>
            )}
        </div>
    )
}
