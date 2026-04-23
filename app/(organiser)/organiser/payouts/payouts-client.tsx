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
            const data = await res.json()
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
                className="px-6 py-2.5 bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Requesting...' : `Request Withdrawal — ${formatPence(pendingBalance)}`}
            </button>
            {error && <p className="text-accent text-xs mt-2">{error}</p>}
        </div>
    )
}
