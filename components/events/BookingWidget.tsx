'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Event, TicketType } from '@/types';
import { calculateBookingFee, formatPence } from '@/lib/fees';

interface BookingWidgetProps {
    event: Event;
    ticketTypes: TicketType[];
}

export default function BookingWidget({ event, ticketTypes }: BookingWidgetProps) {
    const router = useRouter();
    const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    const handleTicketChange = (ticketId: string, delta: number) => {
        const ticket = ticketTypes.find(t => t.id === ticketId);
        if (!ticket) return;

        const currentQuantity = selectedTickets[ticketId] || 0;
        const newQuantity = currentQuantity + delta;

        if (newQuantity < 0) return;
        if (newQuantity > ticket.max_per_order) return;

        const available = ticket.quantity_total - ticket.quantity_sold;
        if (newQuantity > available) return;

        setSelectedTickets(prev => ({
            ...prev,
            [ticketId]: newQuantity
        }));
    };

    const subtotal = Object.entries(selectedTickets).reduce((sum, [ticketId, quantity]) => {
        const ticket = ticketTypes.find(t => t.id === ticketId);
        return sum + (ticket ? ticket.price_pence * quantity : 0);
    }, 0);

    const bookingFee = Object.entries(selectedTickets).reduce((sum, [ticketId, quantity]) => {
        const ticket = ticketTypes.find(t => t.id === ticketId);
        return sum + (ticket ? calculateBookingFee(ticket.price_pence, quantity) : 0);
    }, 0);

    const total = subtotal + bookingFee;
    const hasSelectedTickets = Object.values(selectedTickets).some(q => q > 0);
    const isAllSoldOut = ticketTypes.every(t => (t.quantity_total - t.quantity_sold) <= 0);

    function handleCheckout() {
        setCheckoutLoading(true);
        const ticketsParam = Object.entries(selectedTickets)
            .filter(([, qty]) => qty > 0)
            .map(([id, qty]) => `${id}:${qty}`)
            .join(',');

        router.push(`/checkout?event_id=${event.id}&tickets=${ticketsParam}`);
    }

    if (isAllSoldOut) {
        return (
            <div className="bg-card border border-border rounded-none p-6 shadow-sm sticky top-24">
                <h3 className="text-xl font-bold mb-4">Tickets</h3>
                <div className="bg-accent/10 text-accent text-center p-4 rounded-sm mb-6 font-semibold">
                    This event is completely sold out.
                </div>
                <Button className="w-full h-12 text-lg font-bold">Join Waitlist</Button>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-none p-6 shadow-sm sticky top-24 flex flex-col gap-6">
            <h3 className="text-xl font-bold">Select Tickets</h3>

            <div className="space-y-4">
                {ticketTypes.map(ticket => {
                    const available = ticket.quantity_total - ticket.quantity_sold;
                    const isSoldOut = available <= 0;
                    const quantity = selectedTickets[ticket.id] || 0;

                    return (
                        <div key={ticket.id} className={`p-4 border rounded-sm flex flex-col gap-3 ${isSoldOut ? 'opacity-50 bg-muted/30' : 'bg-background hover:border-accent/50 transition-colors'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold">{ticket.name}</h4>
                                    <p className="text-sm text-muted">{ticket.description}</p>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-lg">{formatPence(ticket.price_pence)}</div>
                                    {isSoldOut ? (
                                        <span className="text-xs text-accent font-medium uppercase tracking-wide">Sold Out</span>
                                    ) : (
                                        <span className="text-xs text-muted">{available} left</span>
                                    )}
                                </div>
                            </div>

                            {!isSoldOut && (
                                <div className="flex justify-end items-center gap-4 border-t border-border pt-3 mt-1">
                                    <div className="flex items-center gap-3 bg-surface rounded-full border border-border px-2 py-1">
                                        <button
                                            onClick={() => handleTicketChange(ticket.id, -1)}
                                            disabled={quantity === 0}
                                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-card disabled:opacity-50 text-xl font-medium"
                                        >
                                            -
                                        </button>
                                        <span className="w-6 text-center font-bold">{quantity}</span>
                                        <button
                                            onClick={() => handleTicketChange(ticket.id, 1)}
                                            disabled={quantity >= ticket.max_per_order || quantity >= available}
                                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-card disabled:opacity-50 text-xl font-medium"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {subtotal > 0 && (
                <div className="space-y-2 text-sm bg-surface p-4 rounded-sm border border-border">
                    <div className="flex justify-between">
                        <span className="text-muted">Subtotal</span>
                        <span>{formatPence(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted">Hexlura booking fee</span>
                        <span>{formatPence(bookingFee)}</span>
                    </div>
                    <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{formatPence(total)}</span>
                    </div>
                </div>
            )}

            <Button
                className="w-full h-14 text-lg font-bold mt-2 bg-accent text-white hover:bg-accent/90"
                disabled={!hasSelectedTickets || checkoutLoading}
                onClick={handleCheckout}
            >
                {checkoutLoading && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                )}
                {checkoutLoading ? 'Loading...' : 'Proceed to Checkout'}
            </Button>
        </div>
    );
}
