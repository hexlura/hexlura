'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Event, TicketType } from '@/types';
import { calculateBookingFee, calculateBookingFeePerTicket, formatPence } from '@/lib/fees';

interface BookingWidgetProps {
    event: Event;
    ticketTypes: TicketType[];
}

export default function BookingWidget({ event, ticketTypes }: BookingWidgetProps) {
    const router = useRouter();
    const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const handleQuantityChange = (ticketId: string, value: number) => {
        setSelectedTickets(prev => ({ ...prev, [ticketId]: value }));
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

            <div>
                {ticketTypes.map(ticket => {
                    const available = ticket.quantity_total - ticket.quantity_sold;
                    const isSoldOut = available <= 0;
                    const quantity = selectedTickets[ticket.id] || 0;
                    const maxQty = ticket.max_per_order || 10;
                    const feePerTicket = calculateBookingFeePerTicket(ticket.price_pence);
                    const isExpanded = expanded[ticket.id] || false;

                    return (
                        <div key={ticket.id} style={{ borderBottom: '1px solid #2A2A3A' }}>
                            {/* Single-line row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                                {/* Name */}
                                <span style={{ fontSize: 14, fontWeight: 600, color: isSoldOut ? '#8888AA' : '#F0F0F8', flex: 1, marginRight: 12 }}>
                                    {ticket.name}
                                </span>
                                {/* Price + fee */}
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginRight: 16, whiteSpace: 'nowrap' }}>
                                    <span style={{ fontSize: 14, color: isSoldOut ? '#8888AA' : '#F0F0F8' }}>
                                        {formatPence(ticket.price_pence)}
                                    </span>
                                    <span style={{ fontSize: 12, color: '#8888AA' }}>
                                        +{formatPence(feePerTicket)} fee
                                    </span>
                                </div>
                                {/* Qty or sold out */}
                                {isSoldOut ? (
                                    <span style={{ fontSize: 12, color: '#E63950', fontWeight: 600 }}>SOLD OUT</span>
                                ) : (
                                    <select
                                        value={quantity}
                                        onChange={e => handleQuantityChange(ticket.id, parseInt(e.target.value))}
                                        style={{
                                            background: '#1A1A24',
                                            color: '#F0F0F8',
                                            border: '1px solid #2A2A3A',
                                            padding: '6px 12px',
                                            borderRadius: 2,
                                            fontSize: 14,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {Array.from({ length: Math.min(maxQty, available) + 1 }, (_, i) => (
                                            <option key={i} value={i}>{i}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            {/* Expandable description */}
                            {ticket.description && (
                                <div style={{ paddingBottom: 8 }}>
                                    <button
                                        type="button"
                                        onClick={() => setExpanded(prev => ({ ...prev, [ticket.id]: !isExpanded }))}
                                        style={{ fontSize: 12, color: '#8888AA', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                        {isExpanded ? '▲ Hide' : '▼ Details'}
                                    </button>
                                    {isExpanded && (
                                        <p style={{ fontSize: 13, color: '#8888AA', padding: '8px 0 0', margin: 0 }}>
                                            {ticket.description}
                                        </p>
                                    )}
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
