'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatPence } from '@/lib/fees'

interface BookingData {
    booking_ref: string
    total_pence: number | null
    event: {
        title: string
        start_at: string
        venue_name: string | null
    } | null
    items: { ticket_type: { name: string } | null; quantity: number }[]
}

function SuccessContent() {
    const searchParams = useSearchParams()
    const [booking, setBooking] = useState<BookingData | null>(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function verifyPayment() {
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
            const supabase = createClient()
            let attempts = 0
            const maxAttempts = 10

            while (attempts < maxAttempts) {
                const { data } = await supabase
                    .from('bookings')
                    .select('booking_ref, total_pence, event:events(title, start_at, venue_name), items:booking_items(quantity, ticket_type:ticket_types(name))')
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
                <p className="text-text font-medium">Confirming your booking...</p>
                <p className="text-muted text-sm">This may take a few seconds.</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="max-w-lg mx-auto py-16 text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                    <span className="text-accent text-4xl">✕</span>
                </div>
                <h1 className="font-heading text-4xl text-text">PAYMENT FAILED</h1>
                <p className="text-muted">{error}</p>
                <button
                    onClick={() => window.history.back()}
                    className="h-11 px-8 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition"
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
                <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center animate-bounce">
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
                    <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
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
                                {booking.items.map((item, i) => (
                                    <div key={i} className="flex justify-between">
                                        <span className="text-muted">{item.ticket_type?.name || 'Ticket'}</span>
                                        <span className="text-text">× {item.quantity}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {booking.total_pence && (
                            <div className="border-t border-border pt-4 flex justify-between font-bold">
                                <span>Total paid</span>
                                <span>{formatPence(booking.total_pence)}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <a
                            href={`/api/tickets/${booking.booking_ref}/pdf`}
                            target="_blank"
                            className="h-11 px-6 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition flex items-center justify-center gap-2"
                        >
                            Download Ticket
                        </a>
                        <button
                            disabled
                            className="h-11 px-6 rounded-lg border border-border bg-surface text-muted text-sm font-medium cursor-not-allowed"
                        >
                            Add to Google Wallet
                        </button>
                    </div>
                </>
            )}

            {!booking && (
                <div className="bg-surface border border-border rounded-xl p-6 space-y-2">
                    <p className="text-text font-medium">Payment successful!</p>
                    <p className="text-muted text-sm">Your booking is being processed. Check your email for confirmation details.</p>
                </div>
            )}

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
                <div className="animate-spin h-10 w-10 border-2 border-accent border-t-transparent rounded-full mx-auto" />
            </div>
        }>
            <SuccessContent />
        </Suspense>
    )
}
