'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatPence } from '@/lib/fees'

interface Props {
    pendingBalance: number
    canRequestWithdrawal: boolean
}

export function WithdrawButton({ pendingBalance, canRequestWithdrawal }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleRequest() {
        setLoading(true)
        setError('')
        const res = await fetch('/api/organiser/payouts/request-withdrawal', { method: 'POST' })
        if (res.ok) {
            router.refresh()
        } else {
            const data = await res.json().catch(() => ({}))
            setError(data.error || 'Failed to request withdrawal')
        }
        setLoading(false)
    }

    if (pendingBalance <= 0 || !canRequestWithdrawal) return null

    return (
        <div className="mt-4">
            <button
                onClick={handleRequest}
                disabled={loading}
                className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Requesting...' : `Request Withdrawal — ${formatPence(pendingBalance)}`}
            </button>
            {error && <p className="text-warm-red text-xs mt-2">{error}</p>}
        </div>
    )
}
