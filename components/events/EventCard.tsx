'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Event } from '@/types';

interface EventCardProps {
    event: Event;
    showOrganiser?: boolean;
    compact?: boolean;
    priority?: boolean;
}


export default function EventCard({ event, compact = false, priority = false }: EventCardProps) {
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
    }).format(new Date(event.start_at));


    const venueLine = [event.venue_name, event.venue_address?.split(',')[0]].filter(Boolean).join(', ');

    // Price range display
    function getPriceRange(types: typeof visibleTypes): string {
        if (types.length === 0) return 'Tickets TBA';
        if (visibleSoldOut) return 'Sold Out';
        const prices = types.map(t => t.price_pence);
        const lo = Math.min(...prices);
        const hi = Math.max(...prices);
        if (hi === 0) return 'Free';
        const fmt = (p: number) => `£${(p / 100).toFixed(2)}`;
        if (lo === hi) return fmt(lo);
        if (lo === 0) return `Free – ${fmt(hi)}`;
        return `${fmt(lo)} – ${fmt(hi)}`;
    }

    const priceDisplay = getPriceRange(visibleTypes);
    const isEventEnded = event.end_at ? new Date(event.end_at) < new Date() : false;

    return (
        <Link
            href={`/events/${event.slug}`}
            className="group flex flex-col h-full bg-white overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] hover:border-l-[3px] hover:border-l-[#E63950]"
            style={{
                width: '100%',
                border: '1px solid #E0E0E0',
                borderRadius: 0,
                cursor: 'pointer',
                borderLeft: '3px solid transparent',
            }}
        >
            {/* Portrait image — 3:4 aspect ratio */}
            <div className="relative overflow-hidden" style={{ width: '100%', aspectRatio: '3 / 4' }}>
                {event.banner_url ? (
                    <Image
                        src={event.banner_url}
                        alt={event.title}
                        fill
                        priority={priority}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full bg-[#F0F0F0] flex items-center justify-center">
                        <span className="text-[#C0C0C8] text-xs">No image</span>
                    </div>
                )}

                {/* Category badge — top left */}
                <span
                    className="absolute top-2 left-2 text-white uppercase"
                    style={{
                        background: '#E63950',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        letterSpacing: '0.5px',
                    }}
                >
                    {event.category}
                </span>

            </div>

            {/* Card body — flex-1 pushes footer to bottom */}
            <div className="flex flex-col flex-1" style={{ padding: '10px 10px 0' }}>
                {/* Title */}
                <p
                    style={{
                        fontSize: '14px',
                        color: '#0A0A0F',
                        fontWeight: 700,
                        lineHeight: 1.3,
                        marginBottom: '4px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    } as React.CSSProperties}
                >
                    {event.title}
                </p>

                {/* Date */}
                <p style={{ fontSize: '12px', color: '#0A0A0F', fontWeight: 500, marginBottom: '4px' }}>
                    {dateStr}
                </p>

                {/* Venue */}
                {venueLine && (
                    <p
                        style={{
                            fontSize: '12px',
                            color: '#666677',
                            marginBottom: '6px',
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        } as React.CSSProperties}
                    >
                        {venueLine}
                    </p>
                )}
            </div>

            {/* Spacer pushes footer to bottom */}
            <div className="flex-1" />

            {/* Footer row */}
            {!compact && (
                <div
                    className="flex items-center justify-between"
                    style={{ padding: '6px 10px 8px' }}
                >
                    <span style={{ fontSize: '13px', color: '#0A0A0F', fontWeight: 600 }}>
                        {priceDisplay}
                    </span>
                    {isEventEnded ? (
                        <span className="flex items-center gap-1" style={{ fontSize: '11px', color: '#666677' }}>
                            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#666677' }} />
                            Ended
                        </span>
                    ) : visibleSoldOut ? (
                        <span className="flex items-center gap-1" style={{ fontSize: '11px', color: '#E63950' }}>
                            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#E63950' }} />
                            Sold out
                        </span>
                    ) : null}
                </div>
            )}

            {/* Book Now / Event Ended button */}
            {!compact && (
                <div
                    className="group/btn"
                    style={{
                        margin: '0 10px 14px',
                        background: isEventEnded ? '#C0C0C8' : '#E63950',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '8px 0',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        transition: 'background 0.2s',
                        cursor: isEventEnded ? 'default' : 'pointer',
                    }}
                    onMouseEnter={e => { if (!isEventEnded) (e.currentTarget as HTMLDivElement).style.background = '#C0392B' }}
                    onMouseLeave={e => { if (!isEventEnded) (e.currentTarget as HTMLDivElement).style.background = '#E63950' }}
                >
                    {isEventEnded ? 'Event Ended' : 'Book Now'}
                </div>
            )}
            {compact && <div style={{ paddingBottom: '10px' }} />}
        </Link>
    );
}
