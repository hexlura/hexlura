'use client'

import { useCheckout } from '@/lib/checkout-context'
import { formatPence } from '@/lib/fees'

export default function OrderSummary() {
    const { state, ticketSubtotalPence, discountPence, bookingFeePence, processingFeePence, totalPence } = useCheckout()

    return (
        <div className="bg-surface border border-border rounded-none p-6 space-y-4 sticky top-24">
            <h3 className="font-bold text-text text-lg">Order Summary</h3>

            <div className="space-y-1">
                <p className="font-semibold text-text">{state.eventTitle}</p>
                <p className="text-sm text-muted">{state.eventDate} · {state.eventTime}</p>
                <p className="text-sm text-muted">{state.venueName}</p>
            </div>

            <div className="border-t border-border pt-4 space-y-2 text-sm">
                {/* Ticket lines */}
                {state.items.map((item) => (
                    <div key={item.ticket_type_id} className="flex justify-between">
                        <span className="text-muted">{item.ticket_name} × {item.quantity}</span>
                        <span className="text-text">{formatPence(item.price_pence * item.quantity)}</span>
                    </div>
                ))}

                {/* Subtotal */}
                {state.items.length > 1 && (
                    <div className="flex justify-between text-muted pt-1">
                        <span>Subtotal</span>
                        <span>{formatPence(ticketSubtotalPence)}</span>
                    </div>
                )}

                {/* Discount */}
                {discountPence > 0 && (
                    <div className="flex justify-between text-success">
                        <span>Discount ({state.promo?.code})</span>
                        <span>-{formatPence(discountPence)}</span>
                    </div>
                )}

                {/* Booking fee */}
                {bookingFeePence > 0 && (
                    <div className="flex justify-between text-muted">
                        <span>Booking fee</span>
                        <span>{formatPence(bookingFeePence)}</span>
                    </div>
                )}

                {/* Order processing fee */}
                {processingFeePence > 0 && (
                    <div className="flex justify-between text-muted">
                        <span>Order processing fee</span>
                        <span>{formatPence(processingFeePence)}</span>
                    </div>
                )}

                {/* Total */}
                <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
                    <span className="text-text">Total</span>
                    <span className="text-text">{formatPence(totalPence)}</span>
                </div>

                <p className="text-xs text-muted">Fees are non-refundable</p>
            </div>
        </div>
    )
}
