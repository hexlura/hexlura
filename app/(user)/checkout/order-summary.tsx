'use client'

import { useCheckout } from '@/lib/checkout-context'
import { formatPence } from '@/lib/fees'

export default function OrderSummary() {
    const { state, ticketSubtotalPence, discountPence, bookingFeePence, processingFeePence, lineTotalsPence, totalPence } = useCheckout()

    return (
        <div className="bg-card rounded-2xl border border-border shadow-soft p-5 lg:sticky lg:top-24">
            <h3 className="font-heading text-lg tracking-wide mb-4">ORDER SUMMARY</h3>

            <div className="mb-4">
                <p className="font-semibold text-sm">{state.eventTitle}</p>
                <p className="text-xs text-muted">{[state.eventDate, state.eventTime].filter(Boolean).join(' · ')}</p>
                <p className="text-xs text-muted">{state.venueName}</p>
            </div>

            <div className="border-t border-border pt-4 space-y-1.5 text-sm">
                {/* Ticket lines */}
                {state.items.map((item, i) => (
                    <div key={item.ticket_type_id} className="flex justify-between">
                        <span className="text-muted">{item.ticket_name} × {item.quantity}</span>
                        <span>{formatPence(lineTotalsPence[i])}</span>
                    </div>
                ))}

                {/* Subtotal */}
                {state.items.length > 1 && (
                    <div className="flex justify-between text-muted pt-1">
                        <span>Subtotal</span>
                        <span>{formatPence(ticketSubtotalPence + bookingFeePence + processingFeePence)}</span>
                    </div>
                )}

                {/* Discount */}
                {discountPence > 0 && (
                    <div className="flex justify-between text-success">
                        <span>Discount ({state.promo?.code})</span>
                        <span>-{formatPence(discountPence)}</span>
                    </div>
                )}
            </div>

            {/* Total */}
            <div className="flex justify-between font-semibold text-base border-t border-border pt-3 mt-3">
                <span>Total</span>
                <span className="font-heading text-xl">{formatPence(totalPence)}</span>
            </div>
            {/* One combined figure; buyers don't need the booking/processing split */}
            {bookingFeePence + processingFeePence > 0 && (
                <p className="text-xs text-muted text-right mt-1">incl. {formatPence(bookingFeePence + processingFeePence)} fee</p>
            )}
            <p className="text-xs text-muted mt-3">Fees are non-refundable</p>
        </div>
    )
}
