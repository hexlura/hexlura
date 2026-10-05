import React from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import BookingWidget from '@/components/events/BookingWidget';
import ShareButton from '@/components/events/ShareButton';
import EventQRButton from '@/components/events/EventQRButton';
import { Review } from '@/types';
import LikeButton from '@/components/events/LikeButton';
import BannerCarousel from '@/components/events/BannerCarousel';
import PromoterRefCapture from '@/components/events/PromoterRefCapture'
import { MetaPixelViewContent } from '@/components/analytics/MetaPixelEvents';
import OrganiserBadge from '@/components/organisers/OrganiserBadge';

import type { Metadata } from 'next';
import { getDynamicPageMetadata } from '@/lib/seo';
import { getFeeConfig } from '@/lib/fees';

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
        // Slug may have been changed since this URL was last shared — check
        // whether it matches a previous slug before giving up with a 404.
        const { data: historyRow } = await serviceClient
            .from('event_slug_history')
            .select('events(slug)')
            .eq('old_slug', slug)
            .maybeSingle();

        const currentSlug = (historyRow?.events as { slug?: string } | null)?.slug;
        if (currentSlug) {
            permanentRedirect(`/events/${currentSlug}`);
        }

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
            .select('*')
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
            ? supabase.from('events').select('*', { count: 'exact', head: true }).eq('organiser_id', organiser.id)
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

    // Buyer-facing prices include the booking fee, unless this organiser is exempt (same rule as checkout)
    const liveFeeConfig = await getFeeConfig();
    const bookingFeeConfig = {
        ...liveFeeConfig,
        ...(organiser?.booking_fee_exempt ? { percent: 0, minPence: 0, maxPence: 0 } : {}),
        ...(organiser?.processing_fee_exempt ? { processingFeePence: 0 } : {}),
    };

    const policyMap: Record<string, { label: string; cls: string }> = {
        'No refunds': { label: 'No Refunds', cls: 'border-warm-red text-warm-red' },
        'Refunds up to 48 hours before event': { label: 'Refunds up to 48hrs before event', cls: 'border-warm-amber text-warm-amberText' },
        'Refunds up to 7 days before event': { label: 'Refunds up to 7 days before event', cls: 'border-warm-amber text-warm-amberText' },
        'Full refunds always available': { label: 'Full Refunds Available', cls: 'border-warm-green text-warm-green' },
    }
    // Keyed on the exact sentence EventForm saves (components/organiser/EventForm.tsx's REFUND_POLICIES).
    const refundPolicy = event.refund_policy ? policyMap[event.refund_policy] : undefined

    let youtubeId: string | null = null
    if (event.youtube_url) {
        try {
            const parsed = new URL(event.youtube_url)
            youtubeId = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v')
        } catch { }
    }

    const headingClass = 'font-heading text-2xl tracking-wide mb-3'
    const iconClass = 'text-muted mt-0.5 shrink-0'

    return (
        <div>

            {/* Organiser badge — full width, above grid */}
            {organiser && (
                <OrganiserBadge
                    organiser={organiser}
                    organiserEventCount={organiserEventCount}
                    followCount={followCount}
                    userFollowing={userFollowing}
                    userLiked={userLiked}
                    likeCount={likeCount ?? 0}
                    eventId={event.id}
                    isLoggedIn={!!user}
                    promoteState={promoteState}
                />
            )}

            <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-10">
                {/* Promoter referral capture: reads ?ref=, sets cookie, logs click. Renders nothing. */}
                <PromoterRefCapture eventId={event.id} />
                <MetaPixelViewContent
                    organiserPixelId={organiser?.meta_pixel_id}
                    eventId={event.id}
                    eventName={event.title}
                    valuePence={ticketTypes.length > 0 ? ticketTypes[0].price_pence : 0}
                />

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">

                    {/* ============ LEFT: poster, about, location, reviews ============ */}
                    <div className="min-w-0 order-2 lg:order-1">
                        {/* Poster (portrait: 3:4 mobile / 2:3 desktop) */}
                        <div className="relative rounded-3xl overflow-hidden aspect-[3/4] md:aspect-[2/3] w-full max-w-sm md:max-w-none md:w-4/5 mx-auto md:mx-0 bg-gradient-to-br from-accent to-warm-orange shadow-card mb-6">
                            <BannerCarousel
                                images={(event.banner_images?.length ? event.banner_images : event.banner_url ? [event.banner_url] : [])}
                                title={event.title}
                            />
                        </div>

                        {/* YouTube Embed */}
                        {youtubeId && (
                            <div className="mb-8 rounded-2xl overflow-hidden shadow-soft" style={{ aspectRatio: '16/9', width: '100%' }}>
                                <iframe
                                    src={`https://www.youtube.com/embed/${youtubeId}`}
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        )}

                        {/* About */}
                        <section className="mb-8">
                            <h2 className={headingClass}>ABOUT THIS EVENT</h2>
                            {event.description ? (
                                <div
                                    className="text-sm text-muted leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:text-text [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:font-semibold [&_h3]:text-text [&_a]:text-accent [&_a]:underline"
                                    dangerouslySetInnerHTML={{ __html: event.description }}
                                />
                            ) : (
                                <p className="text-sm text-muted">No description provided.</p>
                            )}
                        </section>

                        {/* Location */}
                        <section className="mb-8">
                            <h2 className={headingClass}>LOCATION</h2>
                            {(() => {
                                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue_address + ' ' + event.venue_name)}`;
                                return (
                                    <div className="bg-card rounded-2xl border border-border shadow-soft p-4 flex items-center justify-between gap-4 flex-wrap">
                                        <div>
                                            <p className="font-semibold text-sm">{event.venue_name}</p>
                                            <p className="text-xs text-muted">{event.venue_address}{event.venue_postcode ? `, ${event.venue_postcode}` : ''}</p>
                                        </div>
                                        <a
                                            href={mapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-semibold text-accent hover:underline shrink-0"
                                        >
                                            Open in Google Maps →
                                        </a>
                                    </div>
                                );
                            })()}
                        </section>

                        {/* Reviews */}
                        <section>
                            <h2 className={headingClass}>ATTENDEE REVIEWS</h2>
                            {reviews.length > 0 ? (
                                <div className="space-y-4">
                                    {reviews.map((review: Review) => (
                                        <div key={review.id} className="bg-card rounded-2xl border border-border shadow-soft p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-semibold text-sm">{review.user?.full_name || 'Anonymous'}</p>
                                                <span className="text-warm-amber text-xs tracking-wide">
                                                    {"★".repeat(review.rating ?? 0)}{"☆".repeat(5 - (review.rating ?? 0))}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted">{review.comment}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-card rounded-2xl border border-dashed border-border">
                                    <p className="text-sm text-muted">No reviews yet for this event.</p>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* ============ RIGHT: title, meta, tickets ============ */}
                    <div className="order-1 lg:order-2 lg:sticky lg:top-24 h-fit">

                        <div className="flex gap-2 flex-wrap mb-3">
                            <span className="inline-block px-3 py-1 rounded-full bg-text text-white text-xs font-semibold" style={{ background: '#1A0E0C' }}>
                                {event.category}
                            </span>
                            {event.tags?.map((tag: string) => (
                                <span key={tag} className="inline-block px-3 py-1 rounded-full bg-border text-muted text-xs font-semibold">{tag}</span>
                            ))}
                        </div>

                        <h1 className="font-heading text-4xl leading-none uppercase mb-4">{event.title}</h1>

                        {/* Date and venue */}
                        <div className="bg-card rounded-2xl border border-border shadow-soft p-4 space-y-3 mb-4">
                            <div className="flex items-start gap-3">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>
                                <div>
                                    <p className="text-sm font-semibold">{formattedDate}</p>
                                    {isMultiDay ? (
                                        <p className="text-xs text-muted">{startTime} → {endShortDate}, {endTime} (UK Time)</p>
                                    ) : (
                                        <p className="text-xs text-muted">{startTime}{endTime && endTime !== startTime ? ` – ${endTime}` : ''} (UK Time)</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                                <div>
                                    <p className="text-sm font-semibold">{event.venue_name}</p>
                                    <p className="text-xs text-muted">{event.venue_address}{event.venue_postcode ? `, ${event.venue_postcode}` : ''}</p>
                                </div>
                            </div>
                            {event.checkin_start_at && (() => {
                                const openStr = fmtCheckin(event.checkin_start_at)
                                const closeStr = event.checkin_end_at ? fmtCheckin(event.checkin_end_at) : null
                                return (
                                    <div className="flex items-start gap-3">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}><path d="M13 4H3a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h10" /><path d="M18 8l4 4-4 4" /><path d="M8 12h14" /></svg>
                                        <div>
                                            <p className="text-sm font-semibold">Doors / check-in</p>
                                            <p className="text-xs text-muted">{closeStr ? `Opens ${openStr} · Closes ${closeStr}` : `Opens ${openStr}`}</p>
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>

                        {/* Refund policy badge */}
                        {refundPolicy && (
                            <div className="mb-4">
                                <span className={`inline-block px-3 py-1.5 rounded-full border text-xs font-semibold mb-1 ${refundPolicy.cls}`}>{refundPolicy.label}</span>
                                <p className="text-xs text-muted">Booking fees are non-refundable</p>
                            </div>
                        )}

                        {/* Free event badge */}
                        {isAllFree && (
                            <div className="mb-4">
                                <span className="inline-block px-3 py-1.5 rounded-full bg-warm-green/10 text-warm-green text-xs font-bold tracking-wide uppercase">Free Event</span>
                                <p className="text-xs text-muted mt-1.5">Reserve your free spot before it fills up</p>
                            </div>
                        )}

                        {/* Favourite & Share buttons */}
                        <div className="flex items-center gap-2 mb-6 flex-wrap">
                            <LikeButton
                                eventId={event.id}
                                initialLiked={userLiked}
                                initialCount={likeCount ?? 0}
                                isLoggedIn={!!user}
                            />
                            <ShareButton title={event.title} />
                            <EventQRButton />
                        </div>

                        {/* Booking widget */}
                        <div id="booking-widget">
                            <BookingWidget event={event} ticketTypes={ticketTypes} feeConfig={bookingFeeConfig} />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
