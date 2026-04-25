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
    social_links: Record<string, string> | null;
    location: string | null;
    is_approved: boolean;
    is_suspended: boolean;
    approved_at: string | null;
    approved_by: string | null;
    created_at: string;
};

const SOCIAL_PLATFORMS: Record<string, { label: string; color: string; svg: string }> = {
    instagram: { label: 'Instagram', color: '#E1306C', svg: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="white" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="none" stroke="white" stroke-width="1.5"/><circle cx="17.5" cy="6.5" r="1" fill="white"/>' },
    facebook: { label: 'Facebook', color: '#1877F2', svg: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" fill="white"/>' },
    tiktok: { label: 'TikTok', color: '#000000', svg: '<path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78c.27 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3 6.34 6.34 0 0 0 9.49 21.64a6.34 6.34 0 0 0 6.34-6.34V8.78a8.21 8.21 0 0 0 3.76.92V6.69z" fill="white"/>' },
    youtube: { label: 'YouTube', color: '#FF0000', svg: '<path d="M23.5 6.5a3.07 3.07 0 0 0-2.16-2.17C19.5 4 12 4 12 4s-7.5 0-9.34.33A3.07 3.07 0 0 0 .5 6.5 32.1 32.1 0 0 0 0 12a32.1 32.1 0 0 0 .5 5.5 3.07 3.07 0 0 0 2.16 2.17C4.5 20 12 20 12 20s7.5 0 9.34-.33a3.07 3.07 0 0 0 2.16-2.17A32.1 32.1 0 0 0 24 12a32.1 32.1 0 0 0-.5-5.5zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" fill="white"/>' },
    twitter: { label: 'X', color: '#000000', svg: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white"/>' },
    linkedin: { label: 'LinkedIn', color: '#0A66C2', svg: '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="white"/>' },
    spotify: { label: 'Spotify', color: '#1DB954', svg: '<path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" fill="white"/>' },
    soundcloud: { label: 'SoundCloud', color: '#FF5500', svg: '<path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.05-.1-.1-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c.014.057.045.094.09.094s.089-.037.099-.094l.19-1.308-.21-1.334c-.01-.057-.044-.094-.09-.094m1.83-1.229c-.061 0-.12.045-.12.104l-.21 2.563.225 2.458c0 .06.045.104.105.104.061 0 .12-.044.12-.104l.24-2.474-.24-2.547c0-.06-.06-.104-.12-.104m.945-.089c-.075 0-.135.06-.15.135l-.193 2.64.21 2.544c.016.077.075.135.149.135.075 0 .135-.06.15-.135l.24-2.544-.24-2.64c-.015-.075-.075-.135-.15-.135m1.155.36c-.005-.09-.075-.149-.159-.149-.09 0-.158.06-.164.149l-.217 2.43.2 2.563c.005.09.074.149.163.149.09 0 .164-.06.164-.149l.227-2.563-.214-2.43m.705-1.35c-.09 0-.18.09-.18.18l-.195 3.42.195 2.598c0 .09.09.18.18.18s.18-.09.18-.18l.21-2.598-.21-3.42c0-.09-.09-.18-.18-.18m.87-.405c-.104 0-.194.09-.194.194l-.18 3.63.18 2.598c0 .104.09.194.194.194.104 0 .194-.09.194-.194l.195-2.598-.195-3.63c0-.104-.09-.194-.194-.194m.864-.27c-.12 0-.209.09-.224.209l-.165 3.69.165 2.583c.015.12.105.21.224.21.12 0 .21-.09.224-.21l.18-2.583-.18-3.69c-.015-.12-.105-.21-.225-.21m.88-.197c-.135 0-.239.105-.239.24l-.15 3.72.15 2.568c0 .136.104.24.24.24.12 0 .238-.105.238-.24l.164-2.568-.164-3.72c0-.135-.105-.24-.24-.24m.9-.12c-.15 0-.254.12-.254.27l-.12 3.66.135 2.553c0 .15.104.27.254.27.135 0 .254-.12.254-.27l.15-2.553-.15-3.66c0-.15-.12-.27-.255-.27m3.735.105c-.18 0-.33.15-.345.315l-.105 3.39.12 2.523c.015.165.165.315.345.315.165 0 .315-.15.33-.315l.135-2.523-.135-3.39c-.015-.165-.165-.315-.33-.315m-2.79.135c-.165 0-.284.12-.3.285l-.135 3.615.15 2.538c.015.165.135.285.3.285.149 0 .284-.12.284-.285l.165-2.538-.165-3.615c0-.165-.135-.285-.285-.285m.93-.075c-.164 0-.299.135-.314.3l-.12 3.585.135 2.523c.015.164.15.3.314.3.15 0 .3-.135.3-.3l.15-2.523-.15-3.585c0-.165-.15-.3-.3-.3m.93-.06c-.18 0-.314.15-.33.33l-.104 3.51.12 2.508c.014.18.149.33.329.33.165 0 .314-.15.314-.33l.135-2.508-.135-3.51c-.015-.18-.15-.33-.315-.33m3.581.991c-.254 0-.465.165-.51.39-.195.855-.51 1.455-.96 1.95-1.05 1.14-2.535 1.785-4.14 1.785h-8.175c-.254.015-.465.21-.465.465v7.635c0 .27.195.48.435.51.6.09 1.2.15 1.8.15 6.15 0 10.515-4.37 10.515-9.21 0-1.335-.314-2.655-.9-3.87-.12-.24-.39-.405-.66-.405" fill="white"/>' },
    website: { label: 'Website', color: '#0A0A0F', svg: '<circle cx="12" cy="12" r="10" fill="none" stroke="white" stroke-width="1.5"/><line x1="2" y1="12" x2="22" y2="12" stroke="white" stroke-width="1.5"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="none" stroke="white" stroke-width="1.5"/>' },
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
        .not('end_at', 'is', null)
        .lt('end_at', now)
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
                            {(organiser.avatar_url || organiser.logo_url) ? (
                                <Image
                                    src={(organiser.avatar_url || organiser.logo_url)!}
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
                                color: '#333344',
                                maxWidth: 480,
                                lineHeight: 1.7,
                                margin: '4px auto 0',
                                whiteSpace: 'pre-line',
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

                        {/* Social links */}
                        {(() => {
                            // Merge legacy columns + JSONB social_links
                            const links: { key: string; url: string }[] = []
                            if (organiser.social_instagram) links.push({ key: 'instagram', url: organiser.social_instagram })
                            if (organiser.social_facebook) links.push({ key: 'facebook', url: organiser.social_facebook })
                            if (organiser.social_links) {
                                for (const [key, url] of Object.entries(organiser.social_links)) {
                                    if (url && !links.some(l => l.key === key)) links.push({ key, url })
                                }
                            }
                            if (!links.some(l => l.key === 'website') && (organiser.social_website || organiser.website)) {
                                links.push({ key: 'website', url: (organiser.social_website || organiser.website)! })
                            }
                            if (links.length === 0) return null
                            return (
                                <div className="flex justify-center md:justify-start flex-wrap gap-[10px] mt-3">
                                    {links.map(({ key, url }) => {
                                        const platform = SOCIAL_PLATFORMS[key]
                                        if (!platform) return null
                                        return (
                                            <a
                                                key={key}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title={platform.label}
                                                style={{
                                                    width: 34, height: 34,
                                                    borderRadius: '50%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: platform.color,
                                                    textDecoration: 'none',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: platform.svg }} />
                                            </a>
                                        )
                                    })}
                                </div>
                            )
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
