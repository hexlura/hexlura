import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import EventCard from '@/components/events/EventCard';
import ShareButton from '@/components/events/ShareButton';
import FollowButton from '@/components/organisers/FollowButton';
import ReviewsSection from '@/components/organisers/ReviewsSection';
import { Event, Review } from '@/types';

export const revalidate = 60;

type OrganiserRow = {
    id: string;
    user_id: string;
    org_name: string;
    slug: string;
    description: string | null;
    website: string | null;
    logo_url: string | null;
    organiser_type: string | null;
    cover_url: string | null;
    social_instagram: string | null;
    social_facebook: string | null;
    social_website: string | null;
    location: string | null;
    is_approved: boolean;
    is_suspended: boolean;
    approved_at: string | null;
    approved_by: string | null;
    created_at: string;
};

const ORGANISER_TYPE_LABELS: Record<string, string> = {
    individual: 'Individual',
    artist: 'Artist / Performer',
    club_venue: 'Club / Venue',
    event_company: 'Event Company',
    charity: 'Charity / Community',
    education: 'Education',
};

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
    return (
        <span style={{ display: 'inline-flex', gap: 2 }}>
            {[1, 2, 3, 4, 5].map(s => (
                <span key={s} style={{ fontSize: size, color: s <= Math.round(rating) ? '#F5A623' : '#C0C0C8', lineHeight: 1 }}>★</span>
            ))}
        </span>
    );
}

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

    const organiser = organiserData as unknown as OrganiserRow;
    const now = new Date().toISOString();

    // Fetch upcoming events (published, future)
    const { data: upcomingData } = await supabase
        .from('events')
        .select('*, ticket_types(*)')
        .eq('organiser_id', organiser.id)
        .eq('status', 'published')
        .gt('start_at', now)
        .order('start_at', { ascending: true })
        .limit(10);

    // Fetch past events
    const { data: pastData } = await supabase
        .from('events')
        .select('*, ticket_types(*)')
        .eq('organiser_id', organiser.id)
        .lt('start_at', now)
        .order('start_at', { ascending: false })
        .limit(6);

    // All event IDs for reviews + can-review check
    const { data: allEventRows } = await supabase
        .from('events')
        .select('id')
        .eq('organiser_id', organiser.id);

    const allEventIds = (allEventRows || []).map((e: { id: string }) => e.id);

    const upcomingEvents = (upcomingData || []).map(ev => ({ ...ev, organiser })) as Event[];
    const pastEvents = (pastData || []).map(ev => ({ ...ev, organiser })) as Event[];

    // Total published events count
    const { count: totalEventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('organiser_id', organiser.id)
        .eq('status', 'published');

    // Follower count
    const { count: followerCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('organiser_id', organiser.id);

    // Current user + follow status
    const { data: { user } } = await supabase.auth.getUser();
    let userFollowing = false;
    if (user) {
        const { data: followRow } = await supabase
            .from('follows')
            .select('id')
            .eq('organiser_id', organiser.id)
            .eq('user_id', user.id)
            .single();
        userFollowing = !!followRow;
    }

    // Reviews
    let reviews: (Review & { user?: { full_name: string | null } })[] = [];
    let averageRating = 0;
    let reviewCount = 0;

    if (allEventIds.length > 0) {
        const { data: reviewsData } = await supabase
            .from('reviews')
            .select('*, user:profiles(full_name)')
            .in('event_id', allEventIds)
            .eq('is_visible', true)
            .order('created_at', { ascending: false });

        reviews = reviewsData || [];
        reviewCount = reviews.length;
        if (reviewCount > 0) {
            const sum = reviews.reduce((acc, r) => acc + (r.rating ?? 0), 0);
            averageRating = sum / reviewCount;
        }
    }

    // Can user review?
    let canReview = false;
    let hasReviewed = false;
    if (user && allEventIds.length > 0) {
        const { data: booking } = await supabase
            .from('bookings')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'confirmed')
            .in('event_id', allEventIds)
            .limit(1)
            .single();
        canReview = !!booking;
        if (canReview) {
            const { data: existingReview } = await supabase
                .from('reviews')
                .select('id')
                .eq('user_id', user.id)
                .in('event_id', allEventIds)
                .single();
            hasReviewed = !!existingReview;
        }
    }

    const typeLabel = organiser.organiser_type
        ? (ORGANISER_TYPE_LABELS[organiser.organiser_type] || organiser.organiser_type)
        : 'Organiser';

    const initials = organiser.org_name.charAt(0).toUpperCase();

    return (
        <div style={{ background: '#FAFAFA', minHeight: '100vh' }}>

            {/* ─── SECTION 1: HERO COVER BANNER ─── */}
            <div style={{
                position: 'relative',
                width: '100%',
                height: 'clamp(220px, 28vw, 320px)',
                overflow: 'hidden',
            }}>
                {/* Background */}
                {organiser.cover_url ? (
                    <Image
                        src={organiser.cover_url}
                        alt={`${organiser.org_name} cover`}
                        fill
                        sizes="100vw"
                        className="object-cover object-center"
                        priority
                    />
                ) : (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #E63950 100%)',
                    }}>
                        {/* Dot pattern overlay */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                        }} />
                    </div>
                )}

                {/* Bottom dark gradient overlay */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 200,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                    pointerEvents: 'none',
                }} />

                {/* Organiser type badge — top left */}
                <div style={{
                    position: 'absolute',
                    top: 20,
                    left: 24,
                    background: 'rgba(0,0,0,0.5)',
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '6px 14px',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                }}>
                    {typeLabel}
                </div>

                {/* Follow + Share buttons — top right */}
                <div style={{
                    position: 'absolute',
                    top: 16,
                    right: 24,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                }}>
                    <div style={{
                        background: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        padding: '2px 4px',
                    }}>
                        <ShareButton title={organiser.org_name} />
                    </div>
                    <div style={{
                        background: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        padding: '2px 4px',
                    }}>
                        <FollowButton
                            organiserId={organiser.id}
                            initialFollowing={userFollowing}
                            initialCount={followerCount ?? 0}
                            isLoggedIn={!!user}
                        />
                    </div>
                </div>
            </div>

            {/* ─── SECTION 2: PROFILE INFO (overlapping banner) ─── */}
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
                <div style={{
                    position: 'relative',
                    marginTop: -60,
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    gap: 24,
                    paddingBottom: 28,
                    borderBottom: '1px solid #E0E0E0',
                    flexWrap: 'wrap',
                }}>
                    {/* Avatar */}
                    <div style={{
                        width: 100,
                        height: 100,
                        borderRadius: '50%',
                        border: '4px solid #FFFFFF',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                        background: '#E63950',
                        overflow: 'hidden',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                    }}>
                        {organiser.logo_url ? (
                            <Image
                                src={organiser.logo_url}
                                alt={organiser.org_name}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <span style={{ fontSize: 36, color: '#FFFFFF', fontWeight: 900, lineHeight: 1 }}>
                                {initials}
                            </span>
                        )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 220 }}>
                        <h1 style={{
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: 'clamp(24px, 4vw, 32px)',
                            fontWeight: 900,
                            color: '#0A0A0F',
                            letterSpacing: '1px',
                            lineHeight: 1.1,
                            margin: '0 0 4px',
                        }}>
                            {organiser.org_name}
                        </h1>

                        <p style={{
                            fontSize: 13,
                            color: '#E63950',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            margin: '0 0 8px',
                        }}>
                            {typeLabel}
                        </p>

                        {organiser.description && (
                            <p style={{
                                fontSize: 14,
                                color: '#666677',
                                maxWidth: 500,
                                lineHeight: 1.6,
                                margin: 0,
                            }}>
                                {organiser.description}
                            </p>
                        )}

                        {/* Stats row */}
                        <div style={{
                            display: 'flex',
                            gap: 24,
                            marginTop: 16,
                            flexWrap: 'wrap',
                            alignItems: 'center',
                        }}>
                            <div>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0F' }}>
                                    {(followerCount ?? 0).toLocaleString()}
                                </span>
                                <span style={{ fontSize: 13, color: '#8888AA', marginLeft: 4 }}>Followers</span>
                            </div>
                            <div>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0F' }}>
                                    {totalEventsCount ?? 0}
                                </span>
                                <span style={{ fontSize: 13, color: '#8888AA', marginLeft: 4 }}>Events</span>
                            </div>
                            {reviewCount > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0F' }}>
                                        {averageRating.toFixed(1)}
                                    </span>
                                    <Stars rating={averageRating} size={13} />
                                    <span style={{ fontSize: 13, color: '#8888AA' }}>Rating</span>
                                </div>
                            )}
                            {organiser.location && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                        <path d="M8 1C5.24 1 3 3.24 3 6c0 4 5 9 5 9s5-5 5-9c0-2.76-2.24-5-5-5zm0 6.5A1.5 1.5 0 1 1 8 4a1.5 1.5 0 0 1 0 3z" fill="#8888AA" />
                                    </svg>
                                    <span style={{ fontSize: 13, color: '#8888AA' }}>{organiser.location}</span>
                                </div>
                            )}
                        </div>

                        {/* Social links */}
                        {(organiser.social_instagram || organiser.social_facebook || organiser.social_website || organiser.website) && (
                            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                                {organiser.social_instagram && (
                                    <a
                                        href={organiser.social_instagram}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Instagram"
                                        style={{
                                            width: 32, height: 32,
                                            border: '1px solid #E0E0E0',
                                            borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#666677', textDecoration: 'none',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                                            <circle cx="12" cy="12" r="4" />
                                            <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
                                        </svg>
                                    </a>
                                )}
                                {organiser.social_facebook && (
                                    <a
                                        href={organiser.social_facebook}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Facebook"
                                        style={{
                                            width: 32, height: 32,
                                            border: '1px solid #E0E0E0',
                                            borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#666677', textDecoration: 'none',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                                        </svg>
                                    </a>
                                )}
                                {(organiser.social_website || organiser.website) && (
                                    <a
                                        href={(organiser.social_website || organiser.website)!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Website"
                                        style={{
                                            width: 32, height: 32,
                                            border: '1px solid #E0E0E0',
                                            borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#666677', textDecoration: 'none',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="2" y1="12" x2="22" y2="12" />
                                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                        </svg>
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── SECTION 3: UPCOMING EVENTS ─── */}
            <div style={{ maxWidth: 1200, margin: '40px auto 0', padding: '0 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: 26,
                        color: '#0A0A0F',
                        letterSpacing: '1px',
                        margin: 0,
                        lineHeight: 1,
                    }}>
                        UPCOMING EVENTS
                    </h2>
                    <span style={{
                        background: '#F0F0F0',
                        color: '#0A0A0F',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '3px 10px',
                        marginLeft: 8,
                    }}>
                        {upcomingEvents.length}
                    </span>
                    <Link
                        href={`/events?organiser=${organiser.slug}`}
                        style={{
                            marginLeft: 'auto',
                            fontSize: 13,
                            color: '#E63950',
                            fontWeight: 600,
                            textDecoration: 'none',
                        }}
                    >
                        See All →
                    </Link>
                </div>

                {upcomingEvents.length > 0 ? (
                    <div
                        className="hide-scrollbar"
                        style={{
                            display: 'flex',
                            overflowX: 'auto',
                            gap: 16,
                            paddingBottom: 8,
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                        }}
                    >
                        {upcomingEvents.map(event => (
                            <div key={event.id} style={{ width: 200, flexShrink: 0 }}>
                                <EventCard event={event} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#8888AA', fontSize: 14 }}>
                        No upcoming events at the moment. Check back soon!
                    </div>
                )}
            </div>

            {/* ─── SECTION 4: PAST EVENTS ─── */}
            {pastEvents.length > 0 && (
                <div style={{ maxWidth: 1200, margin: '40px auto 0', padding: '0 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                        <h2 style={{
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: 26,
                            color: '#0A0A0F',
                            letterSpacing: '1px',
                            margin: 0,
                            lineHeight: 1,
                        }}>
                            PAST EVENTS
                        </h2>
                        <span style={{
                            background: '#F0F0F0',
                            color: '#0A0A0F',
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '3px 10px',
                            marginLeft: 8,
                        }}>
                            {pastEvents.length}
                        </span>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            overflowX: 'auto',
                            gap: 16,
                            paddingBottom: 8,
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                        }}
                    >
                        {pastEvents.map(event => (
                            <div key={event.id} style={{ width: 200, flexShrink: 0, opacity: 0.85 }}>
                                <div style={{ position: 'relative' }}>
                                    <EventCard event={event} />
                                    {/* ENDED overlay badge */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            background: 'rgba(0,0,0,0.6)',
                                            color: '#FFFFFF',
                                            fontSize: 10,
                                            fontWeight: 700,
                                            padding: '3px 8px',
                                            pointerEvents: 'none',
                                            zIndex: 2,
                                            letterSpacing: '0.5px',
                                        }}
                                    >
                                        ENDED
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── SECTION 5: REVIEWS ─── */}
            <div style={{
                maxWidth: 1200,
                margin: '40px auto 60px',
                padding: '40px 24px 0',
                borderTop: '1px solid #E0E0E0',
            }}>
                <ReviewsSection
                    organiserId={organiser.id}
                    reviews={reviews.slice(0, 5)}
                    averageRating={averageRating}
                    reviewCount={reviewCount}
                    canReview={canReview}
                    hasReviewed={hasReviewed}
                    isLoggedIn={!!user}
                />
            </div>

        </div>
    );
}
