'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatPence } from '@/lib/fees'
import { ThemedSelect } from '@/components/ui/ThemedSelect'

interface AssignmentItem {
    id: string
    status: 'invited' | 'active' | 'requested'
    commissionPercent: number
    invitedEmail: string | null
    event: { id: string; title: string; slug: string } | null
    promoter: { id: string; displayName: string; referralCode: string; email: string | null } | null
    clicks: number
    sales: number
    earnedPence: number
}

interface Props {
    kpis: {
        activePromoters: number
        ticketsViaPromoters: number
        commissionPaidPence: number
        commissionPendingPence: number
    }
    items: AssignmentItem[]
    events: { id: string; title: string; start_at: string }[]
}

type Tab = 'all' | 'active' | 'invited'

const AVATAR_GRADIENTS = [
    'from-accent to-warm-orange',
    'from-warm-yellow to-warm-orange',
    'from-warm-orange to-accent',
    'from-warm-green to-warm-amber',
]

function fmtDateShort(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Whole pounds when exact (as in the design's KPI cards), otherwise keep the pence
function fmtKpiMoney(pence: number) {
    return pence % 100 === 0 ? `£${(pence / 100).toLocaleString('en-GB')}` : formatPence(pence)
}

function initialsOf(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function PromotersClient({ kpis, items, events }: Props) {
    const router = useRouter()
    const [tab, setTab] = useState<Tab>('all')
    const [submitting, setSubmitting] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [draftCommission, setDraftCommission] = useState<string>('')
    const [toast, setToast] = useState<{ text: string; kind: 'success' | 'error' } | null>(null)
    const [showInvite, setShowInvite] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteCommission, setInviteCommission] = useState('10')
    const [inviteEventId, setInviteEventId] = useState(events[0]?.id || '')

    function showToast(text: string, kind: 'success' | 'error' = 'success') {
        setToast({ text, kind })
        setTimeout(() => setToast(null), 3000)
    }

    // Escape closes the invite modal
    useEffect(() => {
        if (!showInvite) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowInvite(false) }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [showInvite])

    // Self-service "Promote this event" requests are handled in their own
    // section; the main table/tabs only show invited + active assignments.
    const requests = useMemo(() => items.filter(i => i.status === 'requested'), [items])
    const tableItems = useMemo(() => items.filter(i => i.status !== 'requested'), [items])

    const counts = useMemo(() => ({
        all: tableItems.length,
        active: tableItems.filter(i => i.status === 'active').length,
        invited: tableItems.filter(i => i.status === 'invited').length,
    }), [tableItems])

    const filtered = useMemo(() => {
        if (tab === 'active') return tableItems.filter(i => i.status === 'active')
        if (tab === 'invited') return tableItems.filter(i => i.status === 'invited')
        return tableItems
    }, [tableItems, tab])

    const [requestCommissions, setRequestCommissions] = useState<Record<string, string>>({})
    const [actingRequestId, setActingRequestId] = useState<string | null>(null)

    async function decideRequest(id: string, action: 'approve' | 'decline') {
        const commission = parseFloat(requestCommissions[id] ?? '10')
        if (action === 'approve' && (isNaN(commission) || commission < 0 || commission > 100)) {
            showToast('Commission must be 0–100', 'error')
            return
        }
        if (action === 'decline' && !confirm('Decline this promotion request?')) return
        setActingRequestId(id)
        const res = await fetch(`/api/organiser/promoters/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action === 'approve' ? { action, commission_percent: commission } : { action }),
        })
        const json = await res.json().catch(() => ({}))
        setActingRequestId(null)
        if (!res.ok) { showToast(json.error || 'Failed', 'error'); return }
        showToast(action === 'approve' ? 'Request approved — promoter notified' : 'Request declined')
        router.refresh()
    }

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault()
        if (!inviteEventId || !inviteEmail || !inviteCommission) return
        setSubmitting(true)
        const res = await fetch('/api/organiser/promoters/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: inviteEmail.trim().toLowerCase(),
                event_id: inviteEventId,
                commission_percent: parseFloat(inviteCommission),
            }),
        })
        const json = await res.json().catch(() => ({}))
        setSubmitting(false)
        if (!res.ok) {
            showToast(json.error || 'Failed to send invite', 'error')
            return
        }
        showToast('Invite sent')
        setInviteEmail('')
        setInviteCommission('10')
        setShowInvite(false)
        router.refresh()
    }

    async function saveCommission(id: string) {
        const value = parseFloat(draftCommission)
        if (isNaN(value) || value < 0 || value > 100) {
            showToast('Commission must be 0–100', 'error')
            return
        }
        const res = await fetch(`/api/organiser/promoters/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commission_percent: value }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) { showToast(json.error || 'Failed to save', 'error'); return }
        setEditingId(null)
        showToast('Commission updated')
        router.refresh()
    }

    async function removeAssignment(id: string, action: 'remove' | 'cancel') {
        if (!confirm(action === 'cancel' ? 'Cancel this invitation?' : 'Remove this promoter from the event?')) return
        const res = await fetch(`/api/organiser/promoters/${id}`, { method: 'DELETE' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) { showToast(json.error || 'Failed', 'error'); return }
        showToast(action === 'cancel' ? 'Invitation cancelled' : 'Promoter removed')
        router.refresh()
    }

    async function resendInvite(id: string) {
        const res = await fetch(`/api/organiser/promoters/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resend: true }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) { showToast(json.error || 'Failed to resend', 'error'); return }
        showToast('Invitation resent')
    }

    // Chart data — group sales/earned by promoter (across all their assignments)
    const chartData = useMemo(() => {
        const byPromoter: Record<string, { name: string; sales: number; earnedPence: number }> = {}
        for (const i of tableItems) {
            if (!i.promoter) continue
            const key = i.promoter.id
            if (!byPromoter[key]) byPromoter[key] = { name: i.promoter.displayName, sales: 0, earnedPence: 0 }
            byPromoter[key].sales += i.sales
            byPromoter[key].earnedPence += i.earnedPence
        }
        return Object.values(byPromoter)
    }, [tableItems])
    const maxSales = Math.max(1, ...chartData.map(c => c.sales))
    const maxEarned = Math.max(1, ...chartData.map(c => c.earnedPence))

    const kpiCards = [
        { label: 'Active Promoters', value: String(kpis.activePromoters), accent: false },
        { label: 'Tickets via Promoters', value: kpis.ticketsViaPromoters.toLocaleString('en-GB'), accent: false },
        { label: 'Commission Paid', value: fmtKpiMoney(kpis.commissionPaidPence), accent: false },
        { label: 'Commission Pending', value: fmtKpiMoney(kpis.commissionPendingPence), accent: true },
    ]

    const modalInput = 'w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25'
    const tabs: { value: Tab; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'active', label: 'Active' },
        { value: 'invited', label: 'Invited' },
    ]

    return (
        <div className="max-w-7xl">
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-[80] bg-card border shadow-hover rounded-xl px-4 py-2.5 text-sm font-medium ${
                        toast.kind === 'success' ? 'border-warm-green/40 text-warm-green' : 'border-warm-red/40 text-warm-red'
                    }`}
                >
                    {toast.text}
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div>
                    <h1 className="font-heading text-4xl tracking-wide">PROMOTERS</h1>
                    <p className="text-muted text-sm mt-1">Manage referral partners and track commission</p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowInvite(true)}
                    className="bg-text text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                    Invite Promoter
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                {kpiCards.map(k => (
                    <div key={k.label} className="bg-card rounded-2xl shadow-card p-5">
                        <p className="text-xs text-muted uppercase tracking-wider mb-2">{k.label}</p>
                        <p className={`font-heading text-3xl ${k.accent ? 'text-accent' : ''}`}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Promotion requests */}
            {requests.length > 0 && (
                <div className="bg-card border-2 border-warm-yellow/40 rounded-2xl p-6 mb-6">
                    <h2 className="text-sm font-semibold mb-1">
                        Promotion Requests{' '}
                        <span className="ml-1 text-xs font-semibold text-warm-yellowText bg-warm-yellow/10 px-2 py-0.5 rounded-full">{requests.length} pending</span>
                    </h2>
                    <p className="text-xs text-muted mb-4">These people asked to promote your events. Set their commission and approve, or decline.</p>
                    <div className="flex flex-col gap-3">
                        {requests.map(r => (
                            <div key={r.id} className="flex flex-wrap items-center gap-3 bg-background rounded-xl px-4 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{r.promoter?.displayName || 'Unknown'}</p>
                                    <p className="text-xs text-muted truncate">
                                        {r.promoter?.email || '—'} · wants to promote <span className="text-text">{r.event?.title || '—'}</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        value={requestCommissions[r.id] ?? '10'}
                                        onChange={e => setRequestCommissions(prev => ({ ...prev, [r.id]: e.target.value }))}
                                        className="w-16 bg-card border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                                    />
                                    <span className="text-xs text-muted">%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => decideRequest(r.id, 'approve')}
                                        disabled={actingRequestId === r.id}
                                        className="bg-text text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                                    >
                                        {actingRequestId === r.id ? '…' : 'Approve'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => decideRequest(r.id, 'decline')}
                                        disabled={actingRequestId === r.id}
                                        className="text-xs text-muted border border-border px-4 py-2 rounded-lg hover:text-text hover:border-text transition-colors disabled:opacity-50"
                                    >
                                        Decline
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
                {tabs.map(t => {
                    const active = tab === t.value
                    return (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => setTab(t.value)}
                            className={`px-4 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap ${
                                active ? 'font-medium text-text border-accent' : 'text-muted border-transparent hover:text-text'
                            }`}
                        >
                            {t.label} <span className={`font-normal ${active ? 'text-muted' : ''}`}>({counts[t.value]})</span>
                        </button>
                    )
                })}
            </div>

            {/* Promoters table */}
            <div className="bg-card rounded-2xl shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-sm">
                        <thead>
                            <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                                <th className="font-medium py-3.5 px-6">Promoter</th>
                                <th className="font-medium py-3.5 px-4">Event</th>
                                <th className="font-medium py-3.5 px-4 text-right">Commission</th>
                                <th className="font-medium py-3.5 px-4 text-right">Clicks</th>
                                <th className="font-medium py-3.5 px-4 text-right">Sales</th>
                                <th className="font-medium py-3.5 px-4 text-right">Earned</th>
                                <th className="font-medium py-3.5 px-6">Status</th>
                                <th className="font-medium py-3.5 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={8} className="text-center text-muted text-sm py-12">No promoters in this category</td></tr>
                            )}
                            {filtered.map((item, i) => {
                                const isEditing = editingId === item.id
                                const isInvite = item.status === 'invited'
                                const name = item.promoter?.displayName || item.invitedEmail || 'Pending signup'
                                return (
                                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-[#FAF6F3]/60 transition-colors">
                                        <td className="py-3.5 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                                                    {initialsOf(name)}
                                                </div>
                                                <p className="font-medium" title={item.promoter?.email || item.invitedEmail || undefined}>{name}</p>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-muted truncate max-w-[140px]">{item.event?.title || '—'}</td>
                                        <td className="py-3.5 px-4 text-right">
                                            {isEditing ? (
                                                <span className="inline-flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={draftCommission}
                                                        onChange={e => setDraftCommission(e.target.value)}
                                                        className="w-16 bg-card border border-accent rounded-lg px-2 py-1 text-xs focus:outline-none"
                                                        min="0"
                                                        max="100"
                                                        step="0.5"
                                                    />
                                                    <span className="text-xs text-muted">%</span>
                                                    <button type="button" onClick={() => saveCommission(item.id)} className="text-xs text-warm-green font-semibold ml-1">Save</button>
                                                    <button type="button" onClick={() => setEditingId(null)} aria-label="Cancel edit" className="text-xs text-muted ml-1">×</button>
                                                </span>
                                            ) : (
                                                <>{item.commissionPercent}%</>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">{isInvite ? '—' : item.clicks.toLocaleString('en-GB')}</td>
                                        <td className="py-3.5 px-4 text-right">{isInvite ? '—' : item.sales}</td>
                                        <td className="py-3.5 px-4 text-right font-medium">{isInvite ? '—' : formatPence(item.earnedPence)}</td>
                                        <td className="py-3.5 px-6">
                                            {isInvite ? (
                                                <span className="text-xs font-semibold text-warm-yellowText bg-warm-yellow/10 px-2.5 py-1 rounded-full">Invited</span>
                                            ) : (
                                                <span className="text-xs font-semibold text-warm-green bg-warm-green/10 px-2.5 py-1 rounded-full">Active</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-6 text-right whitespace-nowrap text-xs">
                                            {!isEditing && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setEditingId(item.id); setDraftCommission(String(item.commissionPercent)) }}
                                                    className="text-muted hover:text-text mr-4"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            {isInvite ? (
                                                <>
                                                    <button type="button" onClick={() => resendInvite(item.id)} className="text-accent font-medium hover:underline mr-4">Resend</button>
                                                    <button type="button" onClick={() => removeAssignment(item.id, 'cancel')} className="text-accent font-medium hover:underline">Cancel Invite</button>
                                                </>
                                            ) : (
                                                <button type="button" onClick={() => removeAssignment(item.id, 'remove')} className="text-accent font-medium hover:underline">Remove</button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Charts */}
            {chartData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <div className="bg-card rounded-2xl shadow-card p-6">
                        <h2 className="text-sm font-semibold mb-4">Tickets Sold by Promoter</h2>
                        <div className="flex flex-col gap-3">
                            {chartData.map(c => (
                                <div key={c.name}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-medium">{c.name}</span>
                                        <span className="text-muted">{c.sales}</span>
                                    </div>
                                    <div className="h-2 bg-background rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-accent to-warm-orange rounded-full" style={{ width: `${(c.sales / maxSales) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-card rounded-2xl shadow-card p-6">
                        <h2 className="text-sm font-semibold mb-4">Commission Overview</h2>
                        <div className="flex flex-col gap-3">
                            {chartData.map(c => (
                                <div key={c.name}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-medium">{c.name}</span>
                                        <span className="text-muted">{formatPence(c.earnedPence)}</span>
                                    </div>
                                    <div className="h-2 bg-background rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-accent to-warm-orange rounded-full" style={{ width: `${(c.earnedPence / maxEarned) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Promoter modal */}
            {showInvite && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div onClick={() => setShowInvite(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <form onSubmit={handleInvite} className="relative bg-card rounded-2xl shadow-hover w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                            <div>
                                <h2 className="font-heading text-2xl tracking-wide">INVITE PROMOTER</h2>
                                <p className="text-muted text-xs mt-0.5">Add a referral partner and set their commission. Commission on their sales is deducted from your ticket revenue.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowInvite(false)}
                                aria-label="Close"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-background hover:text-text transition-colors shrink-0"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="text-xs text-muted block mb-1.5">Email address</label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    placeholder="promoter@email.com"
                                    required
                                    className={modalInput}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted block mb-1.5">Event</label>
                                <ThemedSelect
                                    value={inviteEventId}
                                    onChange={e => setInviteEventId(e.target.value)}
                                    required
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25"
                                >
                                    <option value="">Select event…</option>
                                    {events.map(e => (
                                        <option key={e.id} value={e.id}>{e.title} · {fmtDateShort(e.start_at)}</option>
                                    ))}
                                </ThemedSelect>
                            </div>
                            <div>
                                <label className="text-xs text-muted block mb-1.5">Commission %</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={inviteCommission}
                                    onChange={e => setInviteCommission(e.target.value)}
                                    placeholder="10"
                                    required
                                    className={modalInput}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-border">
                            <button
                                type="button"
                                onClick={() => setShowInvite(false)}
                                className="bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-border transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !inviteEventId}
                                className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                            >
                                {submitting ? 'Sending...' : 'Send Invite'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}
