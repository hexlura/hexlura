'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatPence } from '@/lib/fees'
import { MetaPixelPurchase } from '@/components/analytics/MetaPixelEvents'

interface BookingData {
    booking_ref: string
    ticket_access_token: string | null
    total_pence: number | null
    event: {
        title: string
        start_at: string
        venue_name: string | null
    } | null
    items: { ticket_type: { name: string; is_group: boolean | null; group_size: number | null } | null; quantity: number }[]
}

function SaveBookingPanel() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [done, setDone] = useState(false)
    const [saveError, setSaveError] = useState('')

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        setSaveError('')
        const supabase = createClient()
        const { error: updateError } = await supabase.auth.updateUser(
            { email, password },
            { emailRedirectTo: `${window.location.origin}/auth/callback?next=/bookings` }
        )
        if (updateError) {
            setSaveError(updateError.message || 'Could not save your account. Please try again.')
            setSubmitting(false)
            return
        }
        setDone(true)
        setSubmitting(false)
    }

    if (done) {
        return (
            <div className="bg-surface border border-border rounded-none p-6 text-sm text-text">
                Check your email to confirm and finish setting up your account.
            </div>
        )
    }

    return (
        <form onSubmit={handleSave} className="bg-surface border border-border rounded-none p-6 space-y-4 text-left">
            <div>
                <p className="text-sm font-semibold text-text">Save this booking to an account</p>
                <p className="text-xs text-muted mt-1">Create a password so you can manage this booking anytime.</p>
            </div>
            <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-surface border border-border rounded-none px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
            />
            <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full bg-surface border border-border rounded-none px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
            />
            {saveError && (
                <p className="text-sm text-accent bg-accent/10 border border-accent/20 rounded-none px-4 py-2">{saveError}</p>
            )}
            <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-sm bg-[#0A0A0F] text-white font-semibold text-sm hover:bg-[#2a2a3f] transition disabled:opacity-50"
            >
                {submitting ? 'Saving...' : 'Save Account'}
            </button>
        </form>
    )
}

function SuccessContent() {
    const searchParams = useSearchParams()
    const [booking, setBooking] = useState<BookingData | null>(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [isGuest, setIsGuest] = useState(false)

    useEffect(() => {
        async function verifyPayment() {
            const supabase = createClient()

            const { data: { user } } = await supabase.auth.getUser()
            setIsGuest(!!user?.is_anonymous)

            // Free booking path — booking_ref passed directly
            const bookingRef = searchParams.get('booking_ref')
            if (bookingRef) {
                const { data } = await supabase
                    .from('bookings')
                    .select('booking_ref, ticket_access_token, total_pence, event:events(title, start_at, venue_name), items:booking_items(quantity, ticket_type:ticket_types(name, is_group, group_size))')
                    .eq('booking_ref', bookingRef)
                    .eq('status', 'confirmed')
                    .single()

                if (data) {
                    setBooking(data as unknown as BookingData)
                } else {
                    setError('Booking not found. Please check your email for confirmation.')
                }
                setLoading(false)
                return
            }

            // Stripe payment path
            const paymentIntent = searchParams.get('payment_intent')
            const redirectStatus = searchParams.get('redirect_status')

            if (redirectStatus !== 'succeeded') {
                setError('Payment was not successful. Please try again.')
                setLoading(false)
                return
            }

            if (!paymentIntent) {
                setError('No payment information found.')
                setLoading(false)
                return
            }

            // Poll for booking (webhook may take a moment)
            let attempts = 0
            const maxAttempts = 10

            while (attempts < maxAttempts) {
                const { data } = await supabase
                    .from('bookings')
                    .select('booking_ref, ticket_access_token, total_pence, event:events(title, start_at, venue_name), items:booking_items(quantity, ticket_type:ticket_types(name, is_group, group_size))')
                    .eq('stripe_payment_intent_id', paymentIntent)
                    .eq('status', 'confirmed')
                    .single()

                if (data) {
                    setBooking(data as unknown as BookingData)
                    setLoading(false)
                    return
                }

                attempts++
                await new Promise((r) => setTimeout(r, 1500))
            }

            // Even if we can't find the booking yet, payment succeeded
            setBooking(null)
            setLoading(false)
        }

        verifyPayment()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (loading) {
        return (
            <div className="max-w-lg mx-auto py-16 text-center space-y-4">
                <div className="animate-spin h-10 w-10 border-2 border-accent border-t-transparent rounded-none mx-auto" />
                <p className="text-text font-medium">Confirming your booking...</p>
                <p className="text-muted text-sm">This may take a few seconds.</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="max-w-lg mx-auto py-16 text-center space-y-6">
                <div className="w-20 h-20 rounded-none bg-accent/10 flex items-center justify-center mx-auto">
                    <span className="text-accent text-4xl">✕</span>
                </div>
                <h1 className="font-heading text-4xl text-text">PAYMENT FAILED</h1>
                <p className="text-muted">{error}</p>
                <button
                    onClick={() => window.history.back()}
                    className="h-11 px-8 rounded-sm bg-[#0A0A0F] text-white font-semibold text-sm hover:bg-[#2a2a3f] transition"
                >
                    Try Again
                </button>
            </div>
        )
    }

    const eventDate = booking?.event?.start_at
        ? new Intl.DateTimeFormat('en-GB', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
        }).format(new Date(booking.event.start_at))
        : ''

    return (
        <div className="max-w-lg mx-auto py-16 text-center space-y-8">
            {/* Animated checkmark */}
            <div className="relative w-20 h-20 mx-auto">
                <div className="w-20 h-20 rounded-none bg-success/20 flex items-center justify-center animate-bounce">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                        <path d="M20 6 9 17l-5-5" />
                    </svg>
                </div>
            </div>

            <div className="space-y-2">
                <h1 className="font-heading text-5xl text-text">YOU&apos;RE GOING!</h1>
                <p className="text-muted">Your tickets have been confirmed.</p>
            </div>

            {booking && (
                <>
                    <MetaPixelPurchase
                        valuePence={booking.total_pence ?? 0}
                        bookingRef={booking.booking_ref}
                    />
                    <div className="bg-surface border border-border rounded-none p-6 space-y-4">
                        <p className="text-xs text-muted uppercase tracking-wider">Booking Reference</p>
                        <p className="text-3xl font-bold text-accent font-mono tracking-wider">{booking.booking_ref}</p>

                        {booking.event && (
                            <div className="border-t border-border pt-4 space-y-1 text-sm">
                                <p className="font-semibold text-text text-lg">{booking.event.title}</p>
                                <p className="text-muted">{eventDate}</p>
                                <p className="text-muted">{booking.event.venue_name}</p>
                            </div>
                        )}

                        {booking.items?.length > 0 && (
                            <div className="border-t border-border pt-4 space-y-1 text-sm">
                                {booking.items.map((item, i) => {
                                    const isGroup = item.ticket_type?.is_group === true
                                    const groupSize = item.ticket_type?.group_size ?? 1
                                    return (
                                        <div key={i} className="flex justify-between">
                                            <span className="text-muted">{item.ticket_type?.name || 'Ticket'}</span>
                                            <span className="text-text">
                                                {isGroup
                                                    ? `× ${item.quantity} group (${item.quantity * groupSize} people)`
                                                    : `× ${item.quantity}`}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {booking.total_pence != null && booking.total_pence > 0 && (
                            <div className="border-t border-border pt-4 flex justify-between font-bold">
                                <span>Total paid</span>
                                <span>{formatPence(booking.total_pence)}</span>
                            </div>
                        )}
                    </div>

                    {(() => {
                        const totalTickets = (booking.items ?? []).reduce((sum, item) => sum + item.quantity, 0)
                        return (
                            <div className="flex flex-col gap-2">
                                {totalTickets <= 1 ? (
                                    <a
                                        href={`/api/tickets/${booking.booking_ref}/pdf?token=${booking.ticket_access_token}`}
                                        target="_blank"
                                        className="h-11 px-6 rounded-sm bg-[#0A0A0F] text-white font-semibold text-sm hover:bg-[#2a2a3f] transition flex items-center justify-center gap-2"
                                    >
                                        Download Ticket
                                    </a>
                                ) : (
                                    Array.from({ length: totalTickets }, (_, i) => (
                                        <a
                                            key={i}
                                            href={`/api/tickets/${booking.booking_ref}/pdf?index=${i + 1}&token=${booking.ticket_access_token}`}
                                            target="_blank"
                                            className="h-11 px-6 rounded-sm bg-[#0A0A0F] text-white font-semibold text-sm hover:bg-[#2a2a3f] transition flex items-center justify-center"
                                        >
                                            Download Ticket {i + 1}
                                        </a>
                                    ))
                                )}
                            </div>
                        )
                    })()}
                </>
            )}

            {!booking && (
                <div className="bg-surface border border-border rounded-none p-6 space-y-2">
                    <p className="text-text font-medium">Payment successful!</p>
                    <p className="text-muted text-sm">Your booking is being processed. Check your email for confirmation details.</p>
                </div>
            )}

            {isGuest && <SaveBookingPanel />}

            <Link href="/events" className="text-accent hover:underline text-sm font-medium inline-block">
                Browse More Events
            </Link>
        </div>
    )
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={
            <div className="max-w-lg mx-auto py-16 text-center">
                <div className="animate-spin h-10 w-10 border-2 border-accent border-t-transparent rounded-none mx-auto" />
            </div>
        }>
            <SuccessContent />
        </Suspense>
    )
}
