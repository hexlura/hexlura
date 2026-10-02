'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ThemedSelect } from '@/components/ui/ThemedSelect'

type Privilege = 'door_staff'

interface TeamMember {
    id: string
    invited_email: string
    privilege: Privilege
    status: 'pending' | 'active' | 'removed'
    created_at: string
    accepted_at: string | null
    profile: { full_name: string | null; avatar_url: string | null } | null
}

const PRIVILEGE_LABELS: Record<Privilege, string> = {
    door_staff: 'Door Staff',
}

const AVATAR_GRADIENTS = [
    'from-accent to-warm-orange',
    'from-warm-yellow to-warm-orange',
    'from-warm-orange to-accent',
    'from-warm-green to-warm-amber',
]

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

function Avatar({ member, index }: { member: TeamMember; index: number }) {
    const name = member.profile?.full_name || member.invited_email
    const initials = name.includes(' ')
        ? (name.split(' ')[0][0] + name.split(' ').slice(-1)[0][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase()
    return member.profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.profile.avatar_url} alt={initials} className="w-9 h-9 rounded-full object-cover shrink-0" />
    ) : (
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
            {initials}
        </div>
    )
}

export default function OrganiserTeamPage() {
    const router = useRouter()
    const [members, setMembers] = useState<TeamMember[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [showInvite, setShowInvite] = useState(false)
    const [email, setEmail] = useState('')
    const privilege: Privilege = 'door_staff'
    const [addLoading, setAddLoading] = useState(false)
    const [addMsg, setAddMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const fetchMembers = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/organiser/team')
            if (res.status === 403) { router.push('/organiser'); return }
            if (!res.ok) throw new Error(`team fetch ${res.status}`)
            const json = await res.json()
            setMembers(json.members || [])
            setLoadError(null)
        } catch (e) {
            console.error('[OrganiserTeam] load failed:', e)
            setLoadError('Could not load your team. Please refresh and try again.')
        } finally {
            setLoading(false)
        }
    }, [router])

    useEffect(() => { fetchMembers() }, [fetchMembers])

    function openInvite() {
        setEmail('')
        setAddMsg(null)
        setShowInvite(true)
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault()
        setAddLoading(true)
        setAddMsg(null)
        const res = await fetch('/api/organiser/team', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, privilege }),
        })
        const json = await res.json()
        if (!res.ok) {
            setAddMsg({ type: 'error', text: json.error || 'Failed to add member.' })
        } else {
            setAddMsg({ type: 'success', text: 'Invitation sent successfully.' })
            setEmail('')
            fetchMembers()
            setTimeout(() => setShowInvite(false), 1200)
        }
        setAddLoading(false)
    }

    async function handleRemove(memberId: string, pending: boolean) {
        if (!confirm(pending ? 'Cancel this invitation?' : 'Remove this team member?')) return
        setActionLoading(memberId + '-remove')
        await fetch('/api/organiser/team', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: memberId }),
        })
        await fetchMembers()
        setActionLoading(null)
    }

    async function handleResend(memberId: string) {
        setActionLoading(memberId + '-resend')
        await fetch('/api/organiser/team', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: memberId, resend: true }),
        })
        setActionLoading(null)
    }

    const visible = members.filter(m => m.status !== 'removed')
    const modalInput = 'w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25'

    return (
        <div className="max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div>
                    <h1 className="font-heading text-4xl tracking-wide">TEAM</h1>
                    <p className="text-muted text-sm mt-1">Invite door staff and co-organisers to help run your events</p>
                </div>
                <button
                    type="button"
                    onClick={openInvite}
                    className="bg-text text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                    Invite Member
                </button>
            </div>

            <div className="bg-card rounded-2xl shadow-card overflow-hidden">
                {loading ? (
                    <p className="text-center text-muted text-sm py-16">Loading team members...</p>
                ) : loadError ? (
                    <p className="text-center text-warm-red text-sm py-16">{loadError}</p>
                ) : visible.length === 0 ? (
                    <p className="text-center text-muted text-sm py-16">No team members yet. Invite your first team member.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-sm">
                            <thead>
                                <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                                    <th className="font-medium py-3.5 px-6">Member</th>
                                    <th className="font-medium py-3.5 px-4">Role</th>
                                    <th className="font-medium py-3.5 px-4">Status</th>
                                    <th className="font-medium py-3.5 px-4">Invited</th>
                                    <th className="font-medium py-3.5 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((m, i) => {
                                    const pending = m.status === 'pending'
                                    return (
                                        <tr key={m.id} className="border-b border-border last:border-0 hover:bg-[#FAF6F3]/60 transition-colors">
                                            <td className="py-3.5 px-6">
                                                <div className="flex items-center gap-3">
                                                    <Avatar member={m} index={i} />
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate">{m.invited_email}</p>
                                                        {m.profile?.full_name && (
                                                            <p className="text-xs text-muted truncate">{m.profile.full_name}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="text-xs font-semibold text-warm-green bg-warm-green/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                                                    {PRIVILEGE_LABELS[m.privilege] || m.privilege}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {pending ? (
                                                    <span className="text-xs font-semibold text-warm-yellowText bg-warm-yellow/10 px-2.5 py-1 rounded-full">Pending</span>
                                                ) : (
                                                    <span className="text-xs font-semibold text-warm-green bg-warm-green/10 px-2.5 py-1 rounded-full">Active</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-muted text-xs whitespace-nowrap">{fmtDate(m.created_at)}</td>
                                            <td className="py-3.5 px-6 text-right whitespace-nowrap">
                                                {pending && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleResend(m.id)}
                                                        disabled={actionLoading === m.id + '-resend'}
                                                        className="text-xs text-accent font-medium hover:underline mr-4 disabled:opacity-50"
                                                    >
                                                        {actionLoading === m.id + '-resend' ? 'Sending...' : 'Resend'}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemove(m.id, pending)}
                                                    disabled={actionLoading === m.id + '-remove'}
                                                    className="text-xs text-accent font-medium hover:underline disabled:opacity-50"
                                                >
                                                    {pending ? 'Cancel Invite' : 'Remove'}
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <p className="text-xs text-muted mt-4">Door staff can only access the check-in scanner for events you assign them to.</p>

            {/* Invite Member modal */}
            {showInvite && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div onClick={() => setShowInvite(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <form onSubmit={handleAdd} className="relative bg-card rounded-2xl shadow-hover w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                            <div>
                                <h2 className="font-heading text-2xl tracking-wide">INVITE MEMBER</h2>
                                <p className="text-muted text-xs mt-0.5">Send an invite to join your team</p>
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
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="teammate@email.com"
                                    required
                                    className={modalInput}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted block mb-1.5">Role</label>
                                <ThemedSelect
                                    value={privilege}
                                    onChange={() => {}}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25"
                                >
                                    <option value="door_staff">Door Staff</option>
                                </ThemedSelect>
                            </div>
                            {addMsg && (
                                <p className={`text-sm ${addMsg.type === 'success' ? 'text-warm-green' : 'text-warm-red'}`}>{addMsg.text}</p>
                            )}
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
                                disabled={addLoading}
                                className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-semibold"
                            >
                                {addLoading ? 'Sending...' : 'Send Invite'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}
