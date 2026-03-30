import React from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { createClient } from '@/lib/supabase/server';
import { Event } from '@/types';

const CITIES = [
    { name: 'London',     photo: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=600&fit=crop&q=80' },
    { name: 'Manchester', photo: 'https://images.unsplash.com/photo-1520763185298-1b434c919102?w=400&h=600&fit=crop&q=80' },
    { name: 'Birmingham', photo: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=400&h=600&fit=crop&q=80' },
    { name: 'Edinburgh',  photo: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400&h=600&fit=crop&q=80' },
    { name: 'Liverpool',  photo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=600&fit=crop&q=80' },
    { name: 'Bristol',    photo: 'https://images.unsplash.com/photo-1586348943529-beaae6c28db9?w=400&h=600&fit=crop&q=80' },
];

function formatOverlayDate(isoDate: string): string {
    const d = new Date(isoDate);
    const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'Europe/London' }).format(d);
    const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'Europe/London' }).format(d);
    const month = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'Europe/London' }).format(d);
    return `${weekday}, ${day} ${month}`;
}

function getMinPrice(ticketTypes: Array<{ price_pence: number }>): string {
    if (!ticketTypes || ticketTypes.length === 0) return 'Free';
    const min = Math.min(...ticketTypes.map((t) => t.price_pence));
    if (min === 0) return 'Free';
    return `From \u00A3${(min / 100).toFixed(2)}`;
}

export default async function HomePage() {
    const supabase = createClient();

    const now = new Date().toISOString();

    const { data: eventsRaw } = await supabase
        .from('events')
        .select('*, ticket_types(*)')
        .eq('status', 'published')
        .gt('start_at', now)
        .order('start_at', { ascending: true })
        .limit(10);

    const events = (eventsRaw || []) as Event[];

    return (
        <div style={{ background: '#FFFFFF', minHeight: '100vh' }} className="page-wrapper">

            {/* Responsive styles — server-rendered to avoid FOUC */}
            <style>{`
                .page-wrapper { padding: 0 48px; }
                @media (max-width: 768px) { .page-wrapper { padding: 0 20px; } }
                .headline-xl { font-size: 100px; line-height: 0.85; font-family: "Bebas Neue", sans-serif; margin: 0; }
                @media (max-width: 768px) { .headline-xl { font-size: 60px; } }
                .full-bleed { margin-left: -48px; margin-right: -48px; }
                @media (max-width: 768px) { .full-bleed { margin-left: -20px; margin-right: -20px; } }
                .city-scroll::-webkit-scrollbar { display: none; }
                .drag-scroll::-webkit-scrollbar { display: none; }
            `}</style>

            {/* ── SECTION 1: BOLD HEADLINE ── */}
            <section style={{ paddingTop: '48px', paddingBottom: '40px', background: '#FFFFFF' }}>
                <p style={{ fontSize: '11px', color: '#E63950', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 12px 0' }}>
                    UK&apos;S PREMIER EVENT PLATFORM
                </p>
                <div style={{ borderLeft: '4px solid #E63950', paddingLeft: '24px' }}>
                    <h1 className="headline-xl" style={{ color: '#0A0A0F' }}>
                        DISCOVER
                    </h1>
                    <h1 className="headline-xl" style={{ color: '#0A0A0F' }}>
                        LIVE EVENTS
                    </h1>
                    <h1 className="headline-xl" style={{ color: '#E63950' }}>
                        NEAR YOU
                    </h1>
                </div>
                <p style={{ fontSize: '16px', color: '#666677', marginTop: '20px', maxWidth: '480px', lineHeight: 1.5 }}>
                    Book tickets to concerts, club nights, festivals, comedy and more across the UK.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '32px' }}>
                    <Link
                        href="/events"
                        style={{
                            background: '#0A0A0F',
                            color: '#FFFFFF',
                            padding: '14px 32px',
                            fontSize: '15px',
                            fontWeight: 700,
                            borderRadius: 0,
                            border: 'none',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            letterSpacing: '0.3px',
                        }}
                    >
                        Find Events
                    </Link>
                    <Link
                        href="/sell-tickets"
                        style={{
                            background: 'transparent',
                            color: '#0A0A0F',
                            padding: '14px 32px',
                            fontSize: '15px',
                            fontWeight: 700,
                            borderRadius: 0,
                            border: '2px solid #0A0A0F',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            letterSpacing: '0.3px',
                        }}
                    >
                        Sell Tickets
                    </Link>
                </div>
            </section>

            {/* ── CITY CARDS ── */}
            <section style={{ marginTop: '0' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    borderBottom: '2px solid #F0F0F0',
                    paddingBottom: '12px',
                }}>
                    <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '26px', color: '#0A0A0F', letterSpacing: '1px', margin: 0 }}>
                        EXPLORE BY CITY
                    </h2>
                </div>
                <div
                    className="city-scroll"
                    style={{
                        display: 'flex',
                        overflowX: 'auto',
                        gap: '12px',
                        padding: '0 0 8px',
                        scrollbarWidth: 'none',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    {CITIES.map(({ name, photo }) => (
                        <Link
                            key={name}
                            href={`/events?city=${encodeURIComponent(name)}`}
                            className="city-card"
                            style={{
                                flex: '0 0 calc((100% - 48px) / 5)',
                                minWidth: '130px',
                                maxWidth: '260px',
                                aspectRatio: '2 / 3',
                                position: 'relative',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                display: 'block',
                                textDecoration: 'none',
                                borderRadius: '4px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                border: '1px solid rgba(0,0,0,0.06)',
                                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={photo}
                                alt={name}
                                className="city-card-img"
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    objectPosition: 'center',
                                    transition: 'transform 0.4s ease',
                                }}
                            />
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.82) 100%)',
                                pointerEvents: 'none',
                            }} />
                            {/* Red top border — shown on hover via JS */}
                            <div
                                className="city-card-border"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '3px',
                                    background: '#E63950',
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                    pointerEvents: 'none',
                                }}
                            />
                            <span style={{
                                position: 'absolute',
                                bottom: '14px',
                                left: '12px',
                                right: '12px',
                                fontSize: '22px',
                                fontFamily: '"Bebas Neue", sans-serif',
                                color: '#FFFFFF',
                                letterSpacing: '1px',
                                lineHeight: 1,
                                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                            }}>
                                {name}
                            </span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* ── UPCOMING EVENTS ── */}
            <section style={{ marginTop: '48px', paddingBottom: '48px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    borderBottom: '2px solid #F0F0F0',
                    paddingBottom: '12px',
                }}>
                    <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '26px', color: '#0A0A0F', letterSpacing: '1px', margin: 0 }}>
                        UPCOMING EVENTS
                    </h2>
                    <Link
                        href="/events"
                        style={{ fontSize: '13px', color: '#E63950', fontWeight: 600, textDecoration: 'none' }}
                    >
                        See All &rarr;
                    </Link>
                </div>

                {events.length === 0 ? (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: '#8888AA' }}>
                        No upcoming events yet. Check back soon!
                    </div>
                ) : (
                    <div
                        className="drag-scroll"
                        style={{
                            display: 'flex',
                            overflowX: 'auto',
                            gap: '16px',
                            padding: '0 0 8px',
                            scrollbarWidth: 'none',
                            WebkitOverflowScrolling: 'touch',
                            cursor: 'grab',
                        }}
                    >
                        {events.map((event) => {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const ev = event as any;
                            const ticketTypes: Array<{ price_pence: number }> = ev.ticket_types || [];
                            const priceStr = getMinPrice(ticketTypes);
                            const location = ev.venue_city || ev.venue_name || '';
                            const overlayDate = formatOverlayDate(ev.start_at);

                            return (
                                <Link
                                    key={ev.id}
                                    href={`/events/${ev.slug}`}
                                    className="event-portrait-card"
                                    style={{
                                        flex: '0 0 calc((100% - 64px) / 5)',
                                        minWidth: '150px',
                                        maxWidth: '200px',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        textDecoration: 'none',
                                        display: 'block',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        borderRadius: '4px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                    }}
                                >
                                    {ev.banner_url?.startsWith('http') ? (
                                        <div style={{ width: '100%', aspectRatio: '2 / 3', position: 'relative', overflow: 'hidden', borderRadius: '4px 4px 0 0' }}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={ev.banner_url}
                                                alt={ev.title}
                                                className="portrait-img"
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    transition: 'transform 0.3s',
                                                }}
                                            />
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                                                padding: '24px 10px 8px',
                                            }}>
                                                <span style={{ fontSize: '13px', color: '#FFFFFF', fontWeight: 700 }}>
                                                    {overlayDate}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{
                                            width: '100%',
                                            aspectRatio: '2 / 3',
                                            background: '#F0F0F0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '4px 4px 0 0',
                                        }}>
                                            <span style={{ color: '#C0C0C8', fontSize: '12px' }}>No image</span>
                                        </div>
                                    )}

                                    <div style={{ padding: '10px 4px 8px', background: 'transparent' }}>
                                        <p style={{
                                            fontSize: '14px',
                                            color: '#0A0A0F',
                                            fontWeight: 700,
                                            lineHeight: 1.3,
                                            marginBottom: '4px',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        } as React.CSSProperties}>
                                            {ev.title}
                                        </p>
                                        {location ? (
                                            <p style={{
                                                fontSize: '12px',
                                                color: '#666677',
                                                marginBottom: '2px',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 1,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            } as React.CSSProperties}>
                                                {location}
                                            </p>
                                        ) : null}
                                        <p style={{ fontSize: '13px', color: '#0A0A0F', fontWeight: 600 }}>
                                            {priceStr}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ── SECTION 3: ORGANISER CTA — full bleed ── */}
            <section
                className="full-bleed"
                style={{
                    background: '#0A0A0F',
                    padding: '80px 24px',
                    textAlign: 'center',
                    marginTop: '60px',
                }}
            >
                <p style={{ fontSize: '11px', color: '#E63950', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
                    FOR ORGANISERS
                </p>
                <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(48px, 5vw, 72px)', color: '#FFFFFF', margin: '0 0 8px 0', lineHeight: 0.95 }}>
                    SELLING TICKETS?
                </h2>
                <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '36px', color: '#8888AA', margin: '0 0 24px 0', fontWeight: 400 }}>
                    JOIN HUNDREDS OF UK ORGANISERS
                </h3>
                <p style={{ fontSize: '16px', color: '#8888AA', marginBottom: '40px', lineHeight: 1.5 }}>
                    Free to start. No monthly fees. You keep 100% of ticket face value.
                </p>
                <Link
                    href="/sell-tickets"
                    style={{
                        display: 'inline-block',
                        background: '#E63950',
                        color: '#FFFFFF',
                        padding: '16px 48px',
                        fontSize: '16px',
                        fontWeight: 700,
                        borderRadius: 0,
                        border: 'none',
                        textDecoration: 'none',
                        letterSpacing: '0.3px',
                    }}
                >
                    Start Selling Free &rarr;
                </Link>
                <Link
                    href="/auth/login"
                    style={{
                        display: 'block',
                        fontSize: '13px',
                        color: '#8888AA',
                        marginTop: '16px',
                        textDecoration: 'none',
                    }}
                >
                    Already have an account? Sign in &rarr;
                </Link>
            </section>

            {/* Client-side interactions */}
            <Script id="homepage-interactions" strategy="afterInteractive">{`
                document.querySelectorAll('.drag-scroll, .city-scroll').forEach(function(el) {
                    el.style.msOverflowStyle = 'none';
                });

                // City card hover — lift + shadow + image scale + red top border
                document.querySelectorAll('.city-card').forEach(function(card) {
                    var img = card.querySelector('.city-card-img');
                    var border = card.querySelector('.city-card-border');
                    card.addEventListener('mouseenter', function() {
                        card.style.transform = 'translateY(-6px)';
                        card.style.boxShadow = '0 12px 32px rgba(0,0,0,0.20)';
                        if (img) img.style.transform = 'scale(1.07)';
                        if (border) border.style.opacity = '1';
                    });
                    card.addEventListener('mouseleave', function() {
                        card.style.transform = '';
                        card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                        if (img) img.style.transform = 'scale(1)';
                        if (border) border.style.opacity = '0';
                    });
                });

                // Event card hover — lift + shadow (no border change)
                document.querySelectorAll('.event-portrait-card').forEach(function(card) {
                    var img = card.querySelector('.portrait-img');
                    card.addEventListener('mouseenter', function() {
                        card.style.transform = 'translateY(-4px)';
                        card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                        if (img) img.style.transform = 'scale(1.04)';
                    });
                    card.addEventListener('mouseleave', function() {
                        card.style.transform = 'translateY(0)';
                        card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                        if (img) img.style.transform = 'scale(1)';
                    });
                });

                // Drag-to-scroll
                document.querySelectorAll('.drag-scroll').forEach(function(el) {
                    var isDown = false, startX = 0, scrollLeft = 0;
                    el.addEventListener('mousedown', function(e) {
                        isDown = true;
                        el.style.cursor = 'grabbing';
                        startX = e.pageX - el.offsetLeft;
                        scrollLeft = el.scrollLeft;
                        e.preventDefault();
                    });
                    el.addEventListener('mouseleave', function() { isDown = false; el.style.cursor = 'grab'; });
                    el.addEventListener('mouseup', function() { isDown = false; el.style.cursor = 'grab'; });
                    el.addEventListener('mousemove', function(e) {
                        if (!isDown) return;
                        e.preventDefault();
                        el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX);
                    });
                });
            `}</Script>
        </div>
    );
}
