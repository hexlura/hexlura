'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { formatPence } from '@/lib/fees'

type UserRole = 'user' | 'organiser' | 'admin'

interface UserRow {
    id: string
    full_name: string | null
    email: string | null
    role: UserRole
    is_suspended: boolean
    is_verified: boolean
    created_at: string
    bookings_count: number
    total_spent_pence: number
}

interface Props {
    users: UserRow[]
    totalCount: number
    page: number
    pageSize: number
    totalRows: number
    currentAdminId: string
}

const ROLE_BADGE: Record<UserRole, string> = {
    user: 'bg-muted/20 text-muted border-muted/30',
    organiser: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    admin: 'bg-accent/20 text-accent border-accent/30',
}

function fmt(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function UsersClient({ users, totalCount, page, pageSize, totalRows, currentAdminId }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [searchValue, setSearchValue] = useState(searchParams.get('q') ?? '')
    const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

    // Modals state
    const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
    const [panelUser, setPanelUser] = useState<UserRow | null>(null)
    const [modal, setModal] = useState<'role' | 'suspend' | 'unsuspend' | 'impersonate' | null>(null)
    const [suspendReason, setSuspendReason] = useState('')
    const [newRole, setNewRole] = useState<UserRole>('user')
    const [loading, setLoading] = useState(false)
    const [toastMsg, setToastMsg] = useState<string | null>(null)

    function showToast(msg: string) {
        setToastMsg(msg)
        setTimeout(() => setToastMsg(null), 3000)
    }

    function updateParam(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString())
        if (value) params.set(key, value)
        else params.delete(key)
        params.delete('page')
        router.push(`${pathname}?${params.toString()}`)
    }

    function handleSearchChange(v: string) {
        setSearchValue(v)
        if (searchTimer) clearTimeout(searchTimer)
        const t = setTimeout(() => updateParam('q', v), 300)
        setSearchTimer(t)
    }

    function openModal(user: UserRow, m: typeof modal) {
        setSelectedUser(user)
        setNewRole(user.role)
        setSuspendReason('')
        setModal(m)
    }

    async function handleChangeRole() {
        if (!selectedUser) return
        setLoading(true)
        const res = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole }),
        })
        setLoading(false)
        if (res.ok) {
            showToast('Role updated')
            setModal(null)
            router.refresh()
        }
    }

    async function handleSuspend() {
        if (!selectedUser || !suspendReason.trim()) return
        setLoading(true)
        const res = await fetch(`/api/admin/users/${selectedUser.id}/suspend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: suspendReason }),
        })
        setLoading(false)
        if (res.ok) {
            showToast('Account suspended')
            setModal(null)
            router.refresh()
        }
    }

    async function handleUnsuspend() {
        if (!selectedUser) return
        setLoading(true)
        const res = await fetch(`/api/admin/users/${selectedUser.id}/unsuspend`, { method: 'POST' })
        setLoading(false)
        if (res.ok) {
            showToast('Account reinstated')
            setModal(null)
            router.refresh()
        }
    }

    async function handleImpersonate() {
        if (!selectedUser) return
        setLoading(true)
        const res = await fetch('/api/admin/impersonate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: selectedUser.id }),
        })
        setLoading(false)
        if (res.ok) {
            setModal(null)
            window.open('/account', '_blank')
            router.refresh()
        }
    }

    async function handleResendVerification(userId: string) {
        await fetch(`/api/admin/users/${userId}/resend-verification`, { method: 'POST' })
        showToast('Verification email sent')
    }

    const totalPages = Math.ceil(totalRows / pageSize)

    return (
        <div className="max-w-7xl">
            {/* Toast */}
            {toastMsg && (
                <div className="fixed top-4 right-4 z-50 bg-success/20 border border-success/40 text-success px-4 py-2 rounded-none text-sm">
                    {toastMsg}
                </div>
            )}

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-heading text-4xl text-text tracking-wide">USERS</h1>
                    <p className="text-muted text-sm mt-1">{totalCount.toLocaleString()} total accounts</p>
                </div>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                <input
                    type="search"
                    placeholder="Search by name or email..."
                    value={searchValue}
                    onChange={e => handleSearchChange(e.target.value)}
                    className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent w-64"
                />
                <select
                    value={searchParams.get('role') ?? 'all'}
                    onChange={e => updateParam('role', e.target.value === 'all' ? '' : e.target.value)}
                    className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none"
                >
                    <option value="all">All Roles</option>
                    <option value="user">User</option>
                    <option value="organiser">Organiser</option>
                    <option value="admin">Admin</option>
                </select>
                <select
                    value={searchParams.get('status') ?? 'all'}
                    onChange={e => updateParam('status', e.target.value === 'all' ? '' : e.target.value)}
                    className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none"
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                </select>
                <select
                    value={searchParams.get('joined') ?? 'any'}
                    onChange={e => updateParam('joined', e.target.value === 'any' ? '' : e.target.value)}
                    className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none"
                >
                    <option value="any">Any Time</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-none overflow-x-auto mb-4">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            {['Name', 'Email', 'Role', 'Joined', 'Bookings', 'Spent', 'Status', 'Actions'].map(h => (
                                <th key={h} className="text-left text-xs text-muted py-3 px-4 font-normal">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 && (
                            <tr><td colSpan={8} className="text-center text-muted text-xs py-12">No users found</td></tr>
                        )}
                        {users.map(u => (
                            <tr key={u.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                <td className="py-3 px-4">
                                    <p className="text-text font-medium text-sm">{u.full_name ?? '—'}</p>
                                </td>
                                <td className="py-3 px-4 text-muted text-xs">{u.email ?? '—'}</td>
                                <td className="py-3 px-4">
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_BADGE[u.role]}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-muted text-xs whitespace-nowrap">{fmt(u.created_at)}</td>
                                <td className="py-3 px-4 text-text text-xs">{u.bookings_count}</td>
                                <td className="py-3 px-4 text-text text-xs">{formatPence(u.total_spent_pence)}</td>
                                <td className="py-3 px-4">
                                    <span className={`inline-block w-2 h-2 rounded-full ${u.is_suspended ? 'bg-accent' : 'bg-success'}`} />
                                </td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button onClick={() => setPanelUser(u)} className="text-xs text-muted hover:text-text transition-colors">View</button>
                                        <span className="text-border">·</span>
                                        <button onClick={() => openModal(u, 'role')} className="text-xs text-muted hover:text-text transition-colors">Role</button>
                                        {u.id !== currentAdminId && (
                                            <>
                                                <span className="text-border">·</span>
                                                {u.is_suspended
                                                    ? <button onClick={() => openModal(u, 'unsuspend')} className="text-xs text-success hover:underline">Reinstate</button>
                                                    : <button onClick={() => openModal(u, 'suspend')} className="text-xs text-accent hover:underline">Suspend</button>
                                                }
                                                <span className="text-border">·</span>
                                                <button onClick={() => openModal(u, 'impersonate')} className="text-xs text-gold hover:underline">Impersonate</button>
                                            </>
                                        )}
                                        <span className="text-border">·</span>
                                        <button onClick={() => handleResendVerification(u.id)} className="text-xs text-muted hover:text-text transition-colors">Resend Email</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted">Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalRows)} of {totalRows}</p>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => updateParam('page', String(page - 1))}
                            className="text-xs px-3 py-1.5 rounded bg-card border border-border text-muted hover:text-text disabled:opacity-40"
                        >← Prev</button>
                        <span className="text-xs px-3 py-1.5 text-muted">Page {page} of {totalPages}</span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => updateParam('page', String(page + 1))}
                            className="text-xs px-3 py-1.5 rounded bg-card border border-border text-muted hover:text-text disabled:opacity-40"
                        >Next →</button>
                    </div>
                </div>
            )}

            {/* Profile Slide-out Panel */}
            {panelUser && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="flex-1 bg-black/50" onClick={() => setPanelUser(null)} />
                    <div className="w-96 bg-surface border-l border-border flex flex-col overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h3 className="font-heading text-xl text-text">User Profile</h3>
                            <button onClick={() => setPanelUser(null)} className="text-muted hover:text-text text-xl">×</button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <div>
                                <p className="text-xs text-muted mb-1">Full Name</p>
                                <p className="text-text">{panelUser.full_name ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted mb-1">Email</p>
                                <p className="text-text">{panelUser.email ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted mb-1">Role</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_BADGE[panelUser.role]}`}>{panelUser.role}</span>
                            </div>
                            <div>
                                <p className="text-xs text-muted mb-1">Joined</p>
                                <p className="text-text">{fmt(panelUser.created_at)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted mb-1">Status</p>
                                <span className={panelUser.is_suspended ? 'text-accent' : 'text-success'}>
                                    {panelUser.is_suspended ? 'Suspended' : 'Active'}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-muted mb-1">Bookings</p>
                                <p className="text-text">{panelUser.bookings_count} · {formatPence(panelUser.total_spent_pence)} spent</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Role Modal */}
            {modal === 'role' && selectedUser && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-4">Change Role</h3>
                        <p className="text-sm text-muted mb-4">{selectedUser.full_name} · {selectedUser.email}</p>
                        <select
                            value={newRole}
                            onChange={e => setNewRole(e.target.value as UserRole)}
                            className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none mb-4"
                        >
                            <option value="user">User</option>
                            <option value="organiser">Organiser</option>
                            <option value="admin">Admin</option>
                        </select>
                        <div className="flex gap-3">
                            <Button variant="primary" size="md" onClick={handleChangeRole} disabled={loading || newRole === selectedUser.role}>
                                {loading ? 'Saving...' : 'Save Role'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => setModal(null)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Suspend Modal */}
            {modal === 'suspend' && selectedUser && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-4">Suspend Account</h3>
                        <p className="text-sm text-muted mb-4">{selectedUser.full_name} · {selectedUser.email}</p>
                        <textarea
                            value={suspendReason}
                            onChange={e => setSuspendReason(e.target.value)}
                            placeholder="Reason for suspension (required)"
                            rows={3}
                            className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent resize-none mb-4"
                        />
                        <div className="flex gap-3">
                            <Button variant="danger" size="md" onClick={handleSuspend} disabled={loading || !suspendReason.trim()}>
                                {loading ? 'Suspending...' : 'Suspend Account'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => setModal(null)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unsuspend Modal */}
            {modal === 'unsuspend' && selectedUser && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-4">Reinstate Account</h3>
                        <p className="text-sm text-muted mb-6">Reinstate {selectedUser.full_name}? They will be able to log in again.</p>
                        <div className="flex gap-3">
                            <Button variant="primary" size="md" onClick={handleUnsuspend} disabled={loading}>
                                {loading ? 'Reinstating...' : 'Reinstate Account'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => setModal(null)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Impersonate Modal */}
            {modal === 'impersonate' && selectedUser && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-4">Impersonate User</h3>
                        <p className="text-sm text-muted mb-4">
                            You will view the site as <strong className="text-text">{selectedUser.full_name}</strong>.
                            A banner will be shown. This session lasts 1 hour.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="primary" size="md" onClick={handleImpersonate} disabled={loading}>
                                {loading ? 'Starting...' : 'Start Impersonation'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => setModal(null)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
