import React from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import EventCard from '@/components/events/EventCard';
import ShareButton from '@/components/events/ShareButton';
import { Event } from '@/types';

export const revalidate = 60;

export default async function OrganiserProfilePage({ params }: { params: { slug: string } }) {
    const supabase = createClient();
    const serviceClient = createServiceClient();
    const slug = params.slug;

    const { data: organiserData, error: organiserErr } = await serviceClient
        .from('organiser_profiles')
        .select('*')
        .eq('slug', slug)
        .single();

    if (organiserErr || !organiserData) {
        notFound();
    }

    const organiser = organiserData;

    // Retrieve published events by this organiser
    const { data: eventsData } = await supabase
        .from('events')
        .select('*, ticket_types(*)')
        .eq('organiser_id', organiser.id)
        .eq('status', 'published')
        .order('start_at', { ascending: true });

    const events = eventsData || [];

    // Provide the organiser to the event cards manually since we didn't join it to avoid circular lookups overhead
    const eventsWithOrganiser = events.map(ev => ({ ...ev, organiser }));

    // Retrieve average rating for this organiser
    const { data: reviewsData } = await supabase
        .from('reviews')
        .select('rating, events!inner(organiser_id)')
        .eq('events.organiser_id', organiser.id);

    let averageRating = 0;
    let reviewCount = 0;

    if (reviewsData && reviewsData.length > 0) {
        const validReviews = reviewsData.filter(r => r.rating != null);
        if (validReviews.length > 0) {
            const sum = validReviews.reduce((acc, curr) => acc + (curr.rating as number), 0);
            averageRating = sum / validReviews.length;
            reviewCount = validReviews.length;
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 min-h-screen">

            {/* Organiser Header */}
            <div className="bg-card border border-border p-8 mb-12 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left shadow-sm">
                <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 rounded-full border-4 border-background shadow-md overflow-hidden relative bg-muted">
                    {organiser.logo_url ? (
                        <Image src={organiser.logo_url} alt={organiser.org_name} fill className="object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-4xl text-muted-foreground bg-muted/50">
                            {organiser.org_name.charAt(0)}
                        </div>
                    )}
                </div>

                <div className="flex-1 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="space-y-1">
                            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{organiser.org_name}</h1>
                            {organiser.website && (
                                <a href={organiser.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm font-medium">
                                    {organiser.website.replace(/^https?:\/\//, '')}
                                </a>
                            )}
                        </div>
                        <div className="flex md:justify-end">
                            <ShareButton title={organiser.org_name} />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <div className="flex text-yellow-500">
                                {"★".repeat(Math.round(averageRating)) || "★"}
                                {"☆".repeat(5 - (Math.round(averageRating) || 1))}
                            </div>
                            <span className="font-medium text-foreground ml-1">{averageRating > 0 ? averageRating.toFixed(1) : 'No ratings'}</span>
                            {reviewCount > 0 && <span className="ml-1">({reviewCount} reviews)</span>}
                        </div>
                        <div>•</div>
                        <div>{events.length} Events Listed</div>
                    </div>

                    <p className="max-w-3xl text-muted-foreground leading-relaxed">
                        {organiser.description || 'This organiser has not provided a description yet.'}
                    </p>
                </div>
            </div>

            {/* Events Grid */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold border-b pb-4">Upcoming Events by {organiser.org_name}</h2>

                {eventsWithOrganiser.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {eventsWithOrganiser.map((event) => (
                            <EventCard key={event.id} event={event as Event} />
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center border-2 border-dashed bg-muted/20">
                        <h3 className="text-xl font-semibold mb-2">No upcoming events</h3>
                        <p className="text-muted-foreground">This organiser doesn&apos;t have any published events right now.</p>
                    </div>
                )}
            </div>

        </div>
    );
}
