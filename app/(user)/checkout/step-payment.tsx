'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useCheckout } from '@/lib/checkout-context'
import { formatPence } from '@/lib/fees'
import OrderSummary from './order-summary'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function PaymentForm() {
    const stripe = useStripe()
    const elements = useElements()
    const { totalPence } = useCheckout()
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [agreed, setAgreed] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!stripe || !elements || !agreed) return

        setError('')
        setLoading(true)

        const { error: submitError } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/checkout/success`,
            },
        })

        if (submitError) {
            setError(submitError.message || 'Payment failed. Please try again.')
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement options={{
                layout: {
                    type: 'accordion',
                    defaultCollapsed: false,
                    radios: false,
                    spacedAccordionItems: false
                },
                wallets: {
                    applePay: 'always' as 'auto',
                    googlePay: 'always' as 'auto'
                }
            }} />

            <label className="flex items-start gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border accent-accent"
                />
                <span className="text-sm text-muted">
                    I agree to the{' '}
                    <a href="/terms" className="text-accent hover:underline">Terms of Service</a> and{' '}
                    <a href="/refund-policy" className="text-accent hover:underline">Refund Policy</a>
                </span>
            </label>

            {error && (
                <p className="text-sm text-accent bg-accent/10 border border-accent/20 rounded-none px-4 py-2">{error}</p>
            )}

            <button
                type="submit"
                disabled={!stripe || !elements || loading || !agreed}
                className="w-full h-12 rounded-sm bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {loading && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                )}
                {loading ? 'Processing...' : `Pay ${formatPence(totalPence)}`}
            </button>
        </form>
    )
}

export default function StepPayment() {
    const { state, setPaymentInfo, setStep, totalPence } = useCheckout()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function createIntent() {
            try {
                const res = await fetch('/api/checkout/create-intent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event_id: state.eventId,
                        items: state.items.map((i) => ({
                            ticket_type_id: i.ticket_type_id,
                            quantity: i.quantity,
                        })),
                        promo_code: state.promo?.code || undefined,
                        attendee_details: state.attendeeDetails,
                    }),
                })

                const data = await res.json()

                if (!res.ok) {
                    setError(data.error || 'Failed to create payment')
                    setLoading(false)
                    return
                }

                // Free booking — skip Stripe, go straight to success
                if (data.free && data.booking_ref) {
                    window.location.href = `/checkout/success?booking_ref=${data.booking_ref}`
                    return
                }

                setPaymentInfo(data.client_secret, data.payment_intent_id)
            } catch {
                setError('Network error. Please try again.')
            }
            setLoading(false)
        }

        createIntent()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full mx-auto" />
                <p className="text-muted mt-4">Preparing payment...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-12 space-y-4">
                <p className="text-accent">{error}</p>
                <button onClick={() => setStep(1)} className="text-sm text-accent hover:underline">
                    ← Back to details
                </button>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="font-heading text-3xl text-text">PAYMENT</h2>
                    <button onClick={() => setStep(1)} className="text-sm text-accent hover:underline">
                        ← Back to details
                    </button>
                </div>

                {/* Locked summary */}
                <div className="bg-surface border border-border rounded-none p-4 text-sm space-y-2">
                    <div className="flex justify-between">
                        <span className="text-muted">Ticket subtotal</span>
                        <span className="text-text">{formatPence(state.items.reduce((s, i) => s + i.price_pence * i.quantity, 0))}</span>
                    </div>
                    {state.promo && (
                        <div className="flex justify-between text-success">
                            <span>Promo discount ({state.promo.code})</span>
                            <span>-{formatPence(state.promo.discount_pence)}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-muted">Hexlura booking fee</span>
                        <span className="text-text">{formatPence(state.items.reduce((s, i) => s + (i.price_pence === 0 ? 0 : Math.max(50, Math.min(500, Math.round(i.price_pence * 0.07)))) * i.quantity, 0))}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{formatPence(totalPence)}</span>
                    </div>
                </div>

                {state.clientSecret && (
                    <Elements
                        stripe={stripePromise}
                        options={{
                            clientSecret: state.clientSecret,
                            appearance: {
                                theme: 'night',
                                variables: {
                                    colorPrimary: '#E63950',
                                    colorBackground: '#1A1A24',
                                    colorText: '#F0F0F8',
                                    colorDanger: '#E63950',
                                    borderRadius: '8px',
                                },
                            },
                        }}
                    >
                        <PaymentForm />
                    </Elements>
                )}
            </div>

            <div className="lg:col-span-2">
                <OrderSummary />
            </div>
        </div>
    )
}
