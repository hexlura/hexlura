'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatPence } from '@/lib/fees'

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

function fmtDateShort(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function PromotersClient({ kpis, items, events }: Props) {
    const router = useRouter()
    const [tab, setTab] = useState<Tab>('all')
    const [submitting, setSubmitting] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [draftCommission, setDraftCommission] = useState<string>('')
    const [toast, setToast] = useState<string | null>(null)
    const [showInviteForm, setShowInviteForm] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteCommission, setInviteCommission] = useState('10')
    const [inviteEventId, setInviteEventId] = useState(events[0]?.id || '')

    function showToast(msg: string) {
        setToast(msg)
        setTimeout(() => setToast(null), 3000)
    }

    // Self-service "Promote this event" requests are handled in their own
    // section; the main table/tabs only show invited + active assignments.
    const requests = useMemo(() => items.filter(i => i.status === 'requested'), [items])
    const tableItems = useMemo(() => items.filter(i => i.status !== 'requested'), [items])

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
            showToast('Commission must be 0–100')
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
        if (!res.ok) { showToast(json.error || 'Failed'); return }
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
            showToast(json.error || 'Failed to send invite')
            return
        }
        showToast('Invite sent')
        setInviteEmail('')
        setInviteCommission('10')
        setShowInviteForm(false)
        router.refresh()
    }

    async function saveCommission(id: string) {
        const value = parseFloat(draftCommission)
        if (isNaN(value) || value < 0 || value > 100) {
            showToast('Commission must be 0–100')
            return
        }
        const res = await fetch(`/api/organiser/promoters/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commission_percent: value }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) { showToast(json.error || 'Failed to save'); return }
        setEditingId(null)
        showToast('Commission updated')
        router.refresh()
    }

    async function removeAssignment(id: string, action: 'remove' | 'cancel') {
        if (!confirm(action === 'cancel' ? 'Cancel this invitation?' : 'Remove this promoter from the event?')) return
        const res = await fetch(`/api/organiser/promoters/${id}`, { method: 'DELETE' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) { showToast(json.error || 'Failed'); return }
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
        if (!res.ok) { showToast(json.error || 'Failed to resend'); return }
        showToast('Invitation resent')
    }

    // Build chart data — group sales/earned by promoter (across all their assignments)
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

    return (
        <div className="max-w-7xl">
            {toast && (
                <div className="fixed top-4 right-4 z-50 bg-success/20 border border-success/40 text-success px-4 py-2 rounded-none text-sm">{toast}</div>
            )}

            <h1 className="font-heading text-4xl text-text tracking-wide mb-2">PROMOTERS</h1>
            <p className="text-muted text-sm mb-8">Manage your promoters and track their performance.</p>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-card border border-border p-5">
                    <div className="text-xs uppercase tracking-wider text-muted mb-2">Active Promoters</div>
                    <div className="font-heading text-3xl text-text">{kpis.activePromoters}</div>
                    <div className="text-xs text-muted mt-2">Across {events.length} event{events.length === 1 ? '' : 's'}</div>
                </div>
                <div className="bg-card border border-border p-5">
                    <div className="text-xs uppercase tracking-wider text-muted mb-2">Tickets via Promoters</div>
                    <div className="font-heading text-3xl text-text">{kpis.ticketsViaPromoters}</div>
                </div>
                <div className="bg-card border border-border p-5">
                    <div className="text-xs uppercase tracking-wider text-muted mb-2">Commission Paid Out</div>
                    <div className="font-heading text-3xl text-success">{formatPence(kpis.commissionPaidPence)}</div>
                    <div className="text-xs text-muted mt-2">All time</div>
                </div>
                <div className="bg-card border border-border p-5">
                    <div className="text-xs uppercase tracking-wider text-muted mb-2">Commission Pending</div>
                    <div className="font-heading text-3xl text-gold">{formatPence(kpis.commissionPendingPence)}</div>
                    <div className="text-xs text-muted mt-2">Awaiting release</div>
                </div>
            </div>

            {/* Invite form */}
            <div className="bg-card border border-border p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-sm font-medium text-text">Invite a Promoter</h2>
                        <p className="text-xs text-muted mt-1">Enter their Hexlura email, pick the event, set commission %. They&apos;ll receive an invitation to join.</p>
                    </div>
                    <button
                        onClick={() => setShowInviteForm(v => !v)}
                        className="text-xs text-accent hover:underline"
                    >
                        {showInviteForm ? 'Hide' : 'Show form'}
                    </button>
                </div>

                {showInviteForm && (
                    <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <input
                            type="email"
                            placeholder="promoter@email.com"
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            required
                            className="md:col-span-5 bg-surface border border-border rounded-sm px-3 py-2.5 text-sm text-text focus:outline-none focus:border-accent"
                        />
                        <select
                            value={inviteEventId}
                            onChange={e => setInviteEventId(e.target.value)}
                            required
                            className="md:col-span-4 bg-surface border border-border rounded-sm px-3 py-2.5 text-sm text-text focus:outline-none focus:border-accent"
                        >
                            <option value="">Select event…</option>
                            {events.map(e => (
                                <option key={e.id} value={e.id}>{e.title} · {fmtDateShort(e.start_at)}</option>
                            ))}
                        </select>
                        <div className="md:col-span-2 flex items-center gap-2">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={inviteCommission}
                                onChange={e => setInviteCommission(e.target.value)}
                                required
                                className="w-full bg-surface border border-border rounded-sm px-3 py-2.5 text-sm text-text focus:outline-none focus:border-accent"
                            />
                            <span className="text-sm text-muted">%</span>
                        </div>
                        <button
                            type="submit"
                            disabled={submitting || !inviteEventId}
                            className="md:col-span-1 bg-text text-white text-sm font-medium px-4 py-2.5 hover:bg-text/90 disabled:opacity-50"
                        >
                            {submitting ? '…' : 'Send'}
                        </button>
                    </form>
                )}
            </div>

            {/* Pending promotion requests */}
            {requests.length > 0 && (
                <div className="bg-card border border-gold/40 p-6 mb-6">
                    <h2 className="text-sm font-medium text-text mb-1">
                        Promotion Requests
                        <span className="ml-2 text-xs text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full">{requests.length} pending</span>
                    </h2>
                    <p className="text-xs text-muted mb-4">These people asked to promote your events. Set their commission and approve, or decline.</p>
                    <div className="flex flex-col gap-3">
                        {requests.map(r => (
                            <div key={r.id} className="flex flex-wrap items-center gap-3 border border-border bg-surface px-4 py-3">
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm text-text font-medium">{r.promoter?.displayName || 'Unknown'}</div>
                                    <div className="text-xs text-muted truncate">
                                        {r.promoter?.email || '—'} · wants to promote <span className="text-text">{r.event?.title || '—'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        value={requestCommissions[r.id] ?? '10'}
                                        onChange={e => setRequestCommissions(prev => ({ ...prev, [r.id]: e.target.value }))}
                                        className="w-16 bg-card border border-border rounded-sm px-2 py-1.5 text-xs text-text focus:outline-none focus:border-accent"
                                    />
                                    <span className="text-xs text-muted">%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => decideRequest(r.id, 'approve')}
                                        disabled={actingRequestId === r.id}
                                        className="bg-text text-white text-xs font-medium px-4 py-2 hover:bg-text/90 disabled:opacity-50"
                                    >
                                        {actingRequestId === r.id ? '…' : 'Approve'}
                                    </button>
                                    <button
                                        onClick={() => decideRequest(r.id, 'decline')}
                                        disabled={actingRequestId === r.id}
                                        className="text-xs text-muted border border-border px-4 py-2 hover:text-text hover:border-text disabled:opacity-50"
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
            <div className="flex gap-1 mb-6 border-b border-border">
                {(['all', 'active', 'invited'] as Tab[]).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-2.5 text-sm transition-colors -mb-px border-b-2 capitalize ${tab === t ? 'text-text border-accent' : 'text-muted border-transparent hover:text-text'}`}
                    >
                        {t === 'all' ? 'All Promoters' : t === 'active' ? 'Active' : 'Pending Invite'}
                    </button>
                ))}
            </div>

            {/* Promoters table */}
            <div className="bg-card border border-border overflow-x-auto mb-8">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            {['Promoter', 'Event', 'Commission', 'Clicks', 'Tickets Sold', 'Earned', 'Status', 'Actions'].map(h => (
                                <th key={h} className="text-left text-xs text-muted py-3 px-4 font-normal uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr><td colSpan={8} className="text-center text-muted text-xs py-12">No promoters in this category</td></tr>
                        )}
                        {filtered.map(item => {
                            const isEditing = editingId === item.id
                            const isInvite = item.status === 'invited'
                            return (
                                <tr key={item.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                    <td className="py-3 px-4">
                                        {item.promoter ? (
                                            <>
                                                <div className="text-text font-medium">{item.promoter.displayName}</div>
                                                <div className="text-xs text-muted">{item.promoter.email || '—'}</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-muted italic text-sm">Pending signup</div>
                                                <div className="text-xs text-muted">{item.invitedEmail}</div>
                                            </>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-text text-xs">{item.event?.title || '—'}</td>
                                    <td className="py-3 px-4">
                                        {isEditing ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    value={draftCommission}
                                                    onChange={e => setDraftCommission(e.target.value)}
                                                    className="w-16 bg-surface border border-accent rounded-sm px-2 py-1 text-xs text-text focus:outline-none"
                                                    min="0"
                                                    max="100"
                                                    step="0.5"
                                                />
                                                <span className="text-xs text-muted">%</span>
                                                <button onClick={() => saveCommission(item.id)} className="text-xs text-success ml-1">Save</button>
                                                <button onClick={() => setEditingId(null)} className="text-xs text-muted ml-1">×</button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => { setEditingId(item.id); setDraftCommission(String(item.commissionPercent)) }}
                                                className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full hover:bg-accent/20"
                                            >
                                                {item.commissionPercent}%
                                            </button>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-text">{isInvite ? '—' : item.clicks.toLocaleString('en-GB')}</td>
                                    <td className="py-3 px-4 text-text">{isInvite ? '—' : item.sales}</td>
                                    <td className="py-3 px-4 text-success font-medium">{isInvite ? '—' : formatPence(item.earnedPence)}</td>
                                    <td className="py-3 px-4">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${isInvite ? 'text-gold bg-gold/10 border-gold/20' : 'text-success bg-success/10 border-success/20'}`}>
                                            {isInvite ? 'Invite Sent' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2 text-xs">
                                            {isInvite ? (
                                                <>
                                                    <button onClick={() => resendInvite(item.id)} className="text-accent hover:underline">Resend</button>
                                                    <span className="text-border">·</span>
                                                    <button onClick={() => removeAssignment(item.id, 'cancel')} className="text-muted hover:text-text">Cancel</button>
                                                </>
                                            ) : (
                                                <button onClick={() => removeAssignment(item.id, 'remove')} className="text-accent hover:underline">Remove</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Charts */}
            {chartData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-card border border-border p-5">
                        <h2 className="text-sm font-medium text-text mb-1">Tickets Sold by Promoter</h2>
                        <p className="text-xs text-muted mb-4">Total tickets sold via each promoter link</p>
                        <div className="flex items-end gap-3 h-40 mt-6">
                            {chartData.map(c => (
                                <div key={c.name} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                                    <div
                                        className="w-full bg-accent/80 rounded-t-sm"
                                        style={{ height: `${(c.sales / maxSales) * 100}%`, minHeight: c.sales > 0 ? 8 : 4, opacity: c.sales > 0 ? 1 : 0.15 }}
                                        title={`${c.sales} sales`}
                                    />
                                    <span className="text-xs text-muted truncate w-full text-center">{c.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-card border border-border p-5">
                        <h2 className="text-sm font-medium text-text mb-1">Commission Overview</h2>
                        <p className="text-xs text-muted mb-4">Total commission earned per promoter</p>
                        <div className="flex flex-col gap-3 mt-4">
                            {chartData.map(c => (
                                <div key={c.name}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-text">{c.name}</span>
                                        <span className="text-success font-medium">{formatPence(c.earnedPence)}</span>
                                    </div>
                                    <div className="bg-surface rounded-sm h-2 overflow-hidden">
                                        <div className="bg-accent h-full" style={{ width: `${(c.earnedPence / maxEarned) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
