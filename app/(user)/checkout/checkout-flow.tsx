'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCheckout } from '@/lib/checkout-context'
import { createClient } from '@/lib/supabase/client'
import { formatPence } from '@/lib/fees'
import StepPayment from './step-payment'
import { MetaPixelInitiateCheckout } from '@/components/analytics/MetaPixelEvents'

const STEP_LABELS = ['Payment', 'Confirmation']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function CheckoutFlow() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { state, setItems, setEventInfo, setAttendeeDetails, setPromo, setStep, ticketSubtotalPence, discountPence, bookingFeePence, processingFeePence, totalPence } = useCheckout()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    // Shown when the visitor has no session at all — choose to continue as guest
    // (silent Supabase anonymous auth) or log in to an existing account.
    const [needsAuthChoice, setNeedsAuthChoice] = useState(false)
    const [startingGuest, setStartingGuest] = useState(false)
    // Set once when event data loads — whether to show the attendee-details form.
    // Derived from state.attendeeDetails.email would flicker the form away as soon
    // as the guest starts typing their email, so this is captured once at load time.
    const [needsDetailsForm, setNeedsDetailsForm] = useState(false)

    // StepPayment does not mount until proceedToPayment is true
    const [proceedToPayment, setProceedToPayment] = useState(false)
    const [promoInput, setPromoInput] = useState('')
    const [promoError, setPromoError] = useState('')
    const [promoValidating, setPromoValidating] = useState(false)

    async function applyPromoCode() {
        const trimmed = promoInput.trim()
        if (!trimmed) return
        setPromoError('')
        setPromoValidating(true)
        try {
            const res = await fetch('/api/promo/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: trimmed,
                    event_id: state.eventId,
                    ticket_subtotal_pence: ticketSubtotalPence,
                }),
            })
            const data = await res.json()
            if (data.valid) {
                setPromo({
                    code: trimmed.toUpperCase(),
                    code_id: data.code_id,
                    discount_pence: data.discount_pence,
                    discount_type: data.discount_type,
                    discount_value: data.discount_value,
                })
                setPromoError('')
            } else {
                setPromoError(data.error || 'Invalid or expired code')
                setPromo(null)
            }
        } catch {
            setPromoError('Network error. Please try again.')
        }
        setPromoValidating(false)
    }

    function removePromoCode() {
        setPromo(null)
        setPromoInput('')
        setPromoError('')
    }

    async function loadEventData() {
        const eventId = searchParams.get('event_id')
        const ticketsParam = searchParams.get('tickets') // format: typeId:qty,typeId:qty

        if (!eventId || !ticketsParam) {
            setError('Invalid checkout link. Please select tickets from an event page.')
            setLoading(false)
            return
        }

        const supabase = createClient()

        const { data: event } = await supabase
            .from('events')
            .select('id, title, start_at, end_at, venue_name, venue_address')
            .eq('id', eventId)
            .single()

        if (!event) {
            setError('Event not found.')
            setLoading(false)
            return
        }

        const ticketPairs = ticketsParam.split(',').map((pair) => {
            const [id, qty] = pair.split(':')
            return { ticket_type_id: id, quantity: parseInt(qty) || 0 }
        }).filter(p => p.quantity > 0)

        if (!ticketPairs.length) {
            setError('No tickets selected.')
            setLoading(false)
            return
        }

        // Fetch ticket type details
        const { data: ticketTypes } = await supabase
            .from('ticket_types')
            .select('id, name, price_pence')
            .in('id', ticketPairs.map(p => p.ticket_type_id))

        if (!ticketTypes?.length) {
            setError('Ticket types not found.')
            setLoading(false)
            return
        }

        const items = ticketPairs.map((pair) => {
            const tt = ticketTypes.find(t => t.id === pair.ticket_type_id)
            return {
                ticket_type_id: pair.ticket_type_id,
                ticket_name: tt?.name || 'Ticket',
                quantity: pair.quantity,
                price_pence: tt?.price_pence || 0,
            }
        })

        const eventDate = new Intl.DateTimeFormat('en-GB', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        }).format(new Date(event.start_at))

        const eventTime = new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
        }).format(new Date(event.start_at))

        setEventInfo({
            eventId: event.id,
            eventTitle: event.title,
            eventDate,
            eventTime,
            venueName: event.venue_name || 'TBC',
        })
        setItems(items)

        // Auto-populate attendee details from the logged-in (or already-guest) user's profile.
        // For a fresh anonymous guest this profile is empty — the inline details form below
        // collects it instead.
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, phone')
                .eq('id', user.id)
                .single()
            setAttendeeDetails({
                full_name: (profile as { full_name?: string; phone?: string } | null)?.full_name || '',
                email: user.email || '',
                phone: (profile as { full_name?: string; phone?: string } | null)?.phone || '',
            })
            setNeedsDetailsForm(!user.email)
        } else {
            setNeedsDetailsForm(true)
        }

        setStep(1)
        setLoading(false)
    }

    useEffect(() => {
        async function init() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await loadEventData()
            } else {
                setNeedsAuthChoice(true)
                setLoading(false)
            }
        }

        init()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function continueAsGuest() {
        setStartingGuest(true)
        const supabase = createClient()
        const { error: signInError } = await supabase.auth.signInAnonymously()
        if (signInError) {
            console.error('signInAnonymously failed:', signInError.status, signInError.message, signInError)
            setError(`Unable to start checkout (${signInError.status ?? '?'}: ${signInError.message}).`)
            setStartingGuest(false)
            return
        }
        setNeedsAuthChoice(false)
        setLoading(true)
        await loadEventData()
    }

    function logInInstead() {
        const next = `/checkout?${searchParams.toString()}`
        router.push(`/auth/login?next=${encodeURIComponent(next)}`)
    }

    const detailsValid = !needsDetailsForm || (
        state.attendeeDetails.full_name.trim().length > 0 &&
        EMAIL_RE.test(state.attendeeDetails.email)
    )

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto py-12 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full mx-auto" />
                <p className="text-muted mt-4">Loading checkout...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                    <span className="text-accent text-2xl">!</span>
                </div>
                <p className="text-text font-medium">{error}</p>
                <a href="/events" className="text-accent hover:underline text-sm">Browse events</a>
            </div>
        )
    }

    if (needsAuthChoice) {
        return (
            <div className="max-w-sm mx-auto py-16 space-y-6">
                <div className="text-center space-y-1">
                    <h1 className="font-heading text-3xl text-text">CHECKOUT</h1>
                    <p className="text-muted text-sm">How would you like to continue?</p>
                </div>
                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={continueAsGuest}
                        disabled={startingGuest}
                        className="w-full h-12 rounded-sm bg-[#0A0A0F] text-white font-semibold text-sm hover:bg-[#2a2a3f] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {startingGuest ? 'Starting...' : 'Continue as Guest'}
                    </button>
                    <button
                        type="button"
                        onClick={logInInstead}
                        disabled={startingGuest}
                        className="w-full h-12 rounded-sm border border-border text-text font-semibold text-sm hover:border-accent transition disabled:opacity-50"
                    >
                        Log In to My Account
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto py-8 space-y-8">
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2">
                {STEP_LABELS.map((label, i) => {
                    const stepNum = i + 1
                    const isActive = state.step === stepNum
                    const isComplete = state.step > stepNum
                    return (
                        <div key={label} className="flex items-center gap-2">
                            {i > 0 && <div className={`w-8 h-px ${isComplete ? 'bg-accent' : 'bg-border'}`} />}
                            <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                    isActive ? 'bg-accent text-white' :
                                    isComplete ? 'bg-accent/20 text-accent' :
                                    'bg-surface border border-border text-muted'
                                }`}>
                                    {isComplete ? '✓' : stepNum}
                                </div>
                                <span className={`text-sm font-medium ${isActive ? 'text-text' : 'text-muted'}`}>{label}</span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Pre-payment: comp code entry. StepPayment only mounts after proceedToPayment. */}
            {state.step === 1 && !proceedToPayment && (
                <div className="space-y-6">
                    {/* Order summary — includes promo code entry inline, no separate box.
                        Covers both partial discounts and 100%-off codes: when a code fully
                        covers the ticket subtotal, create-intent bypasses Stripe entirely and
                        confirms the booking directly. */}
                    <div className="bg-surface border border-border rounded-none p-5 text-sm space-y-2">
                        <p className="font-bold text-text text-base">{state.eventTitle}</p>
                        <p className="text-muted text-xs">{state.eventDate} · {state.venueName}</p>
                        <div className="border-t border-border pt-3 space-y-1">
                            {state.items.map(item => (
                                <div key={item.ticket_type_id} className="flex justify-between">
                                    <span className="text-muted">{item.ticket_name} × {item.quantity}</span>
                                    <span className="text-text">{formatPence(item.price_pence * item.quantity)}</span>
                                </div>
                            ))}
                            {bookingFeePence > 0 && (
                                <div className="flex justify-between text-muted">
                                    <span>Booking fee</span>
                                    <span>{formatPence(bookingFeePence)}</span>
                                </div>
                            )}
                            {processingFeePence > 0 && (
                                <div className="flex justify-between text-muted">
                                    <span>Order processing fee</span>
                                    <span>{formatPence(processingFeePence)}</span>
                                </div>
                            )}
                            {discountPence > 0 && (
                                <div className="flex justify-between text-success">
                                    <span>Discount ({state.promo?.code})</span>
                                    <span>-{formatPence(discountPence)}</span>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-border pt-3">
                            {state.promo ? (
                                <div className="bg-success/10 border border-success/20 rounded-none px-3 py-2 text-xs text-success flex items-center justify-between gap-3">
                                    <span>
                                        Code <span className="font-mono font-bold">{state.promo.code}</span> applied
                                    </span>
                                    <button type="button" onClick={removePromoCode} className="underline shrink-0">
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={promoInput}
                                        onChange={e => setPromoInput(e.target.value.toUpperCase())}
                                        onKeyDown={e => e.key === 'Enter' && applyPromoCode()}
                                        placeholder="Promo code"
                                        className="flex-1 bg-surface border border-border rounded-none px-3 py-2 text-xs text-text placeholder:text-muted focus:outline-none focus:border-accent"
                                    />
                                    <button
                                        type="button"
                                        onClick={applyPromoCode}
                                        disabled={promoValidating || !promoInput.trim()}
                                        className="px-4 border border-border text-xs text-muted hover:text-text hover:border-accent transition disabled:opacity-50"
                                    >
                                        {promoValidating ? '...' : 'Apply'}
                                    </button>
                                </div>
                            )}
                            {promoError && (
                                <p className="text-xs text-accent mt-2">{promoError}</p>
                            )}
                        </div>

                        <div className="border-t border-border pt-2 flex justify-between font-bold">
                            <span className="text-text">Total</span>
                            <span className="text-text">
                                {formatPence(ticketSubtotalPence - discountPence <= 0 ? 0 : (ticketSubtotalPence > 0 ? totalPence : ticketSubtotalPence))}
                            </span>
                        </div>
                    </div>

                    {/* Attendee details — only shown when nothing was prefilled from a profile
                        (i.e. a guest checking out anonymously). Logged-in users with an email
                        keep the existing silent-prefill behaviour untouched. */}
                    {needsDetailsForm && (
                        <div className="bg-surface border border-border rounded-none p-5 space-y-4">
                            <div>
                                <p className="text-sm font-semibold text-text mb-1">Your details</p>
                                <p className="text-xs text-muted">We&apos;ll send your tickets to this email.</p>
                            </div>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={state.attendeeDetails.full_name}
                                    onChange={e => setAttendeeDetails({ ...state.attendeeDetails, full_name: e.target.value })}
                                    placeholder="Full name"
                                    className="w-full bg-surface border border-border rounded-none px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
                                />
                                <input
                                    type="email"
                                    value={state.attendeeDetails.email}
                                    onChange={e => setAttendeeDetails({ ...state.attendeeDetails, email: e.target.value })}
                                    placeholder="Email address"
                                    className="w-full bg-surface border border-border rounded-none px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
                                />
                                <input
                                    type="tel"
                                    value={state.attendeeDetails.phone}
                                    onChange={e => setAttendeeDetails({ ...state.attendeeDetails, phone: e.target.value })}
                                    placeholder="Phone number (optional)"
                                    className="w-full bg-surface border border-border rounded-none px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        {needsDetailsForm && !detailsValid && (
                            <p className="text-xs text-muted text-center">Please fill in your name and a valid email above to continue.</p>
                        )}
                        <button
                            type="button"
                            onClick={() => setProceedToPayment(true)}
                            disabled={!detailsValid}
                            className="w-full h-12 rounded-sm bg-[#0A0A0F] text-white font-semibold text-sm hover:bg-[#2a2a3f] transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continue to Payment →
                        </button>
                    </div>
                </div>
            )}

            {state.step === 1 && proceedToPayment && (
                <>
                    <MetaPixelInitiateCheckout
                        valuePence={totalPence}
                        numItems={state.items.reduce((s, i) => s + i.quantity, 0)}
                    />
                    <StepPayment />
                </>
            )}
        </div>
    )
}
