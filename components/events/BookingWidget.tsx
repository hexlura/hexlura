'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Event, TicketType } from '@/types';
import { formatPence, calculateBookingFeePerTicket, type FeeConfig } from '@/lib/fees';

type GroupTicketType = TicketType & { is_group?: boolean; group_size?: number };

interface BookingWidgetProps {
    event: Event;
    ticketTypes: GroupTicketType[];
    initialQuantities?: Record<string, number>;
    /** Live fee config for this event's organiser (exemptions already applied) */
    feeConfig: FeeConfig;
}

export default function BookingWidget({ event, ticketTypes, initialQuantities, feeConfig }: BookingWidgetProps) {
    const router = useRouter();
    const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>(initialQuantities ?? {});
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [restoredToast, setRestoredToast] = useState(false);
    const [reservationExpiry, setReservationExpiry] = useState<Date | null>(null);
    const [reservationError, setReservationError] = useState('');
    const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'checking' | 'loading' | 'joined' | 'error'>('idle');
    // Shown in place of the CTA when the visitor has no session — choose to continue as
    // guest (silent Supabase anonymous auth) or log in before the ticket hold is reserved.
    const [showAuthChoice, setShowAuthChoice] = useState(false);
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
        const diff = reservationExpiry.getTime() - Date.now();
        const timeout = setTimeout(() => {
            setReservationExpiry(null);
            setReservationError('Reservation expired — please try again');
            setCheckoutLoading(false);
        }, Math.max(0, diff));
        return () => clearTimeout(timeout);
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

    // Buyers see the booking fee built into each ticket price, as at checkout
    const bookingFeeTotal = ticketTypes.reduce(
        (sum, ticket) => sum + calculateBookingFeePerTicket(ticket.price_pence, feeConfig) * effectiveQty(ticket),
        0,
    );
    const processingFee = subtotal > 0 ? feeConfig.processingFeePence : 0;

    const hasSelectedTickets = ticketTypes.some(t => effectiveQty(t) > 0);
    const hasNoTickets = ticketTypes.length === 0;
    const isComingSoon = hasNoTickets || event.ticket_availability === 'coming_soon';
    const isAllSoldOut = !isComingSoon && ticketTypes.every(t => (t.quantity_total - t.quantity_sold) <= 0);
    const isEventEnded = event.end_at ? new Date(event.end_at) < new Date() : false;

    useEffect(() => {
        if (!isAllSoldOut && !isComingSoon) return
        setWaitlistStatus('checking')
        fetch(`/api/waitlist?event_id=${event.id}`)
            .then(r => r.json())
            .then(d => setWaitlistStatus(d.onWaitlist ? 'joined' : 'idle'))
            .catch(() => setWaitlistStatus('idle'))
    }, [isAllSoldOut, isComingSoon, event.id])

    async function handleJoinWaitlist() {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`)
            return
        }
        setWaitlistStatus('loading')
        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_id: event.id }),
            })
            const data = await res.json()
            if (data.success) {
                setWaitlistStatus('joined')
            } else {
                setWaitlistStatus('error')
            }
        } catch {
            setWaitlistStatus('error')
        }
    }
    const isFreeSelection = hasSelectedTickets && subtotal === 0;

    async function handleCheckout() {
        setCheckoutLoading(true);
        setReservationError('');

        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            setCheckoutLoading(false);
            setShowAuthChoice(true);
            return;
        }

        await reserveAndGoToCheckout();
    }

    function logInInstead() {
        const returnUrl = window.location.pathname;
        const eventSlug = returnUrl.split('/events/')[1];
        localStorage.setItem('hexlura_pending_checkout', JSON.stringify({
            eventSlug,
            eventId: event.id,
            tickets: selectedTickets,
            returnUrl,
        }));
        router.push(`/auth/login?next=${encodeURIComponent(returnUrl)}`);
    }

    async function continueAsGuest() {
        setCheckoutLoading(true);
        const supabase = createClient();
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
            console.error('signInAnonymously failed:', error.status, error.message, error);
            setReservationError(`Unable to continue as guest (${error.status ?? '?'}: ${error.message}).`);
            setCheckoutLoading(false);
            return;
        }
        setShowAuthChoice(false);
        await reserveAndGoToCheckout();
    }

    async function reserveAndGoToCheckout() {
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

    const cardClass = 'bg-card rounded-2xl border border-border shadow-card p-5'
    const cta = 'w-full py-3.5 rounded-full bg-accent text-white font-semibold text-center shadow-glow hover:brightness-110 transition disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2'
    const ghostCta = 'w-full py-3.5 rounded-full border border-border bg-card font-semibold text-center hover:bg-background transition disabled:opacity-50 flex items-center justify-center gap-2'
    const noticeClass = 'rounded-xl bg-background border border-border text-center px-4 py-4 mb-4'
    const okClass = 'rounded-xl bg-warm-green/10 text-warm-green text-center px-4 py-3.5 text-sm font-semibold'

    if (isEventEnded) {
        return (
            <div className={cardClass}>
                <p className="font-heading text-xl tracking-wide mb-4">TICKETS</p>
                <div className={`${noticeClass} text-sm font-semibold text-muted`}>This event has ended.</div>
                <button className={cta} disabled>Event Ended</button>
            </div>
        );
    }

    if (isComingSoon) {
        const joined = waitlistStatus === 'joined'
        return (
            <div className={cardClass}>
                <p className="font-heading text-xl tracking-wide mb-4">TICKETS</p>
                <div className={noticeClass}>
                    <div className="text-3xl mb-2">🕐</div>
                    <div className="text-[15px] font-bold mb-1">Tickets Coming Soon</div>
                    <div className="text-[13px] text-muted">Tickets for this event will be available shortly.<br />Check back soon!</div>
                </div>
                {joined ? (
                    <div className={okClass}>You&apos;re registered! We&apos;ll notify you as soon as tickets go live.</div>
                ) : (
                    <>
                        <button
                            className={cta}
                            disabled={waitlistStatus === 'loading' || waitlistStatus === 'checking'}
                            onClick={handleJoinWaitlist}
                        >
                            {waitlistStatus === 'loading' ? 'Registering...' : 'Register Interest'}
                        </button>
                        <p className="text-xs text-muted text-center mt-2">We&apos;ll let you know as soon as tickets are live.</p>
                        {waitlistStatus === 'error' && (
                            <p className="text-[13px] font-semibold text-accent text-center mt-1">Failed to register. Please try again.</p>
                        )}
                    </>
                )}
            </div>
        );
    }

    if (isAllSoldOut) {
        const joined = waitlistStatus === 'joined'
        return (
            <div className={cardClass}>
                <p className="font-heading text-xl tracking-wide mb-4">TICKETS</p>
                <div className="rounded-xl bg-warm-red/10 text-warm-red text-center px-4 py-4 mb-4 font-semibold text-sm">
                    This event is completely sold out.
                </div>
                {joined ? (
                    <div className={okClass}>You&apos;re on the waitlist! We&apos;ll notify you if tickets become available.</div>
                ) : (
                    <>
                        <button
                            className={cta}
                            disabled={waitlistStatus === 'loading' || waitlistStatus === 'checking'}
                            onClick={handleJoinWaitlist}
                        >
                            {waitlistStatus === 'loading' ? 'Joining...' : 'Join Waitlist'}
                        </button>
                        {waitlistStatus === 'error' && (
                            <p className="text-[13px] font-semibold text-accent text-center mt-2">Failed to join waitlist. Please try again.</p>
                        )}
                    </>
                )}
            </div>
        );
    }

    return (
        <div ref={widgetRef} className={cardClass}>
            <p className="font-heading text-xl tracking-wide mb-4">SELECT TICKETS</p>

            {restoredToast && (
                <div className="text-xs font-semibold text-warm-green bg-warm-green/10 rounded-lg px-3 py-2 mb-3">
                    Your ticket selection has been restored
                </div>
            )}

            <div className="mb-4">
                {ticketTypes.map((ticket, idx) => {
                    const available = ticket.quantity_total - ticket.quantity_sold;
                    const isSoldOut = available <= 0;
                    const quantity = selectedTickets[ticket.id] || 0;
                    const maxQty = ticket.max_per_order || 10;
                    const isExpanded = expanded[ticket.id] || false;

                    // All-in price of this ticket bought on its own: booking fee plus the per-order fee
                    const ticketFee = ticket.price_pence > 0
                        ? calculateBookingFeePerTicket(ticket.price_pence, feeConfig) + feeConfig.processingFeePence
                        : 0;
                    const isGroup = ticket.is_group === true;
                    const groupSize = ticket.group_size || 1;

                    return (
                        <div key={ticket.id} className={idx < ticketTypes.length - 1 ? 'border-b border-border' : ''}>
                            <div className={`flex items-center justify-between gap-3 py-3 ${isSoldOut ? 'opacity-50' : ''}`}>
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-sm flex items-center flex-wrap gap-x-2">
                                        {ticket.name}
                                        {isGroup && (
                                            <span className="text-[11px] bg-border text-muted px-2 py-0.5 rounded-full whitespace-nowrap">
                                                Group of {groupSize}
                                            </span>
                                        )}
                                    </p>
                                    {isSoldOut ? (
                                        <p className="text-xs font-semibold text-warm-red">Sold out</p>
                                    ) : ticket.description ? (
                                        <button
                                            type="button"
                                            onClick={() => setExpanded(prev => ({ ...prev, [ticket.id]: !isExpanded }))}
                                            className="text-xs text-muted hover:text-accent flex items-center gap-1"
                                        >
                                            {isExpanded ? '▴ Hide' : '▾ Details'}
                                        </button>
                                    ) : null}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-right whitespace-nowrap">
                                        <p className={`font-heading text-lg leading-none ${isSoldOut ? 'line-through' : ticket.price_pence === 0 ? 'text-warm-green' : ''}`}>
                                            {ticket.price_pence === 0 ? 'Free' : formatPence(ticket.price_pence + ticketFee)}
                                        </p>
                                        {ticketFee > 0 && !isSoldOut && (
                                            <p className="text-[11px] text-muted mt-0.5">incl. {formatPence(ticketFee)} fee</p>
                                        )}
                                    </div>
                                    {!isSoldOut && (
                                        <select
                                            value={quantity}
                                            onChange={e => handleQuantityChange(ticket.id, parseInt(e.target.value))}
                                            aria-label={`Quantity for ${ticket.name}`}
                                            className="bg-card border border-border rounded-lg px-2 py-1.5 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-warm-red/25"
                                        >
                                            {Array.from({ length: Math.min(maxQty, available) + 1 }, (_, i) => (
                                                <option key={i} value={i}>{i}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                            {isGroup && !isSoldOut && (
                                <div className="pb-2">
                                    <p className="text-xs text-muted">1 ticket = {groupSize} people · {groupSize} QR codes will be generated</p>
                                    {quantity > 0 && (
                                        <p className="text-xs font-semibold text-warm-green mt-1">= {quantity * groupSize} people total</p>
                                    )}
                                </div>
                            )}
                            {isExpanded && ticket.description && (
                                <p className="text-[13px] text-muted pb-3">{ticket.description}</p>
                            )}
                        </div>
                    );
                })}
            </div>

            {subtotal > 0 && (
                <div className="rounded-xl bg-background border border-border px-4 py-3 mb-4">
                    <div className="flex justify-between items-baseline font-semibold">
                        <span>Total</span>
                        <span className="font-heading text-xl">{formatPence(subtotal + bookingFeeTotal + processingFee)}</span>
                    </div>
                    {bookingFeeTotal + processingFee > 0 && (
                        <p className="text-xs text-muted text-right mt-0.5">incl. {formatPence(bookingFeeTotal + processingFee)} fee</p>
                    )}
                </div>
            )}

            {showAuthChoice ? (
                <div className="flex flex-col gap-2">
                    <p className="text-[13px] text-muted text-center">How would you like to continue?</p>
                    <button className={cta} disabled={checkoutLoading} onClick={continueAsGuest}>
                        {checkoutLoading ? 'Starting...' : 'Continue as Guest'}
                    </button>
                    <button className={ghostCta} disabled={checkoutLoading} onClick={logInInstead}>
                        Log In to My Account
                    </button>
                </div>
            ) : (
                <button className={cta} disabled={!hasSelectedTickets || checkoutLoading} onClick={handleCheckout}>
                    {checkoutLoading && (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    )}
                    {checkoutLoading ? 'Loading...' : isFreeSelection ? 'Reserve My Spot' : 'Proceed to Checkout'}
                </button>
            )}
            {isFreeSelection && (
                <p className="text-xs font-semibold text-warm-green text-center mt-2">No payment required</p>
            )}
            {reservationError && (
                <p className="text-[13px] font-semibold text-accent text-center mt-2">{reservationError}</p>
            )}
        </div>
    );
}
