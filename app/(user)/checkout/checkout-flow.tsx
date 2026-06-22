'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useCheckout } from '@/lib/checkout-context'
import { createClient } from '@/lib/supabase/client'
import { formatPence } from '@/lib/fees'
import StepPayment from './step-payment'

const STEP_LABELS = ['Payment', 'Confirmation']

export default function CheckoutFlow() {
    const searchParams = useSearchParams()
    const { state, setItems, setEventInfo, setAttendeeDetails, setStep, ticketSubtotalPence, bookingFeePence, processingFeePence, totalPence } = useCheckout()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Pre-payment comp code state — StepPayment does not mount until proceedToPayment is true
    const [proceedToPayment, setProceedToPayment] = useState(false)
    const [compCodeInput, setCompCodeInput] = useState('')
    const [compApplied, setCompApplied] = useState<{ code: string; codeId: string } | null>(null)
    const [compError, setCompError] = useState('')
    const [compValidating, setCompValidating] = useState(false)
    const [compAgreed, setCompAgreed] = useState(false)
    const [confirmingComp, setConfirmingComp] = useState(false)

    async function applyCompCode() {
        const trimmed = compCodeInput.trim()
        if (!trimmed) return
        setCompError('')
        setCompValidating(true)
        try {
            const res = await fetch('/api/checkout/validate-comp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: trimmed, event_id: state.eventId }),
            })
            const data = await res.json()
            if (data.valid) {
                setCompApplied({ code: trimmed.toUpperCase(), codeId: data.code_id })
                setCompError('')
            } else {
                setCompError(data.error || 'Invalid or expired code')
            }
        } catch {
            setCompError('Network error. Please try again.')
        }
        setCompValidating(false)
    }

    async function handleCompBooking() {
        if (!compApplied || !compAgreed) return
        setConfirmingComp(true)
        setCompError('')
        try {
            const res = await fetch('/api/bookings/complimentary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_id: state.eventId,
                    comp_code_id: compApplied.codeId,
                    items: state.items.map(i => ({ ticket_type_id: i.ticket_type_id, quantity: i.quantity })),
                    attendee_details: state.attendeeDetails,
                }),
            })
            const data = await res.json()
            if (res.ok && data.booking_ref) {
                window.location.href = `/checkout/success?booking_ref=${data.booking_ref}`
            } else {
                setCompError(data.error || 'Booking failed. Please try again.')
                setConfirmingComp(false)
            }
        } catch {
            setCompError('Network error. Please try again.')
            setConfirmingComp(false)
        }
    }

    useEffect(() => {
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

            // Auto-populate attendee details from logged-in user profile
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
            }

            setStep(1)
            setLoading(false)
        }

        loadEventData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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
                    {/* Mini order summary */}
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
                        </div>
                        <div className="border-t border-border pt-2 flex justify-between font-bold">
                            <span className="text-text">Total</span>
                            <span className="text-text">{formatPence(ticketSubtotalPence > 0 ? totalPence : ticketSubtotalPence)}</span>
                        </div>
                    </div>

                    {/* Guest list code input */}
                    <div className="bg-surface border border-border rounded-none p-5 space-y-4">
                        <div>
                            <p className="text-sm font-semibold text-text mb-1">Have a guest list code?</p>
                            <p className="text-xs text-muted">Enter it here to receive a complimentary ticket. Leave blank to proceed to payment.</p>
                        </div>

                        {compApplied ? (
                            <div className="space-y-4">
                                <div className="bg-success/10 border border-success/20 rounded-none px-4 py-3 text-sm text-success">
                                    Complimentary ticket applied — <span className="font-mono font-bold">{compApplied.code}</span>
                                </div>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={compAgreed}
                                        onChange={e => setCompAgreed(e.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-border accent-accent"
                                    />
                                    <span className="text-sm text-muted">
                                        I agree to the{' '}
                                        <a href="/terms" className="text-accent hover:underline">Terms of Service</a> and{' '}
                                        <a href="/refund-policy" className="text-accent hover:underline">Refund Policy</a>
                                    </span>
                                </label>
                                {compError && (
                                    <p className="text-sm text-accent bg-accent/10 border border-accent/20 rounded-none px-4 py-2">{compError}</p>
                                )}
                                <button
                                    onClick={handleCompBooking}
                                    disabled={confirmingComp || !compAgreed}
                                    className="w-full h-12 rounded-sm bg-[#0A0A0F] text-white font-semibold text-sm hover:bg-[#2a2a3f] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {confirmingComp && (
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    )}
                                    {confirmingComp ? 'Confirming...' : 'Confirm Booking'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setCompApplied(null); setCompCodeInput(''); setCompAgreed(false) }}
                                    className="text-xs text-muted hover:text-text w-full text-center"
                                >
                                    Remove code
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={compCodeInput}
                                        onChange={e => setCompCodeInput(e.target.value.toUpperCase())}
                                        onKeyDown={e => e.key === 'Enter' && applyCompCode()}
                                        placeholder="e.g. GUEST-ABC123"
                                        className="flex-1 bg-surface border border-border rounded-none px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
                                    />
                                    <button
                                        type="button"
                                        onClick={applyCompCode}
                                        disabled={compValidating || !compCodeInput.trim()}
                                        className="px-4 border border-border text-sm text-muted hover:text-text hover:border-accent transition disabled:opacity-50"
                                    >
                                        {compValidating ? '...' : 'Apply'}
                                    </button>
                                </div>
                                {compError && (
                                    <p className="text-sm text-accent">{compError}</p>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setProceedToPayment(true)}
                                    className="w-full h-12 rounded-sm bg-[#0A0A0F] text-white font-semibold text-sm hover:bg-[#2a2a3f] transition"
                                >
                                    Continue to Payment →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {state.step === 1 && proceedToPayment && <StepPayment />}
        </div>
    )
}
