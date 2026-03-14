'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { formatPence } from '@/lib/fees'

type Tab = 'pending' | 'active' | 'suspended'

interface PendingOrg {
    id: string; org_name: string; slug: string; description: string | null
    website: string | null; vat_registered: boolean; created_at: string; user_id: string
    profiles: { full_name: string | null; email: string | null; phone: string | null } | null
}
interface ActiveOrg {
    id: string; org_name: string; slug: string; stripe_account_id: string | null
    is_suspended: boolean; created_at: string; approved_at: string | null; user_id: string
    profiles: { full_name: string | null; email: string | null } | null
    events_count: number; revenue_pence: number
}
interface SuspendedOrg {
    id: string; org_name: string; is_suspended: boolean; created_at: string; user_id: string
    profiles: { full_name: string | null; email: string | null } | null
}

interface Props {
    pending: PendingOrg[]
    active: ActiveOrg[]
    suspended: SuspendedOrg[]
    defaultTab: Tab
}

function fmt(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function relativeDate(d: string) {
    const diff = Date.now() - new Date(d).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return '1 day ago'
    return `${days} days ago`
}

export function OrganisersClient({ pending, active, suspended, defaultTab }: Props) {
    const router = useRouter()
    const [tab, setTab] = useState<Tab>(defaultTab)
    const [loading, setLoading] = useState<string | null>(null)
    const [rejectModal, setRejectModal] = useState<PendingOrg | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [suspendModal, setSuspendModal] = useState<ActiveOrg | null>(null)
    const [suspendReason, setSuspendReason] = useState('')
    const [toastMsg, setToastMsg] = useState<string | null>(null)

    function showToast(msg: string) {
        setToastMsg(msg)
        setTimeout(() => setToastMsg(null), 3000)
    }

    async function handleApprove(orgId: string) {
        setLoading(orgId)
        const res = await fetch(`/api/admin/organisers/${orgId}/approve`, { method: 'POST' })
        setLoading(null)
        if (res.ok) { showToast('Organiser approved'); router.refresh() }
    }

    async function handleReject() {
        if (!rejectModal || !rejectReason.trim()) return
        setLoading(rejectModal.id)
        const res = await fetch(`/api/admin/organisers/${rejectModal.id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: rejectReason }),
        })
        setLoading(null)
        if (res.ok) { showToast('Application rejected'); setRejectModal(null); router.refresh() }
    }

    async function handleSuspend() {
        if (!suspendModal || !suspendReason.trim()) return
        setLoading(suspendModal.id)
        const res = await fetch(`/api/admin/organisers/${suspendModal.id}/suspend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: suspendReason }),
        })
        setLoading(null)
        if (res.ok) { showToast('Organiser suspended'); setSuspendModal(null); router.refresh() }
    }

    async function handleReinstate(orgId: string) {
        setLoading(orgId)
        const res = await fetch(`/api/admin/organisers/${orgId}/reinstate`, { method: 'POST' })
        setLoading(null)
        if (res.ok) { showToast('Organiser reinstated'); router.refresh() }
    }

    const tabs: { value: Tab; label: string; count: number }[] = [
        { value: 'pending', label: 'Pending', count: pending.length },
        { value: 'active', label: 'Active', count: active.length },
        { value: 'suspended', label: 'Suspended', count: suspended.length },
    ]

    return (
        <div className="max-w-7xl">
            {toastMsg && (
                <div className="fixed top-4 right-4 z-50 bg-success/20 border border-success/40 text-success px-4 py-2 rounded-lg text-sm">
                    {toastMsg}
                </div>
            )}

            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">ORGANISERS</h1>
                <p className="text-muted text-sm mt-1">Manage organiser accounts and applications</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-border">
                {tabs.map(t => (
                    <button
                        key={t.value}
                        onClick={() => setTab(t.value)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors -mb-px border-b-2 ${tab === t.value ? 'text-text border-accent' : 'text-muted border-transparent hover:text-text'}`}
                    >
                        {t.label}
                        {t.count > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${t.value === 'pending' ? 'bg-gold text-black' : 'bg-muted/20 text-muted'}`}>
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Pending Tab */}
            {tab === 'pending' && (
                <div>
                    {pending.length === 0 ? (
                        <div className="bg-card border border-border rounded-xl p-16 text-center">
                            <p className="text-muted text-sm">No pending applications</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {pending.map(org => (
                                <div key={org.id} className="bg-card border border-border rounded-xl p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <h3 className="font-heading text-2xl text-text">{org.org_name}</h3>
                                            <p className="text-sm text-muted mt-1">
                                                {org.profiles?.full_name ?? '—'} · {org.profiles?.email ?? '—'}
                                            </p>
                                            {org.website && (
                                                <p className="text-xs text-accent mt-1">{org.website}</p>
                                            )}
                                            {org.description && (
                                                <p className="text-sm text-text mt-3 max-w-2xl">{org.description}</p>
                                            )}
                                            <div className="flex items-center gap-4 mt-3 text-xs text-muted">
                                                <span>VAT: {org.vat_registered ? 'Yes' : 'No'}</span>
                                                <span>Applied: {relativeDate(org.created_at)}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 shrink-0">
                                            <Button
                                                variant="primary"
                                                size="md"
                                                onClick={() => handleApprove(org.id)}
                                                disabled={loading === org.id}
                                                className="bg-success hover:bg-success/80 border-success"
                                            >
                                                {loading === org.id ? 'Approving...' : 'Approve'}
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="md"
                                                onClick={() => { setRejectModal(org); setRejectReason('') }}
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Active Tab */}
            {tab === 'active' && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                {['Org Name', 'Organiser', 'Email', 'Events', 'Revenue', 'Stripe', 'Joined', 'Actions'].map(h => (
                                    <th key={h} className="text-left text-xs text-muted py-3 px-4 font-normal">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {active.length === 0 && (
                                <tr><td colSpan={8} className="text-center text-muted text-xs py-12">No active organisers</td></tr>
                            )}
                            {active.map(org => (
                                <tr key={org.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                    <td className="py-3 px-4 text-text font-medium">{org.org_name}</td>
                                    <td className="py-3 px-4 text-muted text-xs">{org.profiles?.full_name ?? '—'}</td>
                                    <td className="py-3 px-4 text-muted text-xs">{org.profiles?.email ?? '—'}</td>
                                    <td className="py-3 px-4 text-text text-xs">{org.events_count}</td>
                                    <td className="py-3 px-4 text-text text-xs">{formatPence(org.revenue_pence)}</td>
                                    <td className="py-3 px-4">
                                        {org.stripe_account_id
                                            ? <span className="text-xs text-success">✓ Connected</span>
                                            : <span className="text-xs text-gold">⚠ Not connected</span>
                                        }
                                    </td>
                                    <td className="py-3 px-4 text-muted text-xs whitespace-nowrap">{fmt(org.created_at)}</td>
                                    <td className="py-3 px-4">
                                        <button
                                            onClick={() => { setSuspendModal(org); setSuspendReason('') }}
                                            className="text-xs text-accent hover:underline"
                                        >
                                            Suspend
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Suspended Tab */}
            {tab === 'suspended' && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                {['Org Name', 'Organiser', 'Email', 'Suspended Date', 'Actions'].map(h => (
                                    <th key={h} className="text-left text-xs text-muted py-3 px-4 font-normal">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {suspended.length === 0 && (
                                <tr><td colSpan={5} className="text-center text-muted text-xs py-12">No suspended organisers</td></tr>
                            )}
                            {suspended.map(org => (
                                <tr key={org.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                    <td className="py-3 px-4 text-text font-medium">{org.org_name}</td>
                                    <td className="py-3 px-4 text-muted text-xs">{org.profiles?.full_name ?? '—'}</td>
                                    <td className="py-3 px-4 text-muted text-xs">{org.profiles?.email ?? '—'}</td>
                                    <td className="py-3 px-4 text-muted text-xs">{fmt(org.created_at)}</td>
                                    <td className="py-3 px-4">
                                        <button
                                            onClick={() => handleReinstate(org.id)}
                                            disabled={loading === org.id}
                                            className="text-xs text-success hover:underline disabled:opacity-40"
                                        >
                                            {loading === org.id ? 'Reinstating...' : 'Reinstate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Reject Modal */}
            {rejectModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-4">Reject Application</h3>
                        <p className="text-sm text-muted mb-4">{rejectModal.org_name}</p>
                        <textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Rejection reason (required)"
                            rows={3}
                            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent resize-none mb-4"
                        />
                        <div className="flex gap-3">
                            <Button variant="danger" size="md" onClick={handleReject} disabled={!rejectReason.trim() || !!loading}>
                                {loading ? 'Rejecting...' : 'Reject Application'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => setRejectModal(null)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Suspend Modal */}
            {suspendModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-4">Suspend Organiser</h3>
                        <p className="text-sm text-muted mb-4">{suspendModal.org_name}</p>
                        <textarea
                            value={suspendReason}
                            onChange={e => setSuspendReason(e.target.value)}
                            placeholder="Suspension reason (required)"
                            rows={3}
                            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent resize-none mb-4"
                        />
                        <div className="flex gap-3">
                            <Button variant="danger" size="md" onClick={handleSuspend} disabled={!suspendReason.trim() || !!loading}>
                                {loading ? 'Suspending...' : 'Suspend'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => setSuspendModal(null)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
