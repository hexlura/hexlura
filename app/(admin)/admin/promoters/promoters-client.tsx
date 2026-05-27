'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { formatPence } from '@/lib/fees'

export interface PromoterRow {
    id: string
    display_name: string
    referral_code: string
    status: string
    created_at: string
    user_id: string
    payout_method: string | null
    profiles: { full_name: string | null; email: string | null } | null
    lifetime_gross_pence: number
    available_pence: number
    paid_pence: number
    sales_count: number
}

interface Props {
    active: PromoterRow[]
    suspended: PromoterRow[]
    defaultTab: 'active' | 'suspended'
}

function fmt(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function PromotersClient({ active, suspended, defaultTab }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [tab, setTab] = useState<'active' | 'suspended'>(defaultTab)
    const [search, setSearch] = useState('')
    const [suspendModal, setSuspendModal] = useState<PromoterRow | null>(null)
    const [reasonInput, setReasonInput] = useState('')
    const [loading, setLoading] = useState<string | null>(null)
    const [toastMsg, setToastMsg] = useState<string | null>(null)

    function showToast(msg: string) {
        setToastMsg(msg)
        setTimeout(() => setToastMsg(null), 4000)
    }

    function changeTab(next: 'active' | 'suspended') {
        setTab(next)
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', next)
        router.push(`${pathname}?${params.toString()}`)
    }

    async function handleSuspend() {
        if (!suspendModal) return
        setLoading(suspendModal.id)
        const res = await fetch(`/api/admin/promoters/${suspendModal.id}/suspend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: reasonInput.trim() }),
        })
        setLoading(null)
        if (res.ok) {
            showToast(`${suspendModal.display_name} suspended`)
            setSuspendModal(null)
            setReasonInput('')
            router.refresh()
        } else {
            showToast('Failed to suspend promoter')
        }
    }

    async function handleReinstate(p: PromoterRow) {
        setLoading(p.id)
        const res = await fetch(`/api/admin/promoters/${p.id}/reinstate`, { method: 'POST' })
        setLoading(null)
        if (res.ok) {
            showToast(`${p.display_name} reinstated`)
            router.refresh()
        } else {
            showToast('Failed to reinstate promoter')
        }
    }

    const list = tab === 'active' ? active : suspended
    const filtered = search.trim()
        ? list.filter(p => {
            const q = search.toLowerCase()
            return p.display_name.toLowerCase().includes(q)
                || p.referral_code.toLowerCase().includes(q)
                || (p.profiles?.email ?? '').toLowerCase().includes(q)
                || (p.profiles?.full_name ?? '').toLowerCase().includes(q)
        })
        : list

    return (
        <div className="max-w-7xl">
            {toastMsg && (
                <div className="fixed top-4 right-4 z-50 bg-success/20 border border-success/40 text-success px-4 py-2 rounded-none text-sm">
                    {toastMsg}
                </div>
            )}

            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">PROMOTERS</h1>
                <p className="text-muted text-sm mt-1">Manage affiliate promoters and their commission earnings</p>
            </div>

            {/* Tabs + search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => changeTab('active')}
                        className={`text-sm px-4 py-2 border whitespace-nowrap ${tab === 'active' ? 'border-accent text-accent bg-accent/5' : 'border-border text-muted hover:text-text'}`}
                    >
                        Active ({active.length})
                    </button>
                    <button
                        onClick={() => changeTab('suspended')}
                        className={`text-sm px-4 py-2 border whitespace-nowrap ${tab === 'suspended' ? 'border-accent text-accent bg-accent/5' : 'border-border text-muted hover:text-text'}`}
                    >
                        Suspended ({suspended.length})
                    </button>
                </div>
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, code or email…"
                    className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none w-full sm:w-72"
                />
            </div>

            <div className="bg-card border border-border rounded-none overflow-x-auto mb-4">
                <table className="w-full min-w-[760px] text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            {['Promoter', 'Code', 'Sales', 'Lifetime', 'Available', 'Paid', 'Joined', 'Actions'].map(h => (
                                <th key={h} className="text-left text-xs text-muted py-3 px-4 font-normal">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr><td colSpan={8} className="text-center text-muted text-xs py-12">
                                {search.trim() ? 'No promoters match your search' : `No ${tab} promoters`}
                            </td></tr>
                        )}
                        {filtered.map(p => (
                            <tr key={p.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                <td className="py-3 px-4 text-sm">
                                    <div className="text-text font-medium">{p.display_name}</div>
                                    <div className="text-[11px] text-muted">{p.profiles?.email ?? '—'}</div>
                                </td>
                                <td className="py-3 px-4">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-400/20 font-mono">
                                        {p.referral_code}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-text text-xs">{p.sales_count}</td>
                                <td className="py-3 px-4 text-text text-xs font-medium">{formatPence(p.lifetime_gross_pence)}</td>
                                <td className="py-3 px-4 text-gold text-xs">{formatPence(p.available_pence)}</td>
                                <td className="py-3 px-4 text-success text-xs">{formatPence(p.paid_pence)}</td>
                                <td className="py-3 px-4 text-muted text-xs">{fmt(p.created_at)}</td>
                                <td className="py-3 px-4">
                                    {tab === 'active' ? (
                                        <button
                                            onClick={() => { setSuspendModal(p); setReasonInput('') }}
                                            disabled={loading === p.id}
                                            className="text-[11px] text-accent hover:underline px-2 py-1 disabled:opacity-50"
                                        >
                                            Suspend
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleReinstate(p)}
                                            disabled={loading === p.id}
                                            className="text-[11px] text-success hover:underline px-2 py-1 disabled:opacity-50"
                                        >
                                            {loading === p.id ? '...' : 'Reinstate'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Suspend Modal */}
            {suspendModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="font-heading text-xl text-text mb-3">Suspend Promoter</h3>
                        <p className="text-sm text-muted mb-1">{suspendModal.display_name} ({suspendModal.referral_code})</p>
                        <p className="text-sm text-muted mb-4">Their referral links will continue to redirect, but new sales will not be attributed and they cannot request payouts.</p>
                        <div className="mb-4">
                            <label className="text-xs text-muted block mb-1.5">Reason (optional, internal)</label>
                            <textarea
                                value={reasonInput}
                                onChange={e => setReasonInput(e.target.value)}
                                rows={3}
                                placeholder="e.g. fraud, ToS violation, account compromise"
                                className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button variant="primary" size="md" onClick={handleSuspend} disabled={loading === suspendModal.id}>
                                {loading === suspendModal.id ? 'Suspending...' : 'Suspend Promoter'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => { setSuspendModal(null); setReasonInput('') }}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
