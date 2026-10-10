import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { getStaticPageMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { Event } from '@/types';
import type { FeaturedEvent } from './HeroSlider';
import EventCard from '@/components/events/EventCard'
import BackgroundVideo from '@/components/sell-tickets/BackgroundVideo';
import RecommendedEvents from '@/components/home/RecommendedEvents';
import { getPageControls, isSectionVisible } from '@/lib/page-controls/get-page-controls';
import { PAGE_KEYS, HOME_SECTION_KEYS } from '@/lib/page-controls/constants';
import { getListingFees, buyerTicketPrice } from '@/lib/fees';
import { FeeProvider } from '@/lib/fee-context';
// import { RevenueCalculator } from '@/components/organiser/RevenueCalculator'


// Emoji fallback used only when a category has no uploaded image yet.
// Admins manage the image_url for each category in /admin/categories.
const CATEGORY_EMOJI_FALLBACK: Record<string, string> = {
    'Club Nights': '🌙',
    'Gigs & Live Music': '🎵',
    'Festivals': '🎪',
    'Comedy': '😂',
    'Theatre & Arts': '🎭',
    'Sports & Fitness': '🏆',
    'Food & Drink': '🍷',
    'Family & Kids': '🎈',
    'Business & Networking': '💼',
    'Classes & Workshops': '📚',
    'Dating & Social': '💫',
    'Culture & Heritage': '🎨',
}


export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
    return getStaticPageMetadata('/')
}

export default async function HomePage() {
    const supabase = createClient();

    const now = new Date().toISOString();
    const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString();

    const [{ count: thisWeekCount }, { data: eventsRaw }, { data: pastEventsRaw }, { data: citiesRaw }, { data: categoriesRaw }, { data: featuredRaw }, { data: partnersRaw }, pageControls, listingFees] = await Promise.all([
        supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'published')
            .gte('start_at', now)
            .lte('start_at', weekAhead),
        supabase
            .from('events')
            .select('*, ticket_types(*)')
            .eq('status', 'published')
            .or(`end_at.gte.${now},end_at.is.null`)
            .order('start_at', { ascending: true })
            .limit(20),
        supabase
            .from('events')
            .select('*, ticket_types(*)')
            .eq('status', 'ended')
            .order('start_at', { ascending: false })
            .limit(10),
        supabase
            .from('cities')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true }),
        supabase
            .from('categories')
            .select('id, name, slug, image_url')
            .eq('is_active', true)
            .order('display_order', { ascending: true }),
        supabase
            .from('events')
            .select('id, title, slug, banner_url, start_at, end_at, venue_name, venue_address, category, organiser_id, ticket_types(price_pence)')
            .eq('status', 'published')
            .eq('is_featured', true)
            .or(`end_at.gte.${now},end_at.is.null`)
            .order('featured_order', { ascending: true }),
        supabase
            .from('trusted_parterns')
            .select('name, image_url')
            .eq('is_active', true)
            .order('display_order', { ascending: true }),
        getPageControls(PAGE_KEYS.HOME),
        getListingFees(),
    ]);

    const upcomingEventsVisible = isSectionVisible(pageControls, HOME_SECTION_KEYS.UPCOMING_EVENTS);

    const events = (eventsRaw || []) as Event[];
    const pastEvents = (pastEventsRaw || []) as Event[];
    const cities = (citiesRaw || []) as Array<{ id: string; name: string; slug: string; image_url: string | null }>;
    const categories = (categoriesRaw || []) as Array<{ id: string; name: string; slug: string; image_url: string | null }>;
    const partners = (partnersRaw || []).filter(p => !!p.image_url) as Array<{ name: string; image_url: string }>;

    type FeaturedRaw = FeaturedEvent & { organiser_id: string; ticket_types: { price_pence: number }[] };
    const featuredEvents: FeaturedEvent[] = ((featuredRaw || []) as unknown as FeaturedRaw[]).map(e => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        banner_url: e.banner_url,
        start_at: e.start_at,
        venue_name: e.venue_name,
        venue_address: e.venue_address,
        category: e.category,
        // All-in: cheapest ticket plus the buyer's booking fee (fee never decreases with price)
        min_price_pence: e.ticket_types?.length > 0
            ? buyerTicketPrice(
                Math.min(...e.ticket_types.map((t: { price_pence: number }) => t.price_pence)),
                e.organiser_id,
                listingFees,
            ).totalPence
            : null,
    }));

    const fmtPence = (p: number) => `£${(p / 100).toFixed(2)}`
    const featuredShown = featuredEvents.slice(0, 6)
    const chips = categories.slice(0, 5)
    const gradients = [
        'from-accent to-warm-orange',
        'from-warm-orange to-warm-amber',
        'from-warm-amber to-warm-yellow',
        'from-warm-green to-warm-amber',
        'from-accent to-warm-amber',
        'from-warm-orange to-accent',
    ]
    const cardTextBtn = 'text-sm font-semibold text-accent hover:underline'

    return (
        <FeeProvider fees={listingFees}>
        <div>
            {/* ── HERO ── */}
            <section
                className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28"
                style={{
                    background:
                        'radial-gradient(1000px 500px at 100% 0%, rgba(255,122,61,0.25), transparent), radial-gradient(800px 400px at 0% 100%, rgba(230,57,80,0.25), transparent), #1A0E0C',
                }}
            >
                <BackgroundVideo
                    webmSrc="/assets/videos/hero_card.webm"
                    mp4Src="/assets/videos/hero_card.mp4"
                    poster="/assets/videos/hero_card-poster.jpg"
                    className="absolute inset-0 w-full h-full object-cover z-0"
                />
                {/* Dark overlay for text readability + fade into the page below */}
                <div aria-hidden className="absolute inset-0 bg-black/55 z-0" />
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/40 to-transparent z-0" />
                <div className="max-w-5xl mx-auto px-6 lg:px-10 text-center relative z-10">
                    {(thisWeekCount ?? 0) > 0 && (
                        <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-semibold mb-6 tracking-wide">
                            🔥 {thisWeekCount} {thisWeekCount === 1 ? 'EVENT' : 'EVENTS'} THIS WEEK
                        </span>
                    )}
                    <h1 className="font-heading text-5xl sm:text-6xl lg:text-8xl leading-[0.9] text-white mb-6">
                        FIND YOUR<br />
                        <span className="bg-gradient-to-r from-accent via-warm-orange to-warm-amber bg-clip-text text-transparent">NEXT NIGHT OUT</span>
                    </h1>
                    <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
                        Discover live music, nightlife, comedy and more — all across the UK, all in one place.
                    </p>

                    {/* Search-first bar */}
                    <form action="/events" method="get" className="bg-white rounded-2xl shadow-card p-2 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto text-left">
                        <label className="flex-1 flex items-center gap-2 px-4 py-2.5">
                            <svg className="text-muted shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                            <input
                                type="text"
                                name="q"
                                placeholder="Search events, artists, venues…"
                                aria-label="Search events"
                                className="w-full text-sm text-text placeholder:text-muted focus:outline-none bg-transparent"
                            />
                        </label>
                        <div className="hidden sm:block w-px bg-border my-1" />
                        <label className="flex items-center gap-2 px-4 py-2.5 sm:w-44">
                            <svg className="text-muted shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                            <input
                                type="text"
                                name="location"
                                placeholder="Any city"
                                aria-label="City"
                                className="w-full text-sm text-text placeholder:text-muted focus:outline-none bg-transparent"
                            />
                        </label>
                        <button type="submit" className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold shadow-glow hover:brightness-110 transition shrink-0">
                            Search
                        </button>
                    </form>

                    {/* Category quick chips */}
                    {chips.length > 0 && (
                        <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
                            {chips.map(cat => (
                                <Link
                                    key={cat.id}
                                    href={`/events?category=${encodeURIComponent(cat.name)}`}
                                    className="px-3.5 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-semibold hover:bg-white/20 transition"
                                >
                                    {CATEGORY_EMOJI_FALLBACK[cat.name] ? `${CATEGORY_EMOJI_FALLBACK[cat.name]} ` : ''}{cat.name}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ── FEATURED POSTERS (overlap the hero) ── */}
            {featuredShown.length > 0 && (
                <section className="max-w-7xl mx-auto px-6 lg:px-10 -mt-16 relative z-10">
                    <div className="flex gap-5 overflow-x-auto overflow-y-hidden pb-2" style={{ scrollbarWidth: 'none' }}>
                        {featuredShown.map((e, i) => {
                            const dateLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/London' }).format(new Date(e.start_at)).replace(',', '')
                            return (
                                <Link key={e.id} href={`/events/${e.slug}`} className="group shrink-0 w-48 sm:w-56">
                                    <div
                                        className={`relative overflow-hidden rounded-2xl shadow-hover bg-gradient-to-br ${gradients[i % gradients.length]}`}
                                        style={{ aspectRatio: '2 / 3' }}
                                    >
                                        {e.banner_url && (
                                            <Image
                                                src={e.banner_url}
                                                alt={e.title}
                                                fill
                                                sizes="(max-width: 640px) 192px, 224px"
                                                className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
                                                priority={i < 3}
                                            />
                                        )}
                                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 text-[11px] font-bold text-text">FEATURED</span>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                        <p className="absolute bottom-3 left-3 right-3 text-white font-heading text-xl leading-none line-clamp-3">{e.title.toUpperCase()}</p>
                                    </div>
                                    <div className="pt-3">
                                        <p className="text-xs text-muted mb-1 line-clamp-1">
                                            {[e.venue_name, dateLabel].filter(Boolean).join(' · ')}
                                        </p>
                                        <p className={`font-heading text-lg ${e.min_price_pence === 0 ? 'text-warm-green' : ''}`}>
                                            {e.min_price_pence == null ? 'Tickets TBA' : e.min_price_pence === 0 ? 'Free Event' : `From ${fmtPence(e.min_price_pence)}`}
                                        </p>
                                    </div>
                                </Link>
                            )
                        })}
                        <Link href="/business" className="group shrink-0 w-48 sm:w-56">
                            <div className="rounded-2xl shadow-hover bg-text flex flex-col justify-center px-5" style={{ aspectRatio: '2 / 3', background: '#1A0E0C' }}>
                                <p className="text-accent text-xs font-bold mb-2 tracking-wide">FOR ORGANISERS</p>
                                <p className="text-white font-heading text-3xl leading-none mb-3">SELLING<br />TICKETS?</p>
                                <span className="text-white/60 text-xs group-hover:text-white transition">Start free →</span>
                            </div>
                            <div className="pt-3">
                                <p className="text-xs text-muted">Free to start, no lock-in</p>
                            </div>
                        </Link>
                    </div>
                </section>
            )}

            {/* ── EXPLORE BY CITY ── */}
            {cities.length > 0 && (
                <section className="max-w-7xl mx-auto px-6 lg:px-10 mt-16">
                    <h2 className="font-heading text-2xl lg:text-3xl tracking-wide mb-5">EXPLORE BY CITY</h2>
                    <div className="flex gap-3 overflow-x-auto overflow-y-hidden pb-2" style={{ scrollbarWidth: 'none' }}>
                        {cities.map((city, i) => (
                            <Link
                                key={city.id}
                                href={`/events?city=${encodeURIComponent(city.slug)}`}
                                className="shrink-0 flex items-center gap-2 pl-2 pr-4 py-2 rounded-full bg-card border border-border shadow-soft hover:shadow-hover transition"
                            >
                                <span className={`relative w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center text-white text-sm font-bold`}>
                                    {city.image_url ? (
                                        <Image src={city.image_url} alt="" fill sizes="36px" className="object-cover" />
                                    ) : (
                                        city.name.charAt(0)
                                    )}
                                </span>
                                <span className="text-sm font-semibold">{city.name}</span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* ── UPCOMING EVENTS ── */}
            {upcomingEventsVisible && (
                <section className="max-w-7xl mx-auto px-6 lg:px-10 mt-14">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-heading text-2xl lg:text-3xl tracking-wide">UPCOMING EVENTS</h2>
                        <Link href="/events" className={cardTextBtn}>View All →</Link>
                    </div>

                    {events.length === 0 ? (
                        <div className="py-12 text-center text-muted bg-card rounded-2xl border border-dashed border-border">
                            No upcoming events yet. Check back soon!
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
                            {events.map((event, i) => (
                                <EventCard key={event.id} event={event} priority={i < 5} />
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* ── RECOMMENDED EVENTS (personalised, client-rendered) ── */}
            <RecommendedEvents />

            {/* ── PAST EVENTS ── */}
            {pastEvents.length > 0 && (
                <section className="max-w-7xl mx-auto px-6 lg:px-10 mt-14">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-heading text-2xl lg:text-3xl tracking-wide">PAST EVENTS</h2>
                        <Link href="/events?tab=past" className={cardTextBtn}>View All →</Link>
                    </div>
                    <div className="flex gap-5 overflow-x-auto overflow-y-hidden pb-2" style={{ scrollbarWidth: 'none' }}>
                        {pastEvents.map((event) => (
                            <div key={event.id} className="shrink-0 w-40 sm:w-44">
                                <EventCard event={event} compact />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── ORGANISER RECRUIT ── */}
            <section className="max-w-7xl mx-auto px-6 lg:px-10 mt-20">
                <div className="rounded-3xl relative overflow-hidden" style={{ background: '#1A0E0C' }}>
                    <div className="absolute inset-0" style={{ background: 'radial-gradient(600px 300px at 90% 0%, rgba(230,57,80,0.35), transparent)' }} />
                    <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-10 lg:p-16">
                        <div>
                            <p className="text-accent font-semibold text-sm mb-2 tracking-wide">SELLING TICKETS?</p>
                            <h2 className="font-heading text-4xl lg:text-5xl leading-none text-white mb-4">GROW YOUR EVENTS<br />WITH HEXLURA</h2>
                            <p className="text-white/60 mb-6">
                                Free to start. Connect Stripe, publish your event, and start selling in minutes — no setup fee, no lock-in.
                            </p>
                            <Link
                                href="/business"
                                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-accent text-white font-semibold shadow-glow hover:brightness-110 transition"
                            >
                                FOR BUSINESS →
                            </Link>
                            <Link href="/auth/login" className="block text-sm text-white/50 hover:text-white mt-4 transition">
                                Already have an account? Sign in →
                            </Link>
                        </div>
                        <div className="hidden lg:grid grid-cols-2 gap-3" aria-hidden>
                            <div className="aspect-square rounded-2xl bg-white/5 border border-white/10" />
                            <div className="aspect-square rounded-2xl bg-white/10 border border-white/10 mt-6" />
                            <div className="aspect-square rounded-2xl bg-white/10 border border-white/10 -mt-6" />
                            <div className="aspect-square rounded-2xl bg-white/5 border border-white/10" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── TRUSTED PARTNERS ── */}
            {partners.length > 0 && (
                <section className="max-w-7xl mx-auto px-6 lg:px-10 py-14">
                    <p className="text-center text-xs text-muted mb-6 tracking-widest">TRUSTED BY ORGANISERS ACROSS THE UK</p>
                    <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
                        {partners.map((pt) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                key={pt.name + pt.image_url}
                                src={pt.image_url}
                                alt={pt.name}
                                loading="lazy"
                                className="h-10 w-auto max-w-[140px] object-contain opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition"
                            />
                        ))}
                    </div>
                </section>
            )}
            {partners.length === 0 && <div className="pb-14" />}
        </div>
        </FeeProvider>
    );
}
