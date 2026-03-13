'use client'

import { useState } from 'react'
import { useCheckout } from '@/lib/checkout-context'
import { formatPence } from '@/lib/fees'
import OrderSummary from './order-summary'

export default function StepDetails() {
    const { state, setAttendeeDetails, setPromo, setStep, ticketSubtotalPence } = useCheckout()
    const [fullName, setFullName] = useState(state.attendeeDetails.full_name)
    const [email, setEmail] = useState(state.attendeeDetails.email)
    const [phone, setPhone] = useState(state.attendeeDetails.phone)
    const [promoInput, setPromoInput] = useState(state.promo?.code || '')
    const [promoLoading, setPromoLoading] = useState(false)
    const [promoError, setPromoError] = useState('')
    const [promoSuccess, setPromoSuccess] = useState(state.promo ? `${state.promo.discount_type === 'percent' ? state.promo.discount_value + '%' : formatPence(state.promo.discount_pence)} off applied` : '')
    const [errors, setErrors] = useState<Record<string, string>>({})

    async function handleApplyPromo() {
        if (!promoInput.trim()) return
        setPromoLoading(true)
        setPromoError('')
        setPromoSuccess('')

        try {
            const res = await fetch('/api/promo/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: promoInput.trim(),
                    event_id: state.eventId,
                    ticket_subtotal_pence: ticketSubtotalPence,
                }),
            })
            const data = await res.json()

            if (data.valid) {
                setPromo({
                    code: promoInput.trim().toUpperCase(),
                    code_id: data.code_id,
                    discount_pence: data.discount_pence,
                    discount_type: data.discount_type,
                    discount_value: data.discount_value,
                })
                setPromoSuccess(`${data.discount_type === 'percent' ? data.discount_value + '%' : formatPence(data.discount_pence)} off applied`)
            } else {
                setPromoError(data.error || 'Invalid code')
                setPromo(null)
            }
        } catch {
            setPromoError('Failed to validate code')
        }
        setPromoLoading(false)
    }

    function validate(): boolean {
        const errs: Record<string, string> = {}
        if (!fullName.trim()) errs.full_name = 'Full name is required'
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Valid email is required'
        if (!phone.trim() || !/^\+?[\d\s()-]{7,}$/.test(phone)) errs.phone = 'Valid phone number is required'
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    function handleContinue() {
        if (!validate()) return
        setAttendeeDetails({ full_name: fullName.trim(), email: email.trim(), phone: phone.trim() })
        setStep(2)
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-6">
                <h2 className="font-heading text-3xl text-text">ATTENDEE DETAILS</h2>

                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="full_name" className="text-sm font-medium text-text">Full Name</label>
                        <input
                            id="full_name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="John Doe"
                            className="h-11 w-full rounded-lg border border-border bg-card px-4 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                        {errors.full_name && <span className="text-xs text-accent">{errors.full_name}</span>}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="email" className="text-sm font-medium text-text">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="h-11 w-full rounded-lg border border-border bg-card px-4 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                        {errors.email && <span className="text-xs text-accent">{errors.email}</span>}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="phone" className="text-sm font-medium text-text">Phone Number</label>
                        <input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+44 7700 000000"
                            className="h-11 w-full rounded-lg border border-border bg-card px-4 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                        {errors.phone && <span className="text-xs text-accent">{errors.phone}</span>}
                    </div>
                </div>

                {/* Promo code */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-text">Promo Code</label>
                    <div className="flex gap-2">
                        <input
                            value={promoInput}
                            onChange={(e) => setPromoInput(e.target.value)}
                            placeholder="Enter code"
                            className="h-11 flex-1 rounded-lg border border-border bg-card px-4 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent uppercase"
                        />
                        <button
                            onClick={handleApplyPromo}
                            disabled={promoLoading || !promoInput.trim()}
                            className="h-11 px-6 rounded-lg border border-border bg-surface text-text text-sm font-medium hover:bg-surface/80 transition disabled:opacity-50"
                        >
                            {promoLoading ? '...' : 'Apply'}
                        </button>
                    </div>
                    {promoError && <p className="text-xs text-accent">{promoError}</p>}
                    {promoSuccess && <p className="text-xs text-success">{promoSuccess}</p>}
                </div>

                <button
                    onClick={handleContinue}
                    className="w-full h-12 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition"
                >
                    Continue to Payment
                </button>
            </div>

            <div className="lg:col-span-2">
                <OrderSummary />
            </div>
        </div>
    )
}
