'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Privilege = 'co_organiser' | 'event_manager' | 'door_staff'

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
    co_organiser: 'Co-organiser',
    event_manager: 'Event Manager',
    door_staff: 'Door Staff',
}

const PRIVILEGE_BADGE: Record<Privilege, React.CSSProperties> = {
    co_organiser: { background: 'rgba(230,57,80,0.1)', color: '#E63950' },
    event_manager: { background: 'rgba(245,166,35,0.1)', color: '#F5A623' },
    door_staff: { background: 'rgba(0,196,138,0.1)', color: '#00C48A' },
}

const PRIVILEGE_DESC: Record<Privilege, string> = {
    door_staff: 'Can only access the ticket scanner for check-in',
    event_manager: 'Can create events, view bookings and manage attendees',
    co_organiser: 'Full access to organiser portal including payouts and settings',
}

function PrivilegeBadge({ privilege }: { privilege: Privilege }) {
    return (
        <span style={{
            ...PRIVILEGE_BADGE[privilege],
            fontSize: 12, fontWeight: 600, padding: '3px 8px',
            borderRadius: 4, whiteSpace: 'nowrap',
        }}>
            {PRIVILEGE_LABELS[privilege]}
        </span>
    )
}

function Avatar({ member }: { member: TeamMember }) {
    const name = member.profile?.full_name || member.invited_email
    const initials = name.includes(' ')
        ? (name.split(' ')[0][0] + name.split(' ').slice(-1)[0][0]).toUpperCase()
        : name[0].toUpperCase()
    return member.profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.profile.avatar_url} alt={initials} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
    ) : (
        <div style={{
            width: 40, height: 40, borderRadius: '50%', background: '#E63950',
            color: '#fff', fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{initials}</div>
    )
}

const cardStyle: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #E0E0E0', padding: 24, marginBottom: 24 }
const inputStyle: React.CSSProperties = { border: '1px solid #C0C0C8', padding: '10px 14px', fontSize: 14, width: '100%', outline: 'none', boxSizing: 'border-box' }
const selectStyle: React.CSSProperties = { border: '1px solid #C0C0C8', padding: '10px 14px', fontSize: 14, background: '#fff', cursor: 'pointer' }

export default function OrganiserTeamPage() {
    const router = useRouter()
    const [members, setMembers] = useState<TeamMember[]>([])
    const [loading, setLoading] = useState(true)
    const [email, setEmail] = useState('')
    const [privilege, setPrivilege] = useState<Privilege>('door_staff')
    const [addLoading, setAddLoading] = useState(false)
    const [addMsg, setAddMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const fetchMembers = useCallback(async () => {
        setLoading(true)
        const res = await fetch('/api/organiser/team')
        if (res.status === 403) { router.push('/organiser'); return }
        const json = await res.json()
        setMembers(json.members || [])
        setLoading(false)
    }, [router])

    useEffect(() => { fetchMembers() }, [fetchMembers])

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
        }
        setAddLoading(false)
    }

    async function handleChangeRole(memberId: string, newPrivilege: Privilege) {
        setActionLoading(memberId + '-role')
        await fetch('/api/organiser/team', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: memberId, privilege: newPrivilege }),
        })
        await fetchMembers()
        setActionLoading(null)
    }

    async function handleRemove(memberId: string) {
        if (!confirm('Remove this team member?')) return
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

    const activeMembers = members.filter(m => m.status === 'active')
    const pendingMembers = members.filter(m => m.status === 'pending')

    return (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 36, color: '#0A0A0F', letterSpacing: '0.05em', marginBottom: 32 }}>
                TEAM MEMBERS
            </h1>

            {/* Add Member */}
            <div style={cardStyle}>
                <h2 style={{ fontSize: 16, color: '#0A0A0F', fontWeight: 600, marginBottom: 16 }}>Add Team Member</h2>
                <form onSubmit={handleAdd}>
                    <div style={{ marginBottom: 12 }}>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            style={inputStyle}
                            placeholder="Enter email address"
                            required
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <select
                                value={privilege}
                                onChange={e => setPrivilege(e.target.value as Privilege)}
                                style={{ ...selectStyle, width: '100%' }}
                            >
                                <option value="door_staff">Door Staff — Scan tickets at the door</option>
                                <option value="event_manager">Event Manager — Manage events and bookings</option>
                                <option value="co_organiser">Co-organiser — Full portal access</option>
                            </select>
                            <p style={{ fontSize: 12, color: '#8888AA', marginTop: 6 }}>
                                {PRIVILEGE_DESC[privilege]}
                            </p>
                        </div>
                        <button
                            type="submit"
                            disabled={addLoading}
                            style={{
                                background: '#0A0A0F', color: '#FFFFFF', padding: '10px 24px',
                                fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 0,
                                cursor: addLoading ? 'not-allowed' : 'pointer', opacity: addLoading ? 0.6 : 1,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {addLoading ? 'Sending...' : 'Add Member'}
                        </button>
                    </div>
                    {addMsg && (
                        <p style={{ fontSize: 13, color: addMsg.type === 'success' ? '#00C48A' : '#E63950', marginTop: 10 }}>
                            {addMsg.text}
                        </p>
                    )}
                </form>
            </div>

            {loading ? (
                <p style={{ color: '#8888AA', textAlign: 'center', padding: 32 }}>Loading team members...</p>
            ) : members.length === 0 ? (
                <p style={{ color: '#8888AA', textAlign: 'center', padding: 32 }}>
                    No team members yet. Add your first team member above.
                </p>
            ) : (
                <>
                    {/* Active Members */}
                    {activeMembers.length > 0 && (
                        <div style={cardStyle}>
                            <h2 style={{ fontSize: 16, color: '#0A0A0F', fontWeight: 600, marginBottom: 16 }}>Active Members</h2>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #E0E0E0' }}>
                                        {['Member', 'Privilege', 'Joined', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '8px 12px', fontSize: 11, color: '#8888AA', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeMembers.map(m => (
                                        <tr key={m.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <Avatar member={m} />
                                                    <div>
                                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0F', margin: 0 }}>
                                                            {m.profile?.full_name || m.invited_email}
                                                        </p>
                                                        {m.profile?.full_name && (
                                                            <p style={{ fontSize: 12, color: '#8888AA', margin: 0 }}>{m.invited_email}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <PrivilegeBadge privilege={m.privilege} />
                                            </td>
                                            <td style={{ padding: '12px', fontSize: 13, color: '#8888AA', whiteSpace: 'nowrap' }}>
                                                {m.accepted_at ? new Date(m.accepted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <select
                                                        value={m.privilege}
                                                        onChange={e => handleChangeRole(m.id, e.target.value as Privilege)}
                                                        disabled={actionLoading === m.id + '-role'}
                                                        style={{ ...selectStyle, fontSize: 12, padding: '4px 8px' }}
                                                    >
                                                        <option value="door_staff">Door Staff</option>
                                                        <option value="event_manager">Event Manager</option>
                                                        <option value="co_organiser">Co-organiser</option>
                                                    </select>
                                                    <button
                                                        onClick={() => handleRemove(m.id)}
                                                        disabled={actionLoading === m.id + '-remove'}
                                                        style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #E63950', color: '#E63950', background: 'transparent', cursor: 'pointer' }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#E63950'; e.currentTarget.style.color = '#fff' }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#E63950' }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pending Invitations */}
                    {pendingMembers.length > 0 && (
                        <div style={cardStyle}>
                            <h2 style={{ fontSize: 16, color: '#0A0A0F', fontWeight: 600, marginBottom: 16 }}>Pending Invitations</h2>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #E0E0E0' }}>
                                        {['Email', 'Privilege', 'Status', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '8px 12px', fontSize: 11, color: '#8888AA', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingMembers.map(m => (
                                        <tr key={m.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                                            <td style={{ padding: '12px', fontSize: 13, color: '#0A0A0F' }}>{m.invited_email}</td>
                                            <td style={{ padding: '12px' }}>
                                                <PrivilegeBadge privilege={m.privilege} />
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{ fontSize: 12, color: '#8888AA', fontWeight: 500 }}>Pending</span>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button
                                                        onClick={() => handleResend(m.id)}
                                                        disabled={actionLoading === m.id + '-resend'}
                                                        style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #C0C0C8', color: '#0A0A0F', background: '#fff', cursor: 'pointer' }}
                                                    >
                                                        {actionLoading === m.id + '-resend' ? 'Sending...' : 'Resend Invite'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemove(m.id)}
                                                        disabled={actionLoading === m.id + '-remove'}
                                                        style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #E63950', color: '#E63950', background: 'transparent', cursor: 'pointer' }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#E63950'; e.currentTarget.style.color = '#fff' }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#E63950' }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
