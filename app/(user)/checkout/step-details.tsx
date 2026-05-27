'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCheckout } from '@/lib/checkout-context'
import { formatPence } from '@/lib/fees'
import OrderSummary from './order-summary'

export default function StepDetails() {
    const { state, setAttendeeDetails, setPromo, setStep, ticketSubtotalPence } = useCheckout()
    const [fullName, setFullName] = useState(state.attendeeDetails.full_name)
    const [email, setEmail] = useState(state.attendeeDetails.email)
    const [phone, setPhone] = useState(state.attendeeDetails.phone)
    const [nameLocked, setNameLocked] = useState(false)
    const [emailLocked, setEmailLocked] = useState(false)
    useEffect(() => {
        async function fetchProfile() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, phone')
                .eq('id', user.id)
                .single()
            if (profile?.full_name) { setFullName(profile.full_name); setNameLocked(true) }
            if (user.email) { setEmail(user.email); setEmailLocked(true) }
            if (profile?.phone && !phone) setPhone(profile.phone)
        }
        fetchProfile()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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
                        <div style={{ position: 'relative' }}>
                            <input
                                id="full_name"
                                value={fullName}
                                onChange={nameLocked ? undefined : (e) => setFullName(e.target.value)}
                                readOnly={nameLocked}
                                placeholder="John Doe"
                                className="h-11 w-full rounded-sm border text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                style={nameLocked ? {
                                    background: '#F5F5F7', border: '1px solid #C0C0C8',
                                    color: '#0A0A0F', cursor: 'not-allowed', paddingLeft: '16px', paddingRight: '36px',
                                } : undefined}
                            />
                            {nameLocked && (
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666677" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </span>
                            )}
                        </div>
                        {errors.full_name && <span className="text-xs text-accent">{errors.full_name}</span>}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="email" className="text-sm font-medium text-text">Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={emailLocked ? undefined : (e) => setEmail(e.target.value)}
                                readOnly={emailLocked}
                                placeholder="you@example.com"
                                className="h-11 w-full rounded-sm border text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                style={emailLocked ? {
                                    background: '#F5F5F7', border: '1px solid #C0C0C8',
                                    color: '#0A0A0F', cursor: 'not-allowed', paddingLeft: '16px', paddingRight: '36px',
                                } : undefined}
                            />
                            {emailLocked && (
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666677" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </span>
                            )}
                        </div>
                        {errors.email && <span className="text-xs text-accent">{errors.email}</span>}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="phone" className="text-sm font-medium text-text">Phone Number</label>
                        <input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+44 7700 900000"
                            className="h-11 w-full rounded-sm border border-border bg-card px-4 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                        <span style={{ fontSize: 12, color: '#666677' }}>We&apos;ll only contact you about this booking</span>
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
                            className="h-11 flex-1 rounded-sm border border-border bg-card px-4 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent uppercase"
                        />
                        <button
                            onClick={handleApplyPromo}
                            disabled={promoLoading || !promoInput.trim()}
                            className="h-11 px-6 rounded-sm border border-border bg-surface text-text text-sm font-medium hover:bg-surface/80 transition disabled:opacity-50"
                        >
                            {promoLoading ? '...' : 'Apply'}
                        </button>
                    </div>
                    {promoError && <p className="text-xs text-accent">{promoError}</p>}
                    {promoSuccess && <p className="text-xs text-success">{promoSuccess}</p>}
                </div>

                <button
                    onClick={handleContinue}
                    className="w-full h-12 rounded-sm bg-[#0A0A0F] text-white font-semibold text-sm hover:bg-[#2a2a3f] transition"
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
