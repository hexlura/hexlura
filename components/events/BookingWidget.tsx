'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Event, TicketType } from '@/types';
import { calculateBookingFee, calculateBookingFeePerTicket, formatPence } from '@/lib/fees';
import { useFeeConfig } from '@/lib/use-fee-config';

type GroupTicketType = TicketType & { is_group?: boolean; group_size?: number };

interface BookingWidgetProps {
    event: Event;
    ticketTypes: GroupTicketType[];
    initialQuantities?: Record<string, number>;
}

export default function BookingWidget({ event, ticketTypes, initialQuantities }: BookingWidgetProps) {
    const router = useRouter();
    const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>(initialQuantities ?? {});
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [restoredToast, setRestoredToast] = useState(false);
    const [reservationExpiry, setReservationExpiry] = useState<Date | null>(null);
    const [countdown, setCountdown] = useState('');
    const [reservationError, setReservationError] = useState('');
    const feeConfig = useFeeConfig();
    const widgetRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const raw = localStorage.getItem('hexlura_pending_checkout');
        if (!raw) return;
        try {
            const pending = JSON.parse(raw);
            if (pending.eventId === event.id && pending.tickets) {
                setSelectedTickets(pending.tickets);
                localStorage.removeItem('hexlura_pending_checkout');
                setRestoredToast(true);
                setTimeout(() => setRestoredToast(false), 4000);
                setTimeout(() => {
                    widgetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        } catch {
            // ignore malformed data
        }
    }, [event.id]);

    useEffect(() => {
        if (!reservationExpiry) return;
        const tick = () => {
            const diff = reservationExpiry.getTime() - Date.now();
            if (diff <= 0) {
                setCountdown('');
                setReservationExpiry(null);
                setReservationError('Reservation expired — please try again');
                setCheckoutLoading(false);
            } else {
                const m = Math.floor(diff / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setCountdown(`${m}:${s.toString().padStart(2, '0')}`);
            }
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [reservationExpiry]);

    const handleQuantityChange = (ticketId: string, value: number) => {
        setSelectedTickets(prev => ({ ...prev, [ticketId]: value }));
    };

    const effectiveQty = (ticket: GroupTicketType) =>
        selectedTickets[ticket.id] || 0;

    const subtotal = ticketTypes.reduce((sum, ticket) => {
        const qty = effectiveQty(ticket);
        return sum + ticket.price_pence * qty;
    }, 0);

    const bookingFee = ticketTypes.reduce((sum, ticket) => {
        const qty = effectiveQty(ticket);
        return sum + (qty > 0 ? calculateBookingFee(ticket.price_pence, qty, feeConfig) : 0);
    }, 0);

    const total = subtotal + bookingFee;
    const hasSelectedTickets = ticketTypes.some(t => effectiveQty(t) > 0);
    const isAllSoldOut = ticketTypes.every(t => (t.quantity_total - t.quantity_sold) <= 0);
    const isEventEnded = event.end_at ? new Date(event.end_at) < new Date() : false;
    const isFreeSelection = hasSelectedTickets && subtotal === 0;

    async function handleCheckout() {
        setCheckoutLoading(true);
        setReservationError('');

        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            const returnUrl = window.location.pathname;
            const eventSlug = returnUrl.split('/events/')[1];
            localStorage.setItem('hexlura_pending_checkout', JSON.stringify({
                eventSlug,
                eventId: event.id,
                tickets: selectedTickets,
                returnUrl,
            }));
            router.push(`/auth/login?next=${encodeURIComponent(returnUrl)}`);
            return;
        }

        const selectedItems = ticketTypes
            .map(ticket => ({ id: ticket.id, qty: effectiveQty(ticket) }))
            .filter(({ qty }) => qty > 0);

        const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        try {
            const res = await fetch('/api/reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tickets: selectedItems.map(({ id, qty }) => ({ ticket_type_id: id, quantity: qty })),
                    session_id: sessionId,
                }),
            });
            const data = await res.json();

            if (!data.success) {
                setReservationError('Sorry, these tickets just sold out');
                setCheckoutLoading(false);
                return;
            }

            setReservationExpiry(new Date(data.expires_at));
        } catch {
            setReservationError('Failed to reserve tickets. Please try again.');
            setCheckoutLoading(false);
            return;
        }

        const ticketsParam = selectedItems.map(({ id, qty }) => `${id}:${qty}`).join(',');
        router.push(`/checkout?event_id=${event.id}&tickets=${ticketsParam}`);
    }

    if (isEventEnded) {
        return (
            <div className="bg-card border border-border rounded-none p-6 shadow-sm sticky top-24">
                <h3 className="text-xl font-bold mb-4">Tickets</h3>
                <div style={{ background: 'rgba(102,102,119,0.08)', border: '1px solid rgba(102,102,119,0.2)', color: '#666677', textAlign: 'center', padding: '16px', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                    This event has ended.
                </div>
                <Button className="w-full h-12 text-lg font-bold" disabled>
                    Event Ended
                </Button>
            </div>
        );
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
        <div ref={widgetRef} className="bg-card border border-border rounded-none p-6 shadow-sm sticky top-24 flex flex-col gap-6">
            <h3 className="text-xl font-bold">Select Tickets</h3>

            {restoredToast && (
                <div style={{ fontSize: '12px', color: '#00C48A', background: 'rgba(0,196,138,0.08)', border: '1px solid rgba(0,196,138,0.3)', borderRadius: '2px', padding: '8px 12px' }}>
                    Your ticket selection has been restored
                </div>
            )}

            <div>
                {ticketTypes.map(ticket => {
                    const available = ticket.quantity_total - ticket.quantity_sold;
                    const isSoldOut = available <= 0;
                    const quantity = selectedTickets[ticket.id] || 0;
                    const maxQty = ticket.max_per_order || 10;
                    const feePerTicket = calculateBookingFeePerTicket(ticket.price_pence, feeConfig);
                    const isExpanded = expanded[ticket.id] || false;

                    const isGroup = ticket.is_group === true;
                    const groupSize = ticket.group_size || 1;

                    return (
                        <div key={ticket.id} style={{ borderBottom: '1px solid #C0C0C8' }}>
                            {/* Single-line row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                                {/* Name */}
                                <span style={{ fontSize: 14, fontWeight: 600, color: isSoldOut ? '#666677' : '#0A0A0F', flex: 1, marginRight: 12, display: 'flex', alignItems: 'center', flexWrap: 'nowrap' }}>
                                    {ticket.name}
                                    {isGroup && (
                                        <span style={{ fontSize: 11, background: '#F0F0F2', color: '#666677', padding: '2px 8px', borderRadius: 2, marginLeft: 8, whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-block' }}>
                                            Group of {groupSize}
                                        </span>
                                    )}
                                </span>
                                {/* Price + fee */}
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginRight: 16, whiteSpace: 'nowrap' }}>
                                    <span style={{ fontSize: 14, color: isSoldOut ? '#666677' : ticket.price_pence === 0 ? '#00C48A' : '#0A0A0F' }}>
                                        {ticket.price_pence === 0 ? 'Free' : formatPence(ticket.price_pence)}
                                    </span>
                                    {ticket.price_pence > 0 && (
                                        <span style={{ fontSize: 12, color: '#666677' }}>
                                            +{formatPence(feePerTicket)} fee
                                        </span>
                                    )}
                                </div>
                                {/* Qty or sold out */}
                                {isSoldOut ? (
                                    <span style={{ fontSize: 12, color: '#E63950', fontWeight: 600 }}>SOLD OUT</span>
                                ) : (
                                    <select
                                        value={quantity}
                                        onChange={e => handleQuantityChange(ticket.id, parseInt(e.target.value))}
                                        style={{
                                            background: '#FFFFFF',
                                            color: '#0A0A0F',
                                            border: '1px solid #C0C0C8',
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
                            {/* Group ticket info */}
                            {isGroup && (
                                <div style={{ paddingBottom: 4 }}>
                                    <p style={{ fontSize: 12, color: '#666677', margin: '4px 0 0' }}>
                                        1 ticket = {groupSize} people · {groupSize} QR codes will be generated
                                    </p>
                                    {quantity > 0 && (
                                        <p style={{ fontSize: 12, color: '#00E5A0', margin: '4px 0 0' }}>
                                            = {quantity * groupSize} people total
                                        </p>
                                    )}
                                </div>
                            )}
                            {/* Expandable description */}
                            {ticket.description && (
                                <div style={{ paddingBottom: 8 }}>
                                    <button
                                        type="button"
                                        onClick={() => setExpanded(prev => ({ ...prev, [ticket.id]: !isExpanded }))}
                                        style={{ fontSize: 12, color: '#666677', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                        {isExpanded ? '▲ Hide' : '▼ Details'}
                                    </button>
                                    {isExpanded && (
                                        <p style={{ fontSize: 13, color: '#666677', padding: '8px 0 0', margin: 0 }}>
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
                className="w-full h-14 text-lg font-bold mt-2 bg-[#0A0A0F] text-white hover:bg-[#2a2a3f]"
                disabled={!hasSelectedTickets || checkoutLoading}
                onClick={handleCheckout}
            >
                {checkoutLoading && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                )}
                {checkoutLoading ? 'Loading...' : isFreeSelection ? 'Reserve My Spot' : 'Proceed to Checkout'}
            </Button>
            {isFreeSelection && (
                <p style={{ fontSize: 12, color: '#00C48A', textAlign: 'center', margin: '4px 0 0' }}>
                    No payment required
                </p>
            )}
            {countdown && (
                <p style={{ fontSize: 13, color: '#E63950', textAlign: 'center', margin: '4px 0 0' }}>
                    Tickets held for {countdown}
                </p>
            )}
            {!countdown && reservationError && (
                <p style={{ fontSize: 13, color: '#E63950', textAlign: 'center', margin: '4px 0 0' }}>
                    {reservationError}
                </p>
            )}
        </div>
    );
}
