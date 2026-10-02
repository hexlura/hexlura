'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface EventQuickLinksProps {
    eventId: string
    status: string
}

// Quick Links card from the event detail design. Holds the Duplicate / Cancel / Delete
// flows that used to live inline on the events list (logic unchanged).
export function EventQuickLinks({ eventId, status }: EventQuickLinksProps) {
    const [showCancelModal, setShowCancelModal] = useState(false)
    const [cancelling, setCancelling] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteReason, setDeleteReason] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState('')
    const [deleteSuccess, setDeleteSuccess] = useState(false)

    async function handleDuplicate() {
        const res = await fetch(`/api/events/${eventId}/duplicate`, { method: 'POST' })
        if (res.ok) {
            const data = await res.json()
            window.location.href = `/organiser/events/${data.id}`
        }
    }

    async function handleCancel() {
        setCancelling(true)
        await fetch(`/api/events/${eventId}/cancel`, { method: 'POST' })
        setCancelling(false)
        setShowCancelModal(false)
        window.location.reload()
    }

    async function handleDelete() {
        if (!deleteReason.trim()) {
            setDeleteError('Please tell us why you want to delete this event.')
            return
        }
        setDeleting(true)
        setDeleteError('')
        const res = await fetch(`/api/organiser/events/${eventId}/request-deletion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: deleteReason }),
        })
        const json = await res.json()
        setDeleting(false)
        if (!res.ok) {
            setDeleteError(json.error || 'Failed to submit request.')
            return
        }
        setDeleteSuccess(true)
        setTimeout(() => window.location.reload(), 1800)
    }

    const linkClass = 'flex items-center justify-between px-4 py-3 bg-background rounded-xl hover:bg-border transition-colors text-sm font-medium'
    const dangerClass = 'w-full text-left flex items-center justify-between px-4 py-3 bg-warm-red/10 rounded-xl hover:bg-warm-red/20 transition-colors text-sm font-medium text-warm-red'

    return (
        <>
            <div className="bg-card rounded-2xl shadow-card p-6">
                <h2 className="text-sm font-semibold mb-4">Quick Links</h2>
                <div className="flex flex-col gap-2">
                    <Link href={`/organiser/events/${eventId}/attendees`} className={linkClass}>Attendees <span>→</span></Link>
                    <Link href={`/organiser/events/${eventId}/promo-codes`} className={linkClass}>Promo Codes <span>→</span></Link>
                    <Link href={`/organiser/events/${eventId}/checkin`} className={linkClass}>Check-in Scanner <span>→</span></Link>
                    <button type="button" onClick={handleDuplicate} className={`${linkClass} w-full text-left`}>Duplicate Event <span>→</span></button>
                    {!['cancelled', 'ended', 'deleted'].includes(status) && (
                        <button type="button" onClick={() => setShowCancelModal(true)} className={dangerClass}>Cancel Event <span>→</span></button>
                    )}
                    <button
                        type="button"
                        onClick={() => { setShowDeleteModal(true); setDeleteReason(''); setDeleteError(''); setDeleteSuccess(false) }}
                        className={dangerClass}
                    >
                        Delete Event <span>→</span>
                    </button>
                </div>
            </div>

            {/* Cancel confirmation modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl shadow-hover p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-3">Cancel Event?</h3>
                        <p className="text-sm text-muted mb-4">
                            This will cancel the event and notify all attendees by email.
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="danger" size="md" onClick={handleCancel} disabled={cancelling}>
                                {cancelling ? 'Cancelling...' : 'Yes, Cancel Event'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => setShowCancelModal(false)}>Keep Event</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete request modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl shadow-hover p-6 max-w-sm w-full">
                        {deleteSuccess ? (
                            <>
                                <h3 className="font-heading text-xl text-text mb-3">Request Submitted</h3>
                                <p className="text-sm text-muted">
                                    The event has been unpublished and your deletion request is with our team for review.
                                    You&apos;ll be notified once it&apos;s decided.
                                </p>
                            </>
                        ) : (
                            <>
                                <h3 className="font-heading text-xl text-text mb-3">Request to Delete Event?</h3>
                                <p className="text-sm text-muted mb-4">
                                    Event deletions go through admin review. Requesting this will immediately
                                    unpublish the event while it&apos;s reviewed — it is not deleted yet.
                                </p>
                                <label className="block text-xs font-semibold text-text mb-1">Why do you want to delete this event?</label>
                                <textarea
                                    value={deleteReason}
                                    onChange={e => setDeleteReason(e.target.value)}
                                    rows={3}
                                    placeholder="Required — this is shown to our review team"
                                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-text outline-none focus:border-accent resize-y mb-3"
                                />
                                {deleteError && <p className="text-accent text-xs mb-3">{deleteError}</p>}
                                <div className="flex gap-3">
                                    <Button variant="danger" size="md" onClick={handleDelete} disabled={deleting}>
                                        {deleting ? 'Submitting...' : 'Submit Request'}
                                    </Button>
                                    <Button variant="secondary" size="md" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
