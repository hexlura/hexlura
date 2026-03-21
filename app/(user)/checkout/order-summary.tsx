'use client'

import { useCheckout } from '@/lib/checkout-context'
import { formatPence, calculateBookingFeePerTicket } from '@/lib/fees'

export default function OrderSummary() {
    const { state, ticketSubtotalPence, discountPence, bookingFeePence, totalPence } = useCheckout()

    return (
        <div className="bg-surface border border-border rounded-none p-6 space-y-4 sticky top-24">
            <h3 className="font-bold text-text text-lg">Order Summary</h3>

            <div className="space-y-1">
                <p className="font-semibold text-text">{state.eventTitle}</p>
                <p className="text-sm text-muted">{state.eventDate} · {state.eventTime}</p>
                <p className="text-sm text-muted">{state.venueName}</p>
            </div>

            <div className="border-t border-border pt-4 space-y-3 text-sm">
                {state.items.map((item) => (
                    <div key={item.ticket_type_id} className="flex justify-between">
                        <span className="text-muted">{item.ticket_name} × {item.quantity}</span>
                        <span className="text-text">{formatPence(item.price_pence * item.quantity)}</span>
                    </div>
                ))}

                {discountPence > 0 && (
                    <div className="flex justify-between text-success">
                        <span>Promo discount ({state.promo?.code})</span>
                        <span>-{formatPence(discountPence)}</span>
                    </div>
                )}

                <div className="flex justify-between">
                    <span className="text-muted">Hexlura booking fee</span>
                    <span className="text-text">{formatPence(bookingFeePence)}</span>
                </div>

                {/* Fee breakdown tooltip */}
                <div className="text-xs text-muted">
                    {state.items.map((item) => (
                        <span key={item.ticket_type_id}>
                            {formatPence(calculateBookingFeePerTicket(item.price_pence))}/ticket × {item.quantity}{' '}
                        </span>
                    ))}
                </div>

                <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
                    <span className="text-text">Total</span>
                    <span className="text-text">{formatPence(totalPence)}</span>
                </div>

                <p className="text-xs text-muted">Booking fee is non-refundable</p>
            </div>

            {/* Subtotal breakdown for reference */}
            {ticketSubtotalPence > 0 && (
                <div className="text-xs text-muted pt-2 border-t border-border space-y-1">
                    <div className="flex justify-between">
                        <span>Ticket subtotal</span>
                        <span>{formatPence(ticketSubtotalPence)}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
