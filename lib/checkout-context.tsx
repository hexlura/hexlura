'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { calculateBookingFeePerTicket } from '@/lib/fees'
import { useFeeConfig } from '@/lib/use-fee-config'

interface CheckoutItem {
    ticket_type_id: string
    ticket_name: string
    quantity: number
    price_pence: number
}

interface AttendeeDetails {
    full_name: string
    email: string
    phone: string
}

interface PromoDiscount {
    code: string
    code_id: string
    discount_pence: number
    discount_type: 'percent' | 'fixed'
    discount_value: number
}

interface CheckoutState {
    eventId: string
    eventTitle: string
    eventDate: string
    eventTime: string
    venueName: string
    items: CheckoutItem[]
    attendeeDetails: AttendeeDetails
    promo: PromoDiscount | null
    clientSecret: string | null
    paymentIntentId: string | null
    connectedAccountId: string | null
    // Fingerprint of (eventId, items, promo code) the current clientSecret was created
    // for, so StepPayment can reuse the PaymentIntent across remounts instead of
    // requesting a new one (and burning rate-limit budget) each time.
    paymentIntentCartKey: string | null
    step: number
}

interface CheckoutContextType {
    state: CheckoutState
    setItems: (items: CheckoutItem[]) => void
    setEventInfo: (info: { eventId: string; eventTitle: string; eventDate: string; eventTime: string; venueName: string }) => void
    setAttendeeDetails: (details: AttendeeDetails) => void
    setPromo: (promo: PromoDiscount | null) => void
    setPaymentInfo: (clientSecret: string, paymentIntentId: string, connectedAccountId: string | null, cartKey: string) => void
    setStep: (step: number) => void
    ticketSubtotalPence: number
    discountPence: number
    bookingFeePence: number
    /** Booking fee for one line item (price × qty), so lines can show the all-in price */
    itemBookingFeePence: (item: CheckoutItem) => number
    processingFeePence: number
    totalPence: number
}

const CheckoutContext = createContext<CheckoutContextType | null>(null)

export function CheckoutProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<CheckoutState>({
        eventId: '',
        eventTitle: '',
        eventDate: '',
        eventTime: '',
        venueName: '',
        items: [],
        attendeeDetails: { full_name: '', email: '', phone: '' },
        promo: null,
        clientSecret: null,
        paymentIntentId: null,
        connectedAccountId: null,
        paymentIntentCartKey: null,
        step: 1,
    })

    const feeConfig = useFeeConfig(state.eventId || undefined)

    const ticketSubtotalPence = state.items.reduce(
        (sum, item) => sum + item.price_pence * item.quantity,
        0
    )

    const discountPence = state.promo?.discount_pence || 0

    const bookingFeePence = state.items.reduce(
        (sum, item) => sum + calculateBookingFeePerTicket(item.price_pence, feeConfig) * item.quantity,
        0
    )

    const itemBookingFeePence = (item: CheckoutItem) =>
        calculateBookingFeePerTicket(item.price_pence, feeConfig) * item.quantity

    const processingFeePence = ticketSubtotalPence > 0 ? feeConfig.processingFeePence : 0

    const totalPence = ticketSubtotalPence - discountPence + bookingFeePence + processingFeePence

    return (
        <CheckoutContext.Provider
            value={{
                state,
                setItems: (items) => setState((s) => ({ ...s, items })),
                setEventInfo: (info) => setState((s) => ({ ...s, ...info })),
                setAttendeeDetails: (attendeeDetails) => setState((s) => ({ ...s, attendeeDetails })),
                setPromo: (promo) => setState((s) => ({ ...s, promo })),
                setPaymentInfo: (clientSecret, paymentIntentId, connectedAccountId, cartKey) =>
                    setState((s) => ({ ...s, clientSecret, paymentIntentId, connectedAccountId, paymentIntentCartKey: cartKey })),
                setStep: (step) => setState((s) => ({ ...s, step })),
                ticketSubtotalPence,
                discountPence,
                bookingFeePence,
                itemBookingFeePence,
                processingFeePence,
                totalPence,
            }}
        >
            {children}
        </CheckoutContext.Provider>
    )
}

export function useCheckout() {
    const ctx = useContext(CheckoutContext)
    if (!ctx) throw new Error('useCheckout must be used within CheckoutProvider')
    return ctx
}
