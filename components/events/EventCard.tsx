import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Event } from '@/types';

interface EventCardProps {
    event: Event;
    showOrganiser?: boolean;
}

const categoryBadgeColor: Record<string, string> = {
    Gigs: '#E63950',
    'Nights Out': '#F5A623',
};

function getCategoryColor(category: string): string {
    return categoryBadgeColor[category] ?? '#E63950';
}

function extractCity(venueAddress: string | null | undefined): string {
    if (!venueAddress) return '';
    const parts = venueAddress.split(',').map(p => p.trim()).filter(Boolean);
    // Walk from the end, skip postcodes (start with letter+digit pattern)
    const postcodeRe = /^[A-Z]{1,2}\d/i;
    for (let i = parts.length - 1; i >= 0; i--) {
        if (!postcodeRe.test(parts[i])) return parts[i].toUpperCase();
    }
    return parts[0]?.toUpperCase() ?? '';
}

export default function EventCard({ event }: EventCardProps) {
    const ticketTypes = event.ticket_types || [];

    let totalTickets = 0;
    let soldTickets = 0;
    let minPrice = Infinity;

    ticketTypes.forEach(t => {
        totalTickets += t.quantity_total;
        soldTickets += t.quantity_sold;
        if (t.price_pence < minPrice) minPrice = t.price_pence;
    });

    const isSoldOut = totalTickets > 0 && totalTickets - soldTickets === 0;

    const dateStr = new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        timeZone: 'Europe/London',
    }).format(new Date(event.start_at)).toUpperCase();

    const city = extractCity(event.venue_address);
    const dateCityLine = city ? `${dateStr} · ${city}` : dateStr;

    const priceDisplay = minPrice !== Infinity
        ? `From £${(minPrice / 100).toFixed(2)}`
        : 'Free';

    return (
        <Link
            href={`/events/${event.slug}`}
            className="group block rounded-[8px] bg-[#1A1A24] border border-[#2A2A3A] hover:border-[#E63950] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
        >
            {/* Image — 3:2 aspect ratio */}
            <div className="relative overflow-hidden" style={{ aspectRatio: '3 / 2' }}>
                {event.banner_url ? (
                    <Image
                        src={event.banner_url}
                        alt={event.title}
                        fill
                        sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full bg-[#2A2A3A] flex items-center justify-center">
                        <span className="text-[#8888AA] text-xs">No image</span>
                    </div>
                )}
                {/* Category badge */}
                <span
                    className="absolute top-2 left-2 text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-[3px]"
                    style={{ backgroundColor: getCategoryColor(event.category) }}
                >
                    {event.category}
                </span>
            </div>

            {/* Card body */}
            <div className="px-3 pt-2.5">
                {/* Date + city */}
                <p
                    className="truncate mb-1"
                    style={{
                        fontSize: '11px',
                        color: '#E63950',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}
                >
                    {dateCityLine}
                </p>
                {/* Title — max 2 lines */}
                <p
                    className="mb-1.5"
                    style={{
                        fontSize: '13px',
                        color: '#F0F0F8',
                        fontWeight: 600,
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                >
                    {event.title}
                </p>
                {/* Venue */}
                <p
                    className="flex items-center gap-1 truncate mb-2.5"
                    style={{ fontSize: '12px', color: '#8888AA' }}
                >
                    <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true" className="shrink-0">
                        <path d="M5 0C2.79 0 1 1.79 1 4c0 2.97 4 8 4 8s4-5.03 4-8c0-2.21-1.79-4-4-4zm0 5.5C4.17 5.5 3.5 4.83 3.5 4S4.17 2.5 5 2.5 6.5 3.17 6.5 4 5.83 5.5 5 5.5z" fill="#8888AA" />
                    </svg>
                    <span className="truncate">
                        {event.venue_name}{event.venue_address && `, ${event.venue_address.split(',')[0]}`}
                    </span>
                </p>
            </div>

            {/* Footer */}
            <div
                className="flex items-center justify-between px-3 py-2"
                style={{ borderTop: '1px solid #2A2A3A' }}
            >
                <span style={{ fontSize: '13px', color: '#F0F0F8', fontWeight: 700 }}>
                    {priceDisplay}
                </span>
                {isSoldOut ? (
                    <span className="flex items-center gap-1.5" style={{ fontSize: '11px', color: '#E63950' }}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E63950]" />
                        Sold out
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5" style={{ fontSize: '11px', color: '#00E5A0' }}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00E5A0]" />
                        On sale
                    </span>
                )}
            </div>
        </Link>
    );
}
