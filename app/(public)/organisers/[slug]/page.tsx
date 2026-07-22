import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import EventCard from '@/components/events/EventCard';
import ShareButton from '@/components/events/ShareButton';
import ReviewsSection from '@/components/organisers/ReviewsSection';
import PortfolioSection from '@/components/organisers/PortfolioSection';
import OrganiserBadge from '@/components/organisers/OrganiserBadge';
import { Event, Review } from '@/types';
import type { Metadata } from 'next';
import { getDynamicPageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const serviceClient = createServiceClient();
    const { data: org } = await serviceClient
        .from('organiser_profiles')
        .select('org_name, description, logo_url')
        .eq('slug', params.slug)
        .single();

    if (!org) return { title: 'Organiser Not Found' };

    const plainDescription = org.description
        ? org.description.replace(/<[^>]*>/g, '').slice(0, 160)
        : `Events by ${org.org_name} on Hexlura`;

    return getDynamicPageMetadata(
        `/organisers/${params.slug}`,
        '/organisers/[slug]',
        {
            title: org.org_name,
            description: plainDescription,
            ogImage: org.logo_url || undefined,
        }
    );
}


type OrganiserRow = {
    id: string;
    user_id: string;
    org_name: string;
    slug: string;
    description: string | null;
    website: string | null;
    logo_url: string | null;
    avatar_url: string | null;
    organiser_type: string | null;
    cover_url: string | null;
    social_instagram: string | null;
    social_facebook: string | null;
    social_website: string | null;
    social_tiktok: string | null;
    social_youtube: string | null;
    social_twitter: string | null;
    social_linkedin: string | null;
    social_spotify: string | null;
    social_links: Record<string, string> | null;
    location: string | null;
    is_approved: boolean;
    is_suspended: boolean;
    approved_at: string | null;
    approved_by: string | null;
    created_at: string;
};






export default async function OrganiserProfilePage({ params }: { params: { slug: string } }) {
    const supabase = createClient();
    const serviceClient = createServiceClient();
    const slug = params.slug;

    const { data: organiserData, error: organiserErr } = await serviceClient
        .from('organiser_profiles')
        .select('*, profile:profiles!organiser_profiles_user_id_fkey(avatar_url)')
        .eq('slug', slug)
        .single();

    if (organiserErr || !organiserData) {
        notFound();
    }

    const rawOrganiser = organiserData as unknown as OrganiserRow & { profile: { avatar_url: string | null } | null };
    const organiser: OrganiserRow = {
        ...rawOrganiser,
        // Prefer profiles.avatar_url; fall back to organiser_profiles.logo_url
        avatar_url: rawOrganiser.profile?.avatar_url || rawOrganiser.logo_url || null,
    };
    const now = new Date().toISOString();

    // Fetch upcoming events (published, future)
    const { data: upcomingData } = await supabase
        .from('events')
        .select('*, ticket_types(*)')
        .eq('organiser_id', organiser.id)
        .eq('status', 'published')
        .or(`end_at.gte.${now},end_at.is.null`)
        .order('start_at', { ascending: true })
        .limit(10);

    // Fetch past events
    const { data: pastData } = await supabase
        .from('events')
        .select('*, ticket_types(*)')
        .eq('organiser_id', organiser.id)
        .eq('status', 'ended')
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

    // Portfolio items
    let portfolio: { id: string; type: 'photo' | 'video'; url: string; thumbnail_url: string | null; caption: string | null; display_order: number }[] = [];
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

    return (
        <div style={{ background: '#FAFAFA', minHeight: '100vh' }}>

            {/* ─── SECTION 1: ORGANISER BADGE ─── */}
            <OrganiserBadge
                organiser={organiser}
                organiserEventCount={totalEventsCount ?? 0}
                followCount={followerCount ?? 0}
                userFollowing={userFollowing}
                isLoggedIn={!!user}
                averageRating={averageRating}
                reviewCount={reviewCount}
                extraActions={
                    <ShareButton title={organiser.org_name} />
                }
            />

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
