'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Event } from '@/types';
import { buyerTicketPrice } from '@/lib/fees';
import { useListingFees } from '@/lib/fee-context';

interface EventCardProps {
    event: Event;
    showOrganiser?: boolean;
    compact?: boolean;
    priority?: boolean;
    /** Optional seasonal emoji pinned to the poster corner (homepage theme). */
    sticker?: string;
}


// Portrait poster card: date chip on the image, then title, venue and an all-in price.
export default function EventCard({ event, compact = false, priority = false, sticker }: EventCardProps) {
    const fees = useListingFees();
    const ticketTypes = event.ticket_types || [];

    const visibleTypes = ticketTypes.filter(t => t.is_visible === true);

    let totalTickets = 0;
    let soldTickets = 0;

    visibleTypes.forEach(t => {
        totalTickets += t.quantity_total;
        soldTickets += t.quantity_sold;
    });

    const visibleSoldOut = visibleTypes.length > 0 && totalTickets - soldTickets === 0;

    const dateStr = new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'Europe/London',
    }).format(new Date(event.start_at)).replace(',', '');

    const venueLine = [event.venue_name, event.venue_address?.split(',')[0]].filter(Boolean).join(', ');

    const isEventEnded = event.end_at ? new Date(event.end_at) < new Date() : false;
    const isFree = visibleTypes.length > 0 && Math.max(...visibleTypes.map(t => t.price_pence)) === 0;

    // Price line. Prices are all-in: ticket price plus the buyer's booking fee.
    let price: { text: string; tone: 'normal' | 'free' | 'red' | 'muted' } = { text: ' ', tone: 'normal' };
    if (visibleTypes.length === 0) {
        price = { text: 'Tickets TBA', tone: 'muted' };
    } else if (isEventEnded) {
        price = { text: 'Event ended', tone: 'muted' };
    } else if (visibleSoldOut) {
        price = { text: 'Sold out', tone: 'red' };
    } else if (isFree) {
        price = { text: 'Free Event', tone: 'free' };
    } else if (fees) {
        const prices = visibleTypes.map(t => buyerTicketPrice(t.price_pence, event.organiser_id, fees).totalPence);
        const lo = Math.min(...prices);
        const hi = Math.max(...prices);
        const fmt = (p: number) => `£${(p / 100).toFixed(2)}`;
        if (lo === 0) price = { text: `Free – ${fmt(hi)}`, tone: 'normal' };
        else price = { text: lo === hi ? fmt(lo) : `From ${fmt(lo)}`, tone: 'normal' };
    }

    const priceTone = {
        normal: '',
        free: 'text-warm-green',
        red: 'text-warm-red',
        muted: 'text-muted',
    }[price.tone];

    return (
        <Link href={`/events/${event.slug}`} className="group block h-full">
            <div className="relative overflow-hidden rounded-2xl shadow-soft group-hover:shadow-hover transition bg-gradient-to-br from-accent to-warm-orange" style={{ aspectRatio: '2 / 3' }}>
                {event.banner_url && (
                    <Image
                        src={event.banner_url}
                        alt={event.title}
                        priority={priority}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
                    />
                )}
                {!event.banner_url && (
                    <div className="absolute inset-0 flex items-end p-3">
                        <p className="text-white font-heading text-xl leading-none">{event.title}</p>
                    </div>
                )}
                <span className="absolute top-2.5 left-2.5 px-2 py-1 rounded-full bg-white/90 text-[10px] font-bold text-text uppercase">
                    {dateStr}
                </span>
                {sticker && <span aria-hidden className="season-sticker">{sticker}</span>}
                {isFree && !isEventEnded && !visibleSoldOut && (
                    <span className="absolute bottom-2.5 left-2.5 px-2 py-1 rounded-full bg-warm-green text-white text-[10px] font-bold">FREE</span>
                )}
                {visibleSoldOut && !isEventEnded && (
                    <span className="absolute bottom-2.5 left-2.5 px-2 py-1 rounded-full bg-warm-red text-white text-[10px] font-bold">SOLD OUT</span>
                )}
            </div>

            <div className="pt-3">
                <p className="font-semibold text-sm leading-snug mb-1 group-hover:text-accent transition-colors line-clamp-2">
                    {event.title}
                </p>
                {venueLine && (
                    <p className="text-xs text-muted mb-1.5 line-clamp-1">{venueLine}</p>
                )}
                {!compact && (
                    <p className={`font-heading text-lg ${priceTone}`}>{price.text}</p>
                )}
            </div>
        </Link>
    );
}
