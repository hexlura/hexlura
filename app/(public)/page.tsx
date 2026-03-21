import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import EventCard from '@/components/events/EventCard';
import CityCards from '@/components/home/CityCards';
import { Event } from '@/types';

export const revalidate = 60; // SSR with ISR (60 seconds)

export default async function HomePage() {
    const supabase = createClient();

    // Fetch All Events
    const { data: allEventsRaw } = await supabase
        .from('events')
        .select('*, organiser:organiser_profiles(*), ticket_types(*)')
        .eq('status', 'published')
        .order('start_at', { ascending: true })
        .limit(12);

    const allEvents = (allEventsRaw || []) as Event[];

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Hero Section */}
            <section className="relative w-full py-24 md:py-40 bg-black text-white overflow-hidden flex flex-col items-center justify-center text-center px-4">
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
            </section>

            {/* City Cards */}
            <CityCards />

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12 space-y-20">

                {/* Upcoming Events */}
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
