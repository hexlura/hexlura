import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { Button } from '@/components/ui/Button';
import EventCard from '@/components/events/EventCard';
import CityCards from '@/components/home/CityCards';
import { Event } from '@/types';

export default async function HomePage() {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    let role = 'user';
    if (user) {
        const serviceClient = createServiceClient();
        const { data: profile } = await serviceClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        role = profile?.role || 'user';
    }

    const sellTicketsHref = !user
        ? '/auth/register?next=/organiser/apply'
        : (role === 'organiser' || role === 'admin')
            ? '/organiser'
            : '/organiser/apply';

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
                        <Link href={sellTicketsHref} className="flex items-center justify-center bg-transparent border-2 border-white text-white hover:bg-white/10 hover:text-white font-bold h-14 px-8 text-lg rounded-full w-full sm:w-auto">
                            Sell Tickets
                        </Link>
                    </div>
                </div>
            </section>

            {/* City Cards */}
            <CityCards />

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12 space-y-20">

                {/* Upcoming Events */}
                <section>
                    <div className="flex items-center justify-between mb-5">
                        <h2
                            style={{
                                fontFamily: '"Bebas Neue", sans-serif',
                                fontSize: '22px',
                                color: '#F0F0F8',
                                letterSpacing: '1px',
                            }}
                        >
                            UPCOMING EVENTS
                        </h2>
                        <Link
                            href="/events"
                            style={{
                                fontSize: '13px',
                                color: '#E63950',
                                border: '1px solid #E63950',
                                padding: '5px 14px',
                                borderRadius: '4px',
                            }}
                        >
                            View All
                        </Link>
                    </div>

                    {allEvents.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-4 gap-[14px]">
                                {allEvents.map((event) => (
                                    <EventCard key={event.id} event={event} />
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
