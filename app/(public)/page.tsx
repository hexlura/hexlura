import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import EventCard from '@/components/events/EventCard';
import { Event } from '@/types';

export const revalidate = 60; // SSR with ISR (60 seconds)

export default async function HomePage() {
    const supabase = createClient();

    // Fetch Featured Events
    const { data: featuredEventsRaw } = await supabase
        .from('events')
        .select('*, organiser:organiser_profiles(*), ticket_types(*)')
        .eq('status', 'published')
        .eq('is_featured', true)
        .order('start_at', { ascending: true })
        .limit(10);

    // Fetch All Events
    const { data: allEventsRaw } = await supabase
        .from('events')
        .select('*, organiser:organiser_profiles(*), ticket_types(*)')
        .eq('status', 'published')
        .order('start_at', { ascending: true })
        .limit(12);

    // Fetch Stats
    const { count: liveEventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');

    const { data: ticketTypes } = await supabase
        .from('ticket_types')
        .select('quantity_sold');

    const totalTicketsSold = ticketTypes?.reduce((acc, curr) => acc + (curr.quantity_sold || 0), 0) || 0;

    // Fetch upcoming published events for city counts (one query, count in JS)
    const { data: upcomingCityEvents } = await supabase
        .from('events')
        .select('venue_address, venue_name')
        .eq('status', 'published')
        .gt('start_at', new Date().toISOString());

    const UK_CITY_LIST = ['London', 'Manchester', 'Birmingham', 'Glasgow', 'Edinburgh', 'Leeds', 'Bristol', 'Liverpool', 'Newcastle', 'Cardiff', 'Sheffield', 'Nottingham'];
    const cityCounts = UK_CITY_LIST.map(city => ({
        name: city,
        count: (upcomingCityEvents || []).filter(e => {
            const haystack = `${e.venue_address || ''} ${e.venue_name || ''}`.toLowerCase();
            return haystack.includes(city.toLowerCase());
        }).length,
    }));

    const ukCitiesCovered = cityCounts.filter(c => c.count > 0).length || 15;

    const featuredEvents = (featuredEventsRaw || []) as Event[];
    const allEvents = (allEventsRaw || []) as Event[];

    const categories = ['All', 'Music', 'Sports', 'Comedy', 'Theatre', 'Festival', 'Corporate', 'Family', 'Culture'];

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Hero Section */}
            <section className="relative w-full py-24 md:py-40 bg-black text-white overflow-hidden flex flex-col items-center justify-center text-center px-4">
                {/* Background gradient/image overlay could go here */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-950/40 via-black to-blue-950/20 z-0 pointer-events-none" />

                <div className="relative z-10 max-w-5xl mx-auto space-y-6">
                    <h1 className="text-6xl md:text-[120px] leading-none font-bold tracking-tighter" style={{ fontFamily: '"Bebas Neue", sans-serif' }}>
                        LIVE EVERY MOMENT
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto font-light">
                        Book tickets to the UK&apos;s best concerts, sports, comedy, festivals and more.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                        <Link href="/events" className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold h-14 px-8 text-lg rounded-full w-full sm:w-auto">
                            Find Events
                        </Link>
                        <Link href="/organisers/register" className="flex items-center justify-center bg-transparent border-2 border-white text-white hover:bg-white/10 hover:text-white font-bold h-14 px-8 text-lg rounded-full w-full sm:w-auto">
                            Sell Tickets
                        </Link>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="relative z-10 mt-20 pt-10 border-t border-white/20 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl mx-auto">
                    <div className="flex flex-col items-center justify-center space-y-2">
                        <span className="text-4xl font-bold">{totalTicketsSold.toLocaleString()}</span>
                        <span className="text-sm text-gray-400 uppercase tracking-wider">Tickets Sold</span>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-2">
                        <span className="text-4xl font-bold">{liveEventsCount || 0}</span>
                        <span className="text-sm text-gray-400 uppercase tracking-wider">Live Events</span>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-2">
                        <span className="text-4xl font-bold">{ukCitiesCovered}</span>
                        <span className="text-sm text-gray-400 uppercase tracking-wider">UK Cities</span>
                    </div>
                </div>
            </section>

            {/* Cities Discovery Section */}
            <section className="bg-background py-12 px-4">
                <div className="max-w-7xl mx-auto">
                    <h2 className="font-heading text-3xl text-text tracking-wide mb-8">EXPLORE BY CITY</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {cityCounts.map(({ name, count }) => (
                            <a
                                key={name}
                                href={`/events?city=${encodeURIComponent(name)}`}
                                className="group bg-card border border-border rounded-xl p-5 hover:border-accent transition-colors"
                            >
                                <p className="font-heading text-2xl text-text tracking-wide group-hover:text-accent transition-colors">{name.toUpperCase()}</p>
                                {count > 0 ? (
                                    <p className="text-xs text-muted mt-1">{count} upcoming event{count !== 1 ? 's' : ''}</p>
                                ) : (
                                    <p className="text-xs text-muted mt-1">Coming soon</p>
                                )}
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* Sticky Search Bar */}
            <div className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative w-full md:w-1/3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        <Input type="text" placeholder="Search events, venues, artists..." className="pl-10 h-12 w-full bg-muted/50 border-transparent focus-visible:ring-primary rounded-full" />
                    </div>
                    <div className="relative w-full md:w-1/4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 15 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></svg>
                        <Input type="text" placeholder="London, UK..." className="pl-10 h-12 w-full bg-muted/50 border-transparent focus-visible:ring-primary rounded-full" />
                    </div>
                    <div className="w-full md:w-1/4">
                        <select className="h-12 w-full bg-muted/50 border-transparent rounded-full px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none">
                            <option>Any Date</option>
                            <option>Today</option>
                            <option>This Weekend</option>
                            <option>This Month</option>
                        </select>
                    </div>
                    <Button className="w-full md:w-auto h-12 rounded-full px-8 bg-primary text-primary-foreground font-semibold">
                        Search
                    </Button>
                </div>

                {/* Category Chips - Scrollable horizontally */}
                <div className="max-w-7xl mx-auto px-4 pb-4 overflow-x-auto no-scrollbar flex gap-2">
                    {categories.map((cat, i) => (
                        <Badge
                            key={cat}
                            variant={i === 0 ? "default" : "muted"}
                            className={`px-4 py-1.5 cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap rounded-full font-medium ${i === 0 ? 'bg-black dark:bg-white text-white dark:text-black' : ''}`}
                        >
                            {cat}
                        </Badge>
                    ))}
                </div>
            </div>

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12 space-y-20">

                {/* Featured Events */}
                {featuredEvents.length > 0 && (
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-3xl font-bold tracking-tight">Featured Events</h2>
                            <Link href="/events?featured=true" className="text-primary hover:underline text-sm font-medium">
                                View all featured
                            </Link>
                        </div>

                        {/* Horizontally scrollable row */}
                        <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 snap-x snap-mandatory hide-scroll">
                            {featuredEvents.map((event) => (
                                <div key={event.id} className="min-w-[300px] md:min-w-[400px] snap-center">
                                    <EventCard event={event} showOrganiser />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* All Events Grid */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-3xl font-bold tracking-tight">Upcoming Events</h2>
                    </div>

                    {allEvents.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {allEvents.map((event) => (
                                    <EventCard key={event.id} event={event} showOrganiser />
                                ))}
                            </div>
                            <div className="flex justify-center pt-8">
                                <Button variant="outline" size="lg" className="rounded-full font-semibold">
                                    Load More Events
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="py-20 text-center border rounded-xl bg-muted/20 border-border border-dashed">
                            <h3 className="text-xl font-semibold mb-2">No events found</h3>
                            <p className="text-muted-foreground">Check back later for more exciting events!</p>
                        </div>
                    )}
                </section>

            </main>
        </div>
    );
}
