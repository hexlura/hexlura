import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/Badge';
import BookingWidget from '@/components/events/BookingWidget';
import ShareButton from '@/components/events/ShareButton';
import { Review } from '@/types';

export const revalidate = 60;

const organiserTypeLabels: Record<string, string> = {
    club_venue: 'Club & Venue',
    individual: 'Individual Organiser',
    artist: 'Artist',
    event_company: 'Event Company',
    charity: 'Charity',
    education: 'Education',
};

export default async function EventDetailPage({ params }: { params: { slug: string } }) {
    const supabase = createClient();
    const slug = params.slug;

    const { data: eventData, error } = await supabase
        .from('events')
        .select('*, organiser:organiser_profiles(id, org_name, organiser_type, logo_url, slug), ticket_types(*), reviews(*, user:profiles(full_name, avatar_url))')
        .eq('slug', slug)
        .single();

    if (error || !eventData) {
        notFound();
    }

    const event = eventData;
    const ticketTypes = event.ticket_types || [];
    const reviews = event.reviews || [];

    // Fetch organiser's total published events count
    let organiserEventCount = 0;
    if (event.organiser?.id) {
        const { count } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('organiser_id', event.organiser.id)
            .eq('status', 'published');
        organiserEventCount = count ?? 0;
    }

    const formattedDate = new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/London',
    }).format(new Date(event.start_at));

    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' };
    const startTime = new Intl.DateTimeFormat('en-GB', timeOptions).format(new Date(event.start_at));
    const endTime = event.end_at && event.end_at !== event.start_at
        ? new Intl.DateTimeFormat('en-GB', timeOptions).format(new Date(event.end_at))
        : null;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Event Header Banner */}
            <div className="relative w-full h-64 md:h-96 overflow-hidden mb-4">
                {event.banner_url?.startsWith('http') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-neutral-800 to-neutral-900 flex items-center justify-center">
                        <span className="text-white text-xl">No image provided</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col gap-2">
                    <div className="flex gap-2 mb-2">
                        <Badge className="bg-primary/90 hover:bg-primary">{event.category}</Badge>
                        {event.tags?.map((tag: string) => (
                            <Badge key={tag} variant="muted" className="text-white border-white/40 backdrop-blur-sm">{tag}</Badge>
                        ))}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight uppercase" style={{ fontFamily: '"Bebas Neue", sans-serif' }}>
                        {event.title}
                    </h1>
                </div>
            </div>

            {/* Share button row */}
            <div className="flex items-center justify-end mb-8">
                <ShareButton title={event.title} />
            </div>

            <div className="flex flex-col lg:flex-row gap-12">
                {/* Left Column (60%) */}
                <div className="w-full lg:w-3/5 flex flex-col gap-10">

                    {/* Key Info Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-muted/10 border border-border/50">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                            </div>
                            <div>
                                <h4 className="font-semibold text-lg">{formattedDate}</h4>
                                <p className="text-muted-foreground">{startTime} {endTime ? `- ${endTime}` : 'onwards'} (UK Time)</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 15 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></svg>
                            </div>
                            <div>
                                <h4 className="font-semibold text-lg">{event.venue_name}</h4>
                                <p className="text-muted-foreground text-sm">{event.venue_address}, {event.venue_postcode}</p>
                            </div>
                        </div>
                    </div>

                    {/* About Event */}
                    <section className="space-y-4">
                        <h3 className="text-2xl font-bold">About This Event</h3>
                        {event.description ? (
                            <div className="prose dark:prose-invert max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: event.description }} />
                        ) : (
                            <p className="text-muted-foreground">No description provided.</p>
                        )}
                    </section>

                    {/* Organiser Card */}
                    {event.organiser && (
                        <section>
                            <p style={{ fontSize: '11px', color: '#8888AA', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                                ORGANISED BY
                            </p>
                            <div style={{ background: '#1A1A24', border: '1px solid #2A2A3A', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {/* Organiser logo */}
                                <div
                                    className="rounded-full overflow-hidden relative shrink-0 flex items-center justify-center"
                                    style={{ width: '56px', height: '56px', background: '#2A2A3A' }}
                                >
                                    {event.organiser.logo_url ? (
                                        <Image src={event.organiser.logo_url} alt="" fill className="object-cover" />
                                    ) : (
                                        <span style={{ fontSize: '20px', fontWeight: 700, color: '#F0F0F8' }}>
                                            {event.organiser.org_name.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p style={{ fontSize: '16px', color: '#F0F0F8', fontWeight: 600, lineHeight: 1.3 }}>
                                        {event.organiser.org_name}
                                    </p>
                                    <p style={{ fontSize: '13px', color: '#8888AA', marginTop: '2px' }}>
                                        {organiserTypeLabels[event.organiser.organiser_type] ?? event.organiser.organiser_type}
                                        {' · '}
                                        {organiserEventCount} event{organiserEventCount !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                {/* View Profile button */}
                                <Link
                                    href={`/organisers/${event.organiser.slug}`}
                                    className="shrink-0 transition-colors hover:border-[#E63950]"
                                    style={{ fontSize: '13px', padding: '6px 16px', border: '1px solid #2A2A3A', borderRadius: '2px', color: '#F0F0F8', background: 'transparent', whiteSpace: 'nowrap' }}
                                >
                                    View Profile
                                </Link>
                            </div>
                        </section>
                    )}

                    {/* Map Embed Mock */}
                    <section className="space-y-4">
                        <h3 className="text-2xl font-bold">Location</h3>
                        <div className="w-full h-64 bg-muted flex flex-col items-center justify-center border border-border text-muted-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map mb-2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" x2="9" y1="3" y2="18" /><line x1="15" x2="15" y1="6" y2="21" /></svg>
                            <span>Mapbox Embed: {event.venue_postcode}</span>
                        </div>
                    </section>

                    {/* Reviews Section */}
                    <section className="space-y-6 mt-8">
                        <h3 className="text-2xl font-bold">Attendee Reviews</h3>
                        {reviews.length > 0 ? (
                            <div className="space-y-4">
                                {reviews.map((review: Review) => (
                                    <div key={review.id} className="p-4 border rounded-sm bg-card text-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="flex gap-1 text-yellow-500">
                                                {"★".repeat(review.rating ?? 0)}{"☆".repeat(5 - (review.rating ?? 0))}
                                            </div>
                                            <span className="font-medium text-foreground ml-2">{review.user?.full_name || 'Anonymous'}</span>
                                        </div>
                                        <p className="text-muted-foreground">{review.comment}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center bg-muted/20 border border-dashed">
                                <p className="text-muted-foreground">No reviews yet for this event.</p>
                            </div>
                        )}
                    </section>

                </div>

                {/* Right Column (40%) - Booking Widget */}
                <div className="w-full lg:w-2/5">
                    <BookingWidget event={event} ticketTypes={ticketTypes} />
                </div>
            </div>
        </div>
    );
}
