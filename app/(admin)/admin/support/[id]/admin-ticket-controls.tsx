'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
    SUPPORT_STATUSES, SUPPORT_PRIORITIES,
    type SupportStatus, type SupportPriority,
} from '@/lib/support'

interface Props {
    ticketId: string
    initialStatus: SupportStatus
    initialPriority: SupportPriority
}

export function AdminTicketControls({ ticketId, initialStatus, initialPriority }: Props) {
    const router = useRouter()
    const [status, setStatus] = useState<SupportStatus>(initialStatus)
    const [priority, setPriority] = useState<SupportPriority>(initialPriority)
    const [savingMeta, setSavingMeta] = useState(false)
    const [metaError, setMetaError] = useState('')

    const [reply, setReply] = useState('')
    const [sending, setSending] = useState(false)
    const [replyError, setReplyError] = useState('')

    const updateMeta = async (next: Partial<{ status: SupportStatus; priority: SupportPriority }>) => {
        setSavingMeta(true)
        setMetaError('')
        try {
            const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(next),
            })
            const data = await res.json()
            if (!res.ok) {
                setMetaError(data.error || 'Update failed')
            } else {
                router.refresh()
            }
        } catch (err) {
            console.error(err)
            setMetaError('Network error')
        } finally {
            setSavingMeta(false)
        }
    }

    const handleStatusChange = (next: SupportStatus) => {
        setStatus(next)
        updateMeta({ status: next })
    }

    const handlePriorityChange = (next: SupportPriority) => {
        setPriority(next)
        updateMeta({ priority: next })
    }

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault()
        setReplyError('')
        if (reply.trim().length < 1) {
            setReplyError('Message cannot be empty')
            return
        }
        setSending(true)
        try {
            const res = await fetch(`/api/support/tickets/${ticketId}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: reply.trim() }),
            })
            const data = await res.json()
            if (!res.ok) {
                setReplyError(data.error || 'Failed to send')
                setSending(false)
                return
            }
            setReply('')
            setSending(false)
            router.refresh()
        } catch (err) {
            console.error(err)
            setReplyError('Network error')
            setSending(false)
        }
    }

    const selectClass = 'w-full bg-white border border-border text-text text-sm px-2 py-1.5 focus:outline-none focus:border-accent disabled:opacity-60'

    return (
        <>
            <div className="bg-card border border-border p-4 space-y-3">
                <div>
                    <label className="block text-xs text-muted uppercase tracking-wider mb-1">Status</label>
                    <select
                        value={status}
                        onChange={e => handleStatusChange(e.target.value as SupportStatus)}
                        disabled={savingMeta}
                        className={selectClass}
                    >
                        {SUPPORT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-muted uppercase tracking-wider mb-1">Priority</label>
                    <select
                        value={priority}
                        onChange={e => handlePriorityChange(e.target.value as SupportPriority)}
                        disabled={savingMeta}
                        className={selectClass}
                    >
                        {SUPPORT_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                </div>
                {metaError && <p className="text-xs text-accent">{metaError}</p>}
            </div>

            <form onSubmit={handleReply} className="bg-card border border-border p-4 space-y-3">
                <label className="block text-xs text-muted uppercase tracking-wider">Admin reply</label>
                <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    maxLength={5000}
                    rows={6}
                    placeholder="Reply to the user…"
                    disabled={status === 'closed'}
                    className="w-full bg-background border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent resize-y disabled:opacity-60"
                />
                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted">{reply.length} / 5000</p>
                    <button
                        type="submit"
                        disabled={sending || reply.trim().length === 0 || status === 'closed'}
                        className="px-4 py-2 bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {sending ? 'Sending…' : 'Send'}
                    </button>
                </div>
                {status === 'closed' && (
                    <p className="text-xs text-muted">Reopen the ticket (set status to Open) to reply.</p>
                )}
                {replyError && <p className="text-xs text-accent">{replyError}</p>}
            </form>
        </>
    )
}
