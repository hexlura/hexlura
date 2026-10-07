'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatPence } from '@/lib/fees'
import { MetaPixelPurchase } from '@/components/analytics/MetaPixelEvents'

interface BookingData {
    booking_ref: string
    event_id: string
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
            <div className="bg-warm-red/5 rounded-2xl border border-warm-red/20 p-5 text-left text-sm">
                Check your email to confirm and finish setting up your account.
            </div>
        )
    }

    return (
        <form onSubmit={handleSave} className="bg-warm-red/5 rounded-2xl border border-warm-red/20 p-5 text-left">
            <p className="font-semibold text-sm mb-1">Save this booking to an account</p>
            <p className="text-xs text-muted mb-4">Create a free account to track this booking, get faster checkout next time, and manage refunds.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-card border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-warm-red/25"
                />
                <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-card border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-warm-red/25"
                />
            </div>
            {saveError && (
                <p className="text-sm font-semibold text-accent bg-warm-red/10 rounded-lg px-3.5 py-2.5 mb-3">{saveError}</p>
            )}
            <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-full bg-accent text-white text-sm font-semibold shadow-glow hover:brightness-110 transition disabled:opacity-50 disabled:shadow-none"
            >
                {submitting ? 'Saving...' : 'Create Account'}
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
                    .select('booking_ref, event_id, ticket_access_token, total_pence, event:events(title, start_at, venue_name), items:booking_items(quantity, ticket_type:ticket_types(name, is_group, group_size))')
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
                    .select('booking_ref, event_id, ticket_access_token, total_pence, event:events(title, start_at, venue_name), items:booking_items(quantity, ticket_type:ticket_types(name, is_group, group_size))')
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
                <div className="animate-spin h-10 w-10 border-2 border-accent border-t-transparent rounded-full mx-auto" />
                <p className="font-medium">Confirming your booking...</p>
                <p className="text-muted text-sm">This may take a few seconds.</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="max-w-lg mx-auto py-16 text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-warm-red/10 flex items-center justify-center mx-auto">
                    <span className="text-accent text-4xl">✕</span>
                </div>
                <h1 className="font-heading text-4xl tracking-wide">PAYMENT FAILED</h1>
                <p className="text-muted">{error}</p>
                <button
                    onClick={() => window.history.back()}
                    className="px-8 py-3 rounded-full bg-accent text-white font-semibold shadow-glow hover:brightness-110 transition"
                >
                    Try Again
                </button>
            </div>
        )
    }

    const eventDate = booking?.event?.start_at
        ? new Intl.DateTimeFormat('en-GB', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
            timeZone: 'Europe/London',
        }).format(new Date(booking.event.start_at))
        : ''

    const downloadClass = 'flex-1 py-3 rounded-full bg-text text-white text-sm font-semibold hover:bg-black transition flex items-center justify-center'

    return (
        <div className="max-w-xl mx-auto py-10 text-center">
            {/* Checkmark */}
            <div className="w-20 h-20 rounded-full bg-warm-green/15 flex items-center justify-center mx-auto mb-5">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1B9C63" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                </svg>
            </div>

            <h1 className="font-heading text-5xl tracking-wide mb-2">YOU&apos;RE GOING!</h1>
            <p className="text-muted mb-8">Your tickets have been confirmed.</p>

            {booking && (
                <>
                    <MetaPixelPurchase
                        valuePence={booking.total_pence ?? 0}
                        bookingRef={booking.booking_ref}
                        eventId={booking.event_id}
                    />
                    <div className="bg-card rounded-2xl border border-border shadow-card p-6 text-left mb-6">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            {booking.event && (
                                <div className="min-w-0">
                                    <p className="font-semibold">{booking.event.title}</p>
                                    <p className="text-xs text-muted">{[eventDate, booking.event.venue_name].filter(Boolean).join(' · ')}</p>
                                </div>
                            )}
                            <span className="px-2.5 py-1 rounded-full bg-warm-green/15 text-warm-green text-[11px] font-bold shrink-0">CONFIRMED</span>
                        </div>

                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-background mb-4">
                            <span className="text-xs text-muted">Booking Reference</span>
                            <span className="font-mono text-sm font-semibold text-accent">{booking.booking_ref}</span>
                        </div>

                        {booking.items?.length > 0 && (
                            <div className="space-y-1.5 text-sm border-t border-border pt-4">
                                {booking.items.map((item, i) => {
                                    const isGroup = item.ticket_type?.is_group === true
                                    const groupSize = item.ticket_type?.group_size ?? 1
                                    return (
                                        <div key={i} className="flex justify-between">
                                            <span className="text-muted">{item.ticket_type?.name || 'Ticket'}</span>
                                            <span>
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
                            <div className="flex justify-between font-semibold text-base border-t border-border pt-3 mt-3">
                                <span>Total Paid</span>
                                <span className="font-heading text-xl">{formatPence(booking.total_pence)}</span>
                            </div>
                        )}
                    </div>

                    {(() => {
                        const totalTickets = (booking.items ?? []).reduce((sum, item) => sum + item.quantity, 0)
                        return (
                            <div className="flex flex-col sm:flex-row gap-3 mb-3">
                                {totalTickets <= 1 ? (
                                    <a
                                        href={`/api/tickets/${booking.booking_ref}/pdf?token=${booking.ticket_access_token}`}
                                        target="_blank"
                                        className={downloadClass}
                                    >
                                        Download Ticket (PDF)
                                    </a>
                                ) : (
                                    <div className="flex flex-col gap-2 flex-1">
                                        {Array.from({ length: totalTickets }, (_, i) => (
                                            <a
                                                key={i}
                                                href={`/api/tickets/${booking.booking_ref}/pdf?index=${i + 1}&token=${booking.ticket_access_token}`}
                                                target="_blank"
                                                className={downloadClass}
                                            >
                                                Download Ticket {i + 1}
                                            </a>
                                        ))}
                                    </div>
                                )}
                                <Link href="/events" className="flex-1 py-3 rounded-full border border-border text-sm font-semibold hover:bg-background transition flex items-center justify-center self-start sm:self-stretch">
                                    Browse More Events
                                </Link>
                            </div>
                        )
                    })()}
                </>
            )}

            {!booking && (
                <div className="bg-card rounded-2xl border border-border shadow-card p-6 text-left space-y-2 mb-6">
                    <p className="font-semibold">Payment successful!</p>
                    <p className="text-muted text-sm">Your booking is being processed. Check your email for confirmation details.</p>
                    <Link href="/events" className="text-accent font-semibold hover:underline text-sm inline-block pt-2">
                        Browse More Events
                    </Link>
                </div>
            )}

            {isGuest && <div className="mt-8"><SaveBookingPanel /></div>}
        </div>
    )
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={
            <div className="max-w-lg mx-auto py-16 text-center">
                <div className="animate-spin h-10 w-10 border-2 border-accent border-t-transparent rounded-full mx-auto" />
            </div>
        }>
            <SuccessContent />
        </Suspense>
    )
}
