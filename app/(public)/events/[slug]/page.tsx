import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { Badge } from '@/components/ui/Badge';
import BookingWidget from '@/components/events/BookingWidget';
import ShareButton from '@/components/events/ShareButton';
import EventQRButton from '@/components/events/EventQRButton';
import { Review } from '@/types';
import LikeButton from '@/components/events/LikeButton';
import BannerCarousel from '@/components/events/BannerCarousel';
import FollowButton from '@/components/organisers/FollowButton';
import PromoterRefCapture from '@/components/events/PromoterRefCapture'
import PromoteEventButton from '@/components/events/PromoteEventButton';
import { MetaPixelViewContent } from '@/components/analytics/MetaPixelEvents';

import type { Metadata } from 'next';
import { getDynamicPageMetadata } from '@/lib/seo';

export const revalidate = 120;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const supabase = createClient();
    const { data: event } = await supabase
        .from('events')
        .select('title, description, banner_url, venue_name, start_at')
        .eq('slug', params.slug)
        .single();

    if (!event) return { title: 'Event Not Found' };

    const dateStr = new Intl.DateTimeFormat('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        timeZone: 'Europe/London',
    }).format(new Date(event.start_at));

    const plainDescription = event.description
        ? event.description.replace(/<[^>]*>/g, '').slice(0, 160)
        : `${event.title} — ${dateStr}${event.venue_name ? ` at ${event.venue_name}` : ''}`;

    return getDynamicPageMetadata(
        `/events/${params.slug}`,
        '/events/[slug]',
        {
            title: event.title,
            description: plainDescription,
            ogImage: event.banner_url || undefined,
        }
    );
}

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
    const serviceClient = createServiceClient();
    const slug = params.slug;

    // Round 1 — event + auth in parallel (no dependency between them)
    const [{ data: eventData, error }, { data: { user } }] = await Promise.all([
        supabase
            .from('events')
            .select('*, ticket_types(*), reviews(*, user:profiles(full_name, avatar_url))')
            .eq('slug', slug)
            .single(),
        supabase.auth.getUser(),
    ]);

    if (error || !eventData) {
        notFound();
    }

    const event = eventData;
    const ticketTypes = (event.ticket_types || [])
        .filter((t: { is_visible: boolean }) => t.is_visible !== false)
        .sort((a: { sort_order: number; price_pence: number }, b: { sort_order: number; price_pence: number }) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.price_pence - b.price_pence);
    const reviews = event.reviews || [];
    const isAllFree = ticketTypes.length > 0 && ticketTypes.every((t: { price_pence: number }) => t.price_pence === 0);

    // Round 2 — organiser, like count, user's own like — all independent now that we have event.id + user
    const [
        { data: organiser },
        { count: likeCount },
        { data: userLikeRow },
    ] = await Promise.all([
        serviceClient
            .from('organiser_profiles')
            .select('id, user_id, org_name, organiser_type, logo_url, slug, meta_pixel_id')
            .eq('id', event.organiser_id)
            .single(),
        supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id),
        user
            ? supabase.from('likes').select('id').eq('event_id', event.id).eq('user_id', user.id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
    ]);

    const userLiked = !!userLikeRow;

    // Round 3 — organiser event count + follow count + user follow — parallel once we have organiser.id
    const [
        { count: organiserEventCountRaw },
        { count: followCountRaw },
        { data: followRow },
        { data: promoteAssignmentRow },
    ] = await Promise.all([
        organiser?.id
            ? supabase.from('events').select('*', { count: 'exact', head: true }).eq('organiser_id', organiser.id).eq('status', 'published')
            : Promise.resolve({ count: 0, error: null }),
        organiser?.id
            ? supabase.from('follows').select('*', { count: 'exact', head: true }).eq('organiser_id', organiser.id)
            : Promise.resolve({ count: 0, error: null }),
        organiser?.id && user
            ? supabase.from('follows').select('id').eq('organiser_id', organiser.id).eq('user_id', user.id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        // Viewer's own promoter assignment for this event (RLS: promoters read own rows)
        user
            ? supabase
                .from('promoter_event_assignments')
                .select('status, promoter:promoter_profiles!inner(user_id)')
                .eq('event_id', event.id)
                .eq('promoter.user_id', user.id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
    ]);

    const organiserEventCount = organiserEventCountRaw ?? 0;
    const followCount = followCountRaw ?? 0;
    const userFollowing = !!followRow;

    // "Promote this event" button state — hidden for the event's own organiser,
    // declined requesters, and non-published events
    const assignmentStatus = (promoteAssignmentRow as { status?: string } | null)?.status;
    let promoteState: 'none' | 'requested' | 'active' | 'invited' | null;
    if (event.status !== 'published' || (user && organiser?.user_id === user.id) || assignmentStatus === 'declined') {
        promoteState = null;
    } else if (assignmentStatus === 'active') {
        promoteState = 'active';
    } else if (assignmentStatus === 'requested') {
        promoteState = 'requested';
    } else if (assignmentStatus === 'invited') {
        promoteState = 'invited';
    } else {
        promoteState = 'none'; // no relationship yet, or previously removed (may re-request)
    }

    const formattedDate = new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/London',
    }).format(new Date(event.start_at));

    const timeOpts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' };
    const shortDateOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: 'Europe/London' };

    // Compare calendar dates in London tz (en-CA gives YYYY-MM-DD)
    const startDateUK = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date(event.start_at));
    const endDateUK = event.end_at ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date(event.end_at)) : null;
    const isMultiDay = !!endDateUK && endDateUK !== startDateUK;

    const startTime = new Intl.DateTimeFormat('en-US', timeOpts).format(new Date(event.start_at));
    const endTime = event.end_at
        ? new Intl.DateTimeFormat('en-US', timeOpts).format(new Date(event.end_at))
        : null;
    const endShortDate = event.end_at
        ? new Intl.DateTimeFormat('en-GB', shortDateOpts).format(new Date(event.end_at))
        : null;

    // Helper: format a UTC ISO string as "10 Apr, 9:30 PM" in London tz
    function fmtCheckin(iso: string): string {
        const d = new Date(iso);
        const date = new Intl.DateTimeFormat('en-GB', shortDateOpts).format(d);
        const time = new Intl.DateTimeFormat('en-US', timeOpts).format(d);
        return `${date}, ${time}`;
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
            {/* Promoter referral capture: reads ?ref=, sets cookie, logs click. Renders nothing. */}
            <PromoterRefCapture eventId={event.id} />
            <MetaPixelViewContent
                organiserPixelId={organiser?.meta_pixel_id}
                eventId={event.id}
                eventName={event.title}
                valuePence={ticketTypes.length > 0 ? ticketTypes[0].price_pence : 0}
            />

            {/* Organiser badge — full width, above grid */}
            {organiser && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#F5F5F7', border: '1px solid #E0E0E8', flexWrap: 'wrap', marginBottom: '24px' }}>
                    <Link href={`/organisers/${organiser.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 140px', minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                        <div className="rounded-full overflow-hidden relative shrink-0 flex items-center justify-center" style={{ width: '36px', height: '36px', background: '#C0C0C8' }}>
                            {organiser.logo_url ? (
                                <Image src={organiser.logo_url} alt="" fill className="object-cover" />
                            ) : (
                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0A0A0F' }}>{organiser.org_name.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '14px', fontWeight: 600, color: '#0A0A0F', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{organiser.org_name}</p>
                            <p style={{ fontSize: '11px', color: '#666677', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {organiserTypeLabels[organiser.organiser_type] ?? organiser.organiser_type}
                                {' · '}{organiserEventCount} event{organiserEventCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {promoteState !== null && (
                            <PromoteEventButton
                                eventId={event.id}
                                initialState={promoteState}
                                isLoggedIn={!!user}
                            />
                        )}
                        <FollowButton
                            organiserId={organiser.id}
                            initialFollowing={userFollowing}
                            initialCount={followCount}
                            isLoggedIn={!!user}
                        />
                        <LikeButton
                            eventId={event.id}
                            initialLiked={userLiked}
                            initialCount={likeCount ?? 0}
                            isLoggedIn={!!user}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6 md:gap-8">

                {/* Banner — LEFT COL, ROW 1 | mobile: 3:4, desktop: 2:3 */}
                <div className="md:col-start-1 relative w-full overflow-hidden aspect-[3/4] md:aspect-[2/3]">
                    <BannerCarousel
                        images={(event.banner_images?.length ? event.banner_images : event.banner_url ? [event.banner_url] : [])}
                        title={event.title}
                    />
                </div>

                {/* RIGHT STICKY PANEL — RIGHT COL, spans all rows */}
                <div className="md:col-start-2 md:row-start-1 md:row-span-5">
                    <div className="md:sticky md:top-8 flex flex-col gap-6">

                        {/* Event title */}
                        <h1 className="uppercase tracking-tight leading-none" style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '36px', color: '#0A0A0F' }}>
                            {event.title}
                        </h1>

                        {/* Category + tag badges */}
                        <div className="flex gap-2 flex-wrap">
                            <Badge className="bg-primary/90 hover:bg-primary">{event.category}</Badge>
                            {event.tags?.map((tag: string) => (
                                <Badge key={tag} variant="muted">{tag}</Badge>
                            ))}
                        </div>

                        {/* Date and venue */}
                        <div className="grid grid-cols-1 gap-4 p-4 bg-muted/10 border border-border/50">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                                </div>
                                <div>
                                    <h4 className="font-semibold">{formattedDate}</h4>
                                    {isMultiDay ? (
                                        <p className="text-muted-foreground text-sm">
                                            {startTime} → {endShortDate}, {endTime} (UK Time)
                                        </p>
                                    ) : (
                                        <p className="text-muted-foreground text-sm">
                                            {startTime}{endTime && endTime !== startTime ? ` – ${endTime}` : ''} (UK Time)
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 15 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></svg>
                                </div>
                                <div>
                                    <h4 className="font-semibold">{event.venue_name}</h4>
                                    <p className="text-muted-foreground text-sm">{event.venue_address}, {event.venue_postcode}</p>
                                </div>
                            </div>
                        </div>

                        {/* Check-in window */}
                        {event.checkin_start_at && (() => {
                            const openStr = fmtCheckin(event.checkin_start_at)
                            const closeStr = event.checkin_end_at ? fmtCheckin(event.checkin_end_at) : null
                            const windowStr = closeStr ? `Opens ${openStr} · Closes ${closeStr}` : `Opens ${openStr}`
                            return (
                                <div>
                                    <p style={{ fontSize: '11px', color: '#666677', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                        DOORS / CHECK-IN
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#0A0A0F' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8888AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4H3a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h10"/><path d="M18 8l4 4-4 4"/><path d="M8 12h14"/></svg>
                                        {windowStr}
                                    </div>
                                </div>
                            )
                        })()}

                        {/* Refund policy badge */}
                        {event.refund_policy && (() => {
                            const policyMap: Record<string, { label: string; bg: string; color: string; border: string }> = {
                                no_refunds: { label: 'No Refunds', bg: 'rgba(230,57,80,0.1)', color: '#E63950', border: '1px solid #E63950' },
                                '48_hours': { label: 'Refunds up to 48hrs before event', bg: 'rgba(245,166,35,0.1)', color: '#F5A623', border: '1px solid #F5A623' },
                                '7_days': { label: 'Refunds up to 7 days before event', bg: 'rgba(245,166,35,0.1)', color: '#F5A623', border: '1px solid #F5A623' },
                                full_refunds: { label: 'Full Refunds Available', bg: 'rgba(0,229,160,0.1)', color: '#00E5A0', border: '1px solid #00E5A0' },
                            }
                            const policy = policyMap[event.refund_policy]
                            if (!policy) return null
                            return (
                                <div>
                                    <span style={{ display: 'inline-flex', padding: '6px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '2px', marginTop: '12px', background: policy.bg, color: policy.color, border: policy.border }}>
                                        {policy.label}
                                    </span>
                                    <p style={{ fontSize: '11px', color: '#666677', marginTop: '6px' }}>Booking fees are non-refundable</p>
                                </div>
                            )
                        })()}

                        {/* Favourite & Share buttons */}
                        <div className="flex justify-end gap-2">
                            <LikeButton
                                eventId={event.id}
                                initialLiked={userLiked}
                                initialCount={likeCount ?? 0}
                                isLoggedIn={!!user}
                            />
                            <ShareButton title={event.title} />
                            <EventQRButton />
                        </div>

                        {/* Free event badge */}
                        {isAllFree && (
                            <div>
                                <span style={{ display: 'inline-block', background: 'rgba(0,229,160,0.12)', border: '1px solid #00E5A0', color: '#00E5A0', fontSize: 12, fontWeight: 700, letterSpacing: 2, padding: '4px 12px', textTransform: 'uppercase' }}>
                                    Free Event
                                </span>
                                <p style={{ fontSize: 13, color: '#666677', marginTop: 6 }}>
                                    Reserve your free spot before it fills up
                                </p>
                            </div>
                        )}

                        {/* Booking widget */}
                        <div id="booking-widget">
                            <BookingWidget event={event} ticketTypes={ticketTypes} />
                        </div>
                    </div>
                </div>

                {/* YouTube Embed — LEFT COL */}
                {event.youtube_url && (() => {
                    const url = event.youtube_url
                    let videoId: string | null = null
                    try {
                        const parsed = new URL(url)
                        if (parsed.hostname === 'youtu.be') {
                            videoId = parsed.pathname.slice(1)
                        } else {
                            videoId = parsed.searchParams.get('v')
                        }
                    } catch {}
                    if (!videoId) return null
                    return (
                        <div className="md:col-start-1" style={{ aspectRatio: '16/9', width: '100%' }}>
                            <iframe
                                src={`https://www.youtube.com/embed/${videoId}`}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    )
                })()}

                {/* About This Event — LEFT COL */}
                <section className="md:col-start-1 space-y-4">
                    <h3 className="text-2xl font-bold">About This Event</h3>
                    {event.description ? (
                        <div className="prose dark:prose-invert max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: event.description }} />
                    ) : (
                        <p className="text-muted-foreground">No description provided.</p>
                    )}
                </section>

                {/* Location — LEFT COL */}
                <section className="md:col-start-1 space-y-4">
                    <h3 className="text-2xl font-bold">Location</h3>
                    {(() => {
                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue_address + ' ' + event.venue_name)}`;
                        return (
                            <div>
                                <p style={{ fontSize: '16px', fontWeight: 700, color: '#0A0A0F' }}>{event.venue_name}</p>
                                <p style={{ fontSize: '14px', color: '#666677', marginTop: '4px' }}>{event.venue_address}{event.venue_postcode ? `, ${event.venue_postcode}` : ''}</p>
                                <a
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="maps-link-btn"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginTop: '12px',
                                        padding: '8px 16px',
                                        border: '1px solid #C0C0C8',
                                        borderRadius: '2px',
                                        color: '#0A0A0F',
                                        fontSize: '13px',
                                        textDecoration: 'none',
                                        transition: 'border-color 0.15s',
                                    }}
                                >
                                    View on Google Maps
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                                </a>
                            </div>
                        );
                    })()}
                </section>

                {/* Reviews — LEFT COL */}
                <section className="md:col-start-1 space-y-6">
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
        </div>
    );
}
