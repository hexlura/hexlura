'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCheckout } from '@/lib/checkout-context'
import { createClient } from '@/lib/supabase/client'
import { formatPence } from '@/lib/fees'
import StepPayment from './step-payment'
import { MetaPixelInitiateCheckout } from '@/components/analytics/MetaPixelEvents'

const STEP_LABELS = ['Tickets', 'Your Details', 'Payment']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function CheckoutFlow() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { state, setItems, setEventInfo, setAttendeeDetails, setPromo, setStep, ticketSubtotalPence, discountPence, bookingFeePence, processingFeePence, lineTotalsPence, totalPence } = useCheckout()
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
                    items: state.items.map(i => ({ ticket_type_id: i.ticket_type_id, price_pence: i.price_pence, quantity: i.quantity })),
                    email: state.attendeeDetails.email || undefined,
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
            <div className="max-w-md mx-auto py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                    <span className="text-accent text-2xl">!</span>
                </div>
                <p className="font-medium">{error}</p>
                <a href="/events" className="text-accent font-semibold hover:underline text-sm">Browse events</a>
            </div>
        )
    }

    if (needsAuthChoice) {
        return (
            <div className="max-w-sm mx-auto py-10">
                <div className="bg-card rounded-3xl border border-border shadow-card p-8 space-y-6">
                    <div>
                        <h1 className="font-heading text-3xl tracking-wide mb-1">CHECKOUT</h1>
                        <p className="text-muted text-sm">How would you like to continue?</p>
                    </div>
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={continueAsGuest}
                            disabled={startingGuest}
                            className="w-full py-3 rounded-full bg-accent text-white font-semibold shadow-glow hover:brightness-110 transition disabled:opacity-60 disabled:shadow-none"
                        >
                            {startingGuest ? 'Starting...' : 'Continue as Guest'}
                        </button>
                        <button
                            type="button"
                            onClick={logInInstead}
                            disabled={startingGuest}
                            className="w-full py-3 rounded-full border border-border text-sm font-semibold hover:bg-background transition disabled:opacity-50"
                        >
                            Log In to My Account
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // 0 = Tickets (done before checkout), 1 = Your Details, 2 = Payment
    const currentStep = state.step === 1 && !proceedToPayment ? 1 : 2
    const fieldClass = 'w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/25'
    const labelClass = 'text-xs font-semibold text-muted mb-1.5 block'

    return (
        <div className="max-w-5xl mx-auto">
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-4 pb-8">
                {STEP_LABELS.map((label, i) => {
                    const isActive = currentStep === i
                    const isComplete = i < currentStep
                    return (
                        <div key={label} className="flex items-center gap-4">
                            {i > 0 && <div className="w-10 h-px bg-border" />}
                            <div className="flex items-center gap-2">
                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                    isComplete ? 'bg-warm-green text-white' :
                                    isActive ? 'bg-accent text-white' :
                                    'bg-border text-muted'
                                }`}>
                                    {isComplete ? '✓' : i + 1}
                                </span>
                                <span className={`text-sm ${isActive || isComplete ? 'font-semibold' : 'font-medium text-muted'}`}>{label}</span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Pre-payment: details + comp/promo code. StepPayment only mounts after proceedToPayment.
                Covers both partial discounts and 100%-off codes: when a code fully covers the ticket
                subtotal, create-intent bypasses Stripe entirely and confirms the booking directly. */}
            {state.step === 1 && !proceedToPayment && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 pb-16">
                    <div>
                        <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
                            <h2 className="font-heading text-2xl tracking-wide mb-1">YOUR DETAILS</h2>
                            <p className="text-sm text-muted mb-5">We&apos;ll send your tickets to this email.</p>

                            {needsDetailsForm ? (
                                <>
                                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-background border border-border mb-5">
                                        <p className="text-sm">Already have an account?</p>
                                        <button type="button" onClick={logInInstead} className="text-sm font-semibold text-accent hover:underline">Log In</button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                                        <div>
                                            <label className={labelClass}>Full Name</label>
                                            <input
                                                type="text"
                                                value={state.attendeeDetails.full_name}
                                                onChange={e => setAttendeeDetails({ ...state.attendeeDetails, full_name: e.target.value })}
                                                placeholder="Jane Smith"
                                                className={fieldClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Email</label>
                                            <input
                                                type="email"
                                                value={state.attendeeDetails.email}
                                                onChange={e => setAttendeeDetails({ ...state.attendeeDetails, email: e.target.value })}
                                                placeholder="jane@example.com"
                                                className={fieldClass}
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className={labelClass}>Phone <span className="font-normal">(optional)</span></label>
                                            <input
                                                type="tel"
                                                value={state.attendeeDetails.phone}
                                                onChange={e => setAttendeeDetails({ ...state.attendeeDetails, phone: e.target.value })}
                                                placeholder="+44 7…"
                                                className={fieldClass}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="px-4 py-3 rounded-xl bg-background border border-border mb-5 text-sm">
                                    Booking as <span className="font-semibold">{state.attendeeDetails.full_name || state.attendeeDetails.email}</span>
                                    {state.attendeeDetails.full_name && <span className="text-muted"> · {state.attendeeDetails.email}</span>}
                                </div>
                            )}

                            {/* Promo / comp code */}
                            <div className="mb-6">
                                <label className={labelClass}>Promo / Comp Code</label>
                                {state.promo ? (
                                    <div className="bg-success/10 rounded-lg px-3.5 py-2.5 text-sm text-success flex items-center justify-between gap-3">
                                        <span>
                                            Code <span className="font-mono font-bold">{state.promo.code}</span> applied
                                        </span>
                                        <button type="button" onClick={removePromoCode} className="underline shrink-0 text-xs font-semibold">
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
                                            placeholder="Enter code"
                                            className={`${fieldClass} flex-1`}
                                        />
                                        <button
                                            type="button"
                                            onClick={applyPromoCode}
                                            disabled={promoValidating || !promoInput.trim()}
                                            className="px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-background transition disabled:opacity-50"
                                        >
                                            {promoValidating ? '...' : 'Apply'}
                                        </button>
                                    </div>
                                )}
                                {promoError && <p className="text-xs font-semibold text-accent mt-2">{promoError}</p>}
                            </div>

                            {needsDetailsForm && !detailsValid && (
                                <p className="text-xs text-muted text-center mb-3">Please fill in your name and a valid email above to continue.</p>
                            )}
                            <button
                                type="button"
                                onClick={() => setProceedToPayment(true)}
                                disabled={!detailsValid}
                                className="block w-full py-3.5 rounded-full bg-accent text-white font-semibold text-center shadow-glow hover:brightness-110 transition disabled:opacity-50 disabled:shadow-none"
                            >
                                Continue to Payment →
                            </button>
                        </div>
                    </div>

                    {/* Order summary */}
                    <div>
                        <div className="bg-card rounded-2xl border border-border shadow-soft p-5 lg:sticky lg:top-24">
                            <h3 className="font-heading text-lg tracking-wide mb-4">ORDER SUMMARY</h3>
                            <div className="mb-4">
                                <p className="font-semibold text-sm">{state.eventTitle}</p>
                                <p className="text-xs text-muted">{[state.eventDate, state.venueName].filter(Boolean).join(' · ')}</p>
                            </div>
                            <div className="space-y-1.5 text-sm border-t border-border pt-4">
                                {state.items.map((item, i) => (
                                    <div key={item.ticket_type_id} className="flex justify-between">
                                        <span className="text-muted">{item.ticket_name} × {item.quantity}</span>
                                        <span>{formatPence(lineTotalsPence[i])}</span>
                                    </div>
                                ))}
                                {discountPence > 0 && (
                                    <div className="flex justify-between text-success">
                                        <span>Discount ({state.promo?.code})</span>
                                        <span>-{formatPence(discountPence)}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between font-semibold text-base border-t border-border pt-3 mt-3">
                                <span>Total</span>
                                <span className="font-heading text-xl">
                                    {formatPence(ticketSubtotalPence - discountPence <= 0 ? 0 : (ticketSubtotalPence > 0 ? totalPence : ticketSubtotalPence))}
                                </span>
                            </div>
                            {/* One combined figure; buyers don't need the booking/processing split */}
                            {ticketSubtotalPence - discountPence > 0 && bookingFeePence + processingFeePence > 0 && (
                                <p className="text-xs text-muted text-right mt-1">incl. {formatPence(bookingFeePence + processingFeePence)} fee</p>
                            )}
                        </div>
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
