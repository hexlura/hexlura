import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import OrganiserDescription from '@/components/organisers/OrganiserDescription';
import FollowButton from '@/components/organisers/FollowButton';
import LikeButton from '@/components/events/LikeButton';
import PromoteEventButton from '@/components/events/PromoteEventButton';

const organiserTypeLabels: Record<string, string> = {
    club_venue: 'Club & Venue',
    individual: 'Individual Organiser',
    artist: 'Artist',
    event_company: 'Event Company',
    charity: 'Charity',
    education: 'Education',
};

export interface OrganiserBadgeOrganiser {
    id: string;
    user_id: string;
    org_name: string;
    organiser_type: string | null;
    logo_url: string | null;
    slug: string;
    cover_url: string | null;
    location: string | null;
    description: string | null;
    website: string | null;
    social_website: string | null;
    social_instagram: string | null;
    social_facebook: string | null;
    social_tiktok: string | null;
    social_youtube: string | null;
    social_twitter: string | null;
    social_linkedin: string | null;
    social_spotify: string | null;
    social_links: Record<string, string> | null;
}

interface OrganiserBadgeProps {
    organiser: OrganiserBadgeOrganiser;
    organiserEventCount: number;
    followCount: number;
    userFollowing: boolean;
    isLoggedIn: boolean;
    // Optional Event properties
    eventId?: string;
    userLiked?: boolean;
    likeCount?: number;
    promoteState?: 'none' | 'requested' | 'active' | 'invited' | null;
    // Optional Organiser Page properties
    averageRating?: number;
    reviewCount?: number;
    extraActions?: React.ReactNode;
}

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
    return (
        <span style={{ display: 'inline-flex', gap: 2 }}>
            {[1, 2, 3, 4, 5].map(s => (
                <span key={s} style={{ fontSize: size, color: s <= Math.round(rating) ? '#F5A623' : '#C0C0C8', lineHeight: 1 }}>★</span>
            ))}
        </span>
    );
}

export default function OrganiserBadge({
    organiser,
    organiserEventCount,
    followCount,
    userFollowing,
    isLoggedIn,
    eventId,
    userLiked,
    likeCount,
    promoteState,
    averageRating,
    reviewCount,
    extraActions,
}: OrganiserBadgeProps) {

    const SOCIAL_PLATFORMS: Record<string, { label: string; color: string; svg: string }> = {
        instagram: { label: 'Instagram', color: '#E1306C', svg: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="white" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="none" stroke="white" stroke-width="1.5"/><circle cx="17.5" cy="6.5" r="1" fill="white"/>' },
        facebook: { label: 'Facebook', color: '#1877F2', svg: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" fill="white"/>' },
        tiktok: { label: 'TikTok', color: '#000000', svg: '<path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78c.27 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3 6.34 6.34 0 0 0 9.49 21.64a6.34 6.34 0 0 0 6.34-6.34V8.78a8.21 8.21 0 0 0 3.76.92V6.69z" fill="white"/>' },
        youtube: { label: 'YouTube', color: '#FF0000', svg: '<path d="M23.5 6.5a3.07 3.07 0 0 0-2.16-2.17C19.5 4 12 4 12 4s-7.5 0-9.34.33A3.07 3.07 0 0 0 .5 6.5 32.1 32.1 0 0 0 0 12a32.1 32.1 0 0 0 .5 5.5 3.07 3.07 0 0 0 2.16 2.17C4.5 20 12 20 12 20s7.5 0 9.34-.33a3.07 3.07 0 0 0 2.16 2.17A32.1 32.1 0 0 0 24 12a32.1 32.1 0 0 0-.5-5.5zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" fill="white"/>' },
        twitter: { label: 'X', color: '#000000', svg: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white"/>' },
        linkedin: { label: 'LinkedIn', color: '#0A66C2', svg: '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="white"/>' },
        spotify: { label: 'Spotify', color: '#1DB954', svg: '<path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" fill="white"/>' },
        soundcloud: { label: 'SoundCloud', color: '#FF5500', svg: '<path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.05-.1-.1-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c.014.057.045.094.09.094s.089-.037.099-.094l.19-1.308-.21-1.334c-.01-.057-.044-.094-.09-.094m1.83-1.229c-.061 0-.12.045-.12.104l-.21 2.563.225 2.458c0 .06.045.104.105.104.061 0 .12-.044.12-.104l.24-2.474-.24-2.547c0-.06-.06-.104-.12-.104m.945-.089c-.075 0-.135.06-.15.135l-.193 2.64.21 2.544c.016.077.075.135.149.135.075 0 .135-.06.15-.135l.24-2.544-.24-2.64c-.015-.075-.075-.135-.15-.135m1.155.36c-.005-.09-.075-.149-.159-.149-.09 0-.158.06-.164.149l-.217 2.43.2 2.563c.005.09.074.149.163.149.09 0 .164-.06.164-.149l.227-2.563-.214-2.43m.705-1.35c-.09 0-.18.09-.18.18l-.195 3.42.195 2.598c0 .09.09.18.18.18s.18-.09.18-.18l.21-2.598-.21-3.42c0-.09-.09-.18-.18-.18m.87-.405c-.104 0-.194.09-.194.194l-.18 3.63.18 2.598c0 .104.09.194.194.194.104 0 .194-.09.194-.194l.195-2.598-.195-3.63c0-.104-.09-.194-.194-.194m.864-.27c-.12 0-.209.09-.224.209l-.165 3.69.165 2.583c.015.12.105.21.224.21.12 0 .21-.09.224-.21l.18-2.583-.18-3.69c-.015-.12-.105-.21-.225-.21m.88-.197c-.135 0-.239.105-.239.24l-.15 3.72.15 2.568c0 .136.104.24.24.24.12 0 .238-.105.238-.24l.164-2.568-.164-3.72c0-.135-.105-.24-.24-.24m.9-.12c-.15 0-.254.12-.254.27l-.12 3.66.135 2.553c0 .15.104.27.254.27.135 0 .254-.12.254-.27l.15-2.553-.15-3.66c0-.15-.12-.27-.255-.27m3.735.105c-.18 0-.33.15-.345.315l-.105 3.39.12 2.523c.015.165.165.315.345.315.165 0 .315-.15.33-.315l.135-2.523-.135-3.39c-.015-.165-.165-.315-.33-.315m-2.79.135c-.165 0-.284.12-.3.285l-.135 3.615.15 2.538c.015.165.135.285.3.285.149 0 .284-.12.284-.285l.165-2.538-.165-3.615c0-.165-.135-.285-.285-.285m.93-.075c-.164 0-.299.135-.314.3l-.12 3.585.135 2.523c.015.164.15.3.314.3.15 0 .3-.135.3-.3l.15-2.523-.15-3.585c0-.165-.15-.3-.3-.3m.93-.06c-.18 0-.314.15-.33.33l-.104 3.51.12 2.508c.014.18.149.33.329.33.165 0 .314-.15.314-.33l.135-2.508-.135-3.51c-.015-.18-.15-.33-.315-.33m3.581.991c-.254 0-.465.165-.51.39-.195.855-.51 1.455-.96 1.95-1.05 1.14-2.535 1.785-4.14 1.785h-8.175c-.254.015-.465.21-.465.465v7.635c0 .27.195.48.435.51.6.09 1.2.15 1.8.15 6.15 0 10.515-4.37 10.515-9.21 0-1.335-.314-2.655-.9-3.87-.12-.24-.39-.405-.66-.405" fill="white"/>' },
        website: { label: 'Website', color: '#0A0A0F', svg: '<circle cx="12" cy="12" r="10" fill="none" stroke="white" stroke-width="1.5"/><line x1="2" y1="12" x2="22" y2="12" stroke="white" stroke-width="1.5"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="none" stroke="white" stroke-width="1.5"/>' },
    };

    return (
        <div className="pb-6">

            {/* Cover Image */}
            <div className="h-[200px] md:h-[250px]" style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
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

            {/* Floating Glass Widget — pulled up over the cover, expands downward */}
            <div
                className="-mt-[65px] md:-mt-[55px] lg:-mt-[25px] relative z-10 mx-[12px] lg:mx-[75px] flex flex-col md:flex-row items-start md:items-stretch justify-between gap-1 md:gap-4 p-4 rounded-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12)] box-border"
                style={{
                    background: 'rgba(255, 255, 255, 0.45)',
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                }}
            >
                {/* Left Side: Profile Info */}
                <div
                    className="flex flex-col gap-2 w-full md:w-auto md:flex-1 min-w-0 no-underline text-inherit"
                >
                    {/* Top Half: Avatar & Stats Row */}
                    <div className="flex items-center gap-4">

                        {/* Avatar */}
                        <Link href={`/organisers/${organiser.slug}`}>
                            <div
                                className="rounded-full overflow-hidden relative shrink-0 flex items-center justify-center bg-black/5"
                                style={{ width: '80px', height: '80px' }}
                            >
                                {organiser.logo_url ? (
                                    <Image src={organiser.logo_url} alt="" fill className="object-cover" />
                                ) : (
                                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#0A0A0F' }}>
                                        {organiser.org_name.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </Link>

                        {/* Stats Block */}
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <Link href={`/organisers/${organiser.slug}`}>
                                <div className="overflow-hidden text-ellipsis"
                                    style={{
                                        fontFamily: "'Bebas Neue', sans-serif",
                                        fontSize: 26,
                                        fontWeight: 900,
                                        color: '#0A0A0F',
                                        lineHeight: 1.1,
                                        margin: '0 0 4px',
                                    }}
                                >
                                    {organiser.org_name}
                                </div>
                            </Link>
                            <div className="flex gap-5">
                                <div className="flex flex-col items-center">
                                    <span className="text-[#0A0A0F] leading-tight"
                                        style={{
                                            fontFamily: "'Bebas Neue', sans-serif",
                                            fontSize: 20,
                                            fontWeight: 900,
                                            lineHeight: 1.1,
                                        }}
                                    >
                                        {organiserEventCount}
                                    </span>
                                    <span className="text-[10px] text-[#0A0A0F] mt-[2px]">
                                        event{organiserEventCount !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[#0A0A0F] leading-tight"
                                        style={{
                                            fontFamily: "'Bebas Neue', sans-serif",
                                            fontSize: 20,
                                            fontWeight: 900,
                                            lineHeight: 1.1,
                                        }}
                                    >
                                        {followCount}
                                    </span>
                                    <span className="text-[10px] text-[#0A0A0F] mt-[2px]">
                                        follower{followCount !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                {reviewCount !== undefined && reviewCount > 0 && averageRating !== undefined && (
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[#0A0A0F] leading-tight"
                                                style={{
                                                    fontFamily: "'Bebas Neue', sans-serif",
                                                    fontSize: 20,
                                                    fontWeight: 900,
                                                    lineHeight: 1.1,
                                                }}
                                            >
                                                {averageRating.toFixed(1)}
                                            </span>
                                            <Stars rating={averageRating} size={11} />
                                        </div>
                                        <span className="text-[10px] text-[#0A0A0F] mt-[2px]">
                                            rating
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Half: Type & Location */}
                    <div className="min-w-0 flex flex-col">
                        <p className="text-[11px] text-[#0A0A0F] mt-[2px] whitespace-nowrap overflow-hidden text-ellipsis flex items-center">
                            <span>{organiser.organiser_type ? (organiserTypeLabels[organiser.organiser_type] ?? organiser.organiser_type) : 'Organiser'}</span>
                            {organiser.location && (
                                <span className="inline-flex items-center gap-1 ml-1 overflow-hidden text-ellipsis">
                                    {' · '}
                                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
                                        <path d="M8 1C5.24 1 3 3.24 3 6c0 4 5 9 5 9s5-5 5-9c0-2.76-2.24-5-5-5zm0 6.5A1.5 1.5 0 1 1 8 4a1.5 1.5 0 0 1 0 3z" fill="#0A0A0F" />
                                    </svg>
                                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">{organiser.location}</span>
                                </span>
                            )}
                        </p>
                    </div>

                    {organiser.description && (
                        <OrganiserDescription description={organiser.description} />
                    )}
                </div>

                {/* Right Side: Actions */}
                <div className="mt-2 md:mt-0 flex flex-col md:justify-between">

                    {/* Social links (Mobile) */}
                    <div className="mb-3 flex justify-start md:justify-end md:hidden">
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
                                <div className="flex justify-center md:justify-start flex-wrap gap-[10px] mt-1">
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
                                                    width: 24, height: 24,
                                                    borderRadius: '50%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: platform.color,
                                                    textDecoration: 'none',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: platform.svg }} />
                                            </a>
                                        )
                                    })}
                                </div>
                            )
                        })()}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-start md:justify-end gap-2 shrink-0 w-full md:w-auto">
                        {eventId && promoteState !== undefined && promoteState !== null && (
                            <PromoteEventButton
                                eventId={eventId}
                                initialState={promoteState}
                                isLoggedIn={isLoggedIn}
                            />
                        )}
                        <FollowButton
                            organiserId={organiser.id}
                            initialFollowing={userFollowing}
                            initialCount={followCount}
                            initialCountShow={false}
                            isLoggedIn={isLoggedIn}
                        />
                        {eventId && userLiked !== undefined && likeCount !== undefined && (
                            <LikeButton
                                eventId={eventId}
                                initialLiked={userLiked}
                                initialCount={likeCount}
                                isLoggedIn={isLoggedIn}
                            />
                        )}
                        {extraActions}
                    </div>

                    {/* Social links (Desktop) */}
                    <div className="mt-3 hidden md:flex md:justify-end">
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
                </div>
            </div>
        </div>
    );
}
