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
import PortfolioSection from '@/components/organisers/PortfolioSection';
import { Event, Review } from '@/types';

export const revalidate = 60;

const PLATFORMS: Record<string, { label: string; icon: string; color: string }> = {
    instagram: { label: 'Instagram', icon: '📷', color: '#E1306C' },
    facebook: { label: 'Facebook', icon: '👥', color: '#1877F2' },
    tiktok: { label: 'TikTok', icon: '🎵', color: '#000000' },
    youtube: { label: 'YouTube', icon: '▶️', color: '#FF0000' },
    twitter: { label: 'X (Twitter)', icon: '𝕏', color: '#000000' },
    linkedin: { label: 'LinkedIn', icon: '💼', color: '#0A66C2' },
    spotify: { label: 'Spotify', icon: '🎧', color: '#1DB954' },
    soundcloud: { label: 'SoundCloud', icon: '☁️', color: '#FF5500' },
    website: { label: 'Website', icon: '🌐', color: '#0A0A0F' },
};

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
    social_links: Record<string, string> | null;
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

    // Portfolio items — table may not exist yet, guard against missing table errors
    let portfolio: { id: string; type: 'photo' | 'video'; url: string; thumbnail_url: string | null; caption: string | null; display_order: number }[] = [];
    try {
        const { data: portfolioData, error: portfolioError } = await supabase
            .from('organiser_portfolio')
            .select('id, type, url, thumbnail_url, caption, display_order')
            .eq('organiser_id', organiser.id)
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .limit(20);
        if (!portfolioError && portfolioData) {
            portfolio = portfolioData as typeof portfolio;
        }
    } catch {
        // Table may not exist yet — safe to ignore
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
            <div className="h-[140px] md:h-[200px]" style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
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
                    <div style={{ position: 'absolute', inset: 0, background: '#F5F5F7' }} />
                )}
            </div>

            {/* ─── SECTION 2: PROFILE INFO ─── */}
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6 py-6 border-b border-[#E0E0E0]">

                    {/* Avatar */}
                    <div className="flex justify-center md:block flex-shrink-0">
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            border: '2px solid #E0E0E0',
                            background: '#E63950',
                            overflow: 'hidden',
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
                                <span style={{ fontSize: 30, color: '#FFFFFF', fontWeight: 900, lineHeight: 1 }}>
                                    {initials}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center md:text-left">
                        <h1 style={{
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: 36,
                            fontWeight: 900,
                            color: '#0A0A0F',
                            letterSpacing: '1px',
                            lineHeight: 1.1,
                            margin: '0 0 4px',
                        }}>
                            {organiser.org_name}
                        </h1>

                        <p style={{
                            fontSize: 11,
                            color: '#E63950',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '1.5px',
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
                                margin: '0 auto 0',
                            }}
                                className="md:mx-0"
                            >
                                {organiser.description}
                            </p>
                        )}

                        {/* Stats row */}
                        <div className="flex justify-center md:justify-start flex-wrap gap-x-6 gap-y-2 mt-3 items-center">
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

                        {/* Social links — from JSONB social_links, fallback to legacy columns */}
                        {(() => {
                            const links: { key: string; url: string }[] = [];
                            if (organiser.social_links && Object.keys(organiser.social_links).length > 0) {
                                for (const [key, url] of Object.entries(organiser.social_links)) {
                                    if (url) links.push({ key, url });
                                }
                            } else {
                                if (organiser.social_instagram) links.push({ key: 'instagram', url: organiser.social_instagram });
                                if (organiser.social_facebook) links.push({ key: 'facebook', url: organiser.social_facebook });
                                if (organiser.social_website || organiser.website) links.push({ key: 'website', url: (organiser.social_website || organiser.website)! });
                            }
                            if (links.length === 0) return null;
                            return (
                                <div className="flex justify-center md:justify-start flex-wrap gap-[10px] mt-3">
                                    {links.map(({ key, url }) => {
                                        const p = PLATFORMS[key];
                                        return (
                                            <a
                                                key={key}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title={p?.label || key}
                                                style={{
                                                    width: 36, height: 36,
                                                    border: '1px solid #E0E0E0',
                                                    borderRadius: '50%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    textDecoration: 'none',
                                                    flexShrink: 0,
                                                    fontSize: 18,
                                                    transition: 'border-color 0.2s, transform 0.2s',
                                                }}
                                            >
                                                {p?.icon || '🔗'}
                                            </a>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Follow + Share buttons — right side */}
                    <div className="flex flex-row justify-center md:justify-end gap-2 w-full md:w-auto md:flex-shrink-0 md:self-start md:pt-1">
                        <ShareButton title={organiser.org_name} />
                        <FollowButton
                            organiserId={organiser.id}
                            initialFollowing={userFollowing}
                            initialCount={followerCount ?? 0}
                            isLoggedIn={!!user}
                        />
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

            {/* ─── SECTION 5: PORTFOLIO ─── */}
            {portfolio.length > 0 && (
                <div style={{ maxWidth: 1200, margin: '40px auto 0', padding: '0 24px' }}>
                    <h2 style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: 26,
                        color: '#0A0A0F',
                        letterSpacing: '1px',
                        margin: '0 0 16px',
                        lineHeight: 1,
                    }}>
                        PORTFOLIO
                    </h2>
                    <PortfolioSection items={portfolio} />
                </div>
            )}

            {/* ─── SECTION 6: REVIEWS ─── */}
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
