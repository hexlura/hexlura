import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Event } from '@/types';

interface EventCardProps {
    event: Event;
    showOrganiser?: boolean;
}

const categoryColors: Record<string, string> = {
    Music: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Sports: 'bg-green-500/10 text-green-500 border-green-500/20',
    Comedy: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    Theatre: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    Festival: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    Corporate: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    Family: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    Culture: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    Other: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

export default function EventCard({ event, showOrganiser = false }: EventCardProps) {
    // Safe calculation of seats and prices
    const ticketTypes = event.ticket_types || [];

    let totalTickets = 0;
    let soldTickets = 0;
    let minPrice = Infinity;

    ticketTypes.forEach(t => {
        totalTickets += t.quantity_total;
        soldTickets += t.quantity_sold;
        if (t.price_pence < minPrice) {
            minPrice = t.price_pence;
        }
    });

    const availableSeats = totalTickets - soldTickets;
    const isUrgent = totalTickets > 0 && availableSeats < 50 && availableSeats > 0;
    const isSoldOut = totalTickets > 0 && availableSeats === 0;

    const progressPercent = totalTickets > 0 ? (soldTickets / totalTickets) * 100 : 0;

    const formattedDate = new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Europe/London',
    }).format(new Date(event.start_at));

    return (
        <Card className="flex flex-col overflow-hidden h-full hover:shadow-lg transition-all border-border/50 bg-card group">
            <Link href={`/events/${event.slug}`} className="relative h-48 w-full block overflow-hidden">
                {event.banner_url ? (
                    <Image
                        src={event.banner_url}
                        alt={event.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground">No image available</span>
                    </div>
                )}

                <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                    <Badge className={`backdrop-blur-md ${categoryColors[event.category] || categoryColors.Other}`}>
                        {event.category}
                    </Badge>

                    {isUrgent && (
                        <Badge variant="muted" className="bg-destructive text-destructive-foreground animate-pulse shadow-lg">
                            Only {availableSeats} left!
                        </Badge>
                    )}

                    {isSoldOut && (
                        <Badge variant="muted" className="bg-black/80 text-white backdrop-blur-md">
                            Sold Out
                        </Badge>
                    )}
                </div>
            </Link>

            <div className="p-5 flex flex-col flex-grow gap-4">
                <div className="space-y-2">
                    <div className="text-sm font-medium text-primary tracking-wide uppercase">
                        {formattedDate}
                    </div>
                    <Link href={`/events/${event.slug}`}>
                        <h3 className="text-xl font-bold tracking-tight line-clamp-2 hover:text-primary transition-colors">
                            {event.title}
                        </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground line-clamp-1 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 15 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></svg>
                        {event.venue_name}{event.venue_address && `, ${event.venue_address.split(',')[0]}`}
                    </p>
                </div>

                {showOrganiser && event.organiser && (
                    <Link href={`/organisers/${event.organiser.slug}`} className="flex items-center gap-2 mt-auto pt-2 hover:opacity-80">
                        {event.organiser.logo_url ? (
                            <div className="relative w-6 h-6 rounded-full overflow-hidden">
                                <Image src={event.organiser.logo_url} alt={event.organiser.org_name} fill className="object-cover" />
                            </div>
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                                {event.organiser.org_name.charAt(0)}
                            </div>
                        )}
                        <span className="text-xs text-muted-foreground">By {event.organiser.org_name}</span>
                    </Link>
                )}

                <div className="mt-auto pt-4 border-t border-border/50 flex flex-col gap-3">
                    {/* Seat Availability Progress */}
                    {totalTickets > 0 && (
                        <div className="space-y-1.5 w-full">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Availability</span>
                                <span className="font-medium">{progressPercent >= 100 ? 'Sold Out' : `${Math.round(100 - progressPercent)}% left`}</span>
                            </div>
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${isUrgent ? 'bg-destructive' : 'bg-primary'}`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-1">
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">From</span>
                            <span className="text-lg font-bold">
                                {minPrice !== Infinity ? `£${(minPrice / 100).toFixed(2)}` : 'Free'}
                            </span>
                        </div>
                        <Link href={`/events/${event.slug}`}>
                            <button
                                className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${isSoldOut
                                    ? 'bg-secondary text-secondary-foreground cursor-not-allowed opacity-70'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                    }`}
                                disabled={isSoldOut}
                            >
                                {isSoldOut ? 'Sold Out' : 'Book Now'}
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </Card>
    );
}
