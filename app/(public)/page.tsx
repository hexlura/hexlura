import React from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { createClient } from '@/lib/supabase/server';
import { Event } from '@/types';

const CITIES = [
    { name: 'London',     photo: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=80' },
    { name: 'Manchester', photo: 'https://images.unsplash.com/photo-1520763185298-1b434c919102?w=400&q=80' },
    { name: 'Birmingham', photo: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=400&q=80' },
    { name: 'Edinburgh',  photo: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400&q=80' },
    { name: 'Liverpool',  photo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
    { name: 'Bristol',    photo: 'https://images.unsplash.com/photo-1586348943529-beaae6c28db9?w=400&q=80' },
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
    return `From £${(min / 100).toFixed(2)}`;
}

// Scroll row: display flex, overflow-x auto, hide scrollbar
const scrollRow: React.CSSProperties = {
    display: 'flex',
    overflowX: 'auto',
    gap: '16px',
    paddingBottom: '8px',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
};

// Section header wrapper — constrained to readable width
const sectionHeader: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 24px',
    marginBottom: '16px',
};

export default async function HomePage() {
    const supabase = createClient();

    const { data: eventsRaw } = await supabase
        .from('events')
        .select('*, ticket_types(*)')
        .eq('status', 'published')
        .order('start_at', { ascending: true });

    const events = (eventsRaw || []) as Event[];

    // Group events by category
    const categoryMap = new Map<string, Event[]>();
    for (const event of events) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cat = (event as any).category || 'Other';
        if (!categoryMap.has(cat)) categoryMap.set(cat, []);
        categoryMap.get(cat)!.push(event);
    }
    const categories = Array.from(categoryMap.entries());

    // City card: exactly 5 visible, fluid, portrait
    // 6 cities so 5 gaps of 16px = 80px; page padding = 48px
    const cityCardStyle: React.CSSProperties = {
        width: 'calc((100vw - 48px - 80px) / 5)',
        minWidth: '140px',
        height: 'calc((100vw - 48px - 80px) / 5 * 1.4)',
        minHeight: '196px',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        cursor: 'pointer',
        display: 'block',
        textDecoration: 'none',
        borderRadius: 0,
    };

    // Event card: exactly 5 visible, fluid, portrait 3:4
    // 4 gaps of 16px = 64px; page padding = 48px
    const eventCardStyle: React.CSSProperties = {
        width: 'calc((100vw - 48px - 64px) / 5)',
        minWidth: '140px',
        flexShrink: 0,
        background: '#FFFFFF',
        border: 'none',
        cursor: 'pointer',
        textDecoration: 'none',
        display: 'block',
        transition: 'transform 0.2s',
        overflow: 'hidden',
    };

    return (
        <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>

            {/* CITY CARDS SECTION */}
            <section style={{ marginTop: '48px' }}>
                <div style={sectionHeader}>
                    <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '26px', color: '#0A0A0F', letterSpacing: '1px' }}>
                        EXPLORE BY CITY
                    </h2>
                </div>
                {/* Scroll row — full width with page padding */}
                <div className="city-scroll" style={{ ...scrollRow, padding: '0 24px 8px' }}>
                    {CITIES.map(({ name, photo }) => (
                        <Link
                            key={name}
                            href={`/events?city=${encodeURIComponent(name)}`}
                            className="city-card"
                            style={cityCardStyle}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={photo}
                                alt={name}
                                className="city-card-img"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    objectPosition: 'center',
                                    transition: 'transform 0.4s ease',
                                    display: 'block',
                                }}
                            />
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: '45%',
                                background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                            }} />
                            <span style={{
                                position: 'absolute',
                                bottom: '12px',
                                left: '12px',
                                fontSize: '22px',
                                fontFamily: '"Bebas Neue", sans-serif',
                                color: '#FFFFFF',
                                letterSpacing: '1px',
                                lineHeight: 1,
                            }}>
                                {name}
                            </span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* CATEGORY ROWS */}
            <div style={{ paddingBottom: '48px' }}>
                {categories.length === 0 ? (
                    <div style={{ padding: '60px 24px', textAlign: 'center', color: '#666677' }}>
                        <p>No events yet. Check back soon!</p>
                    </div>
                ) : (
                    categories.map(([category, catEvents], index) => (
                        <section key={category} style={{ marginTop: index === 0 ? '48px' : '40px' }}>
                            {/* Section header */}
                            <div style={sectionHeader}>
                                <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '26px', color: '#0A0A0F', letterSpacing: '1px' }}>
                                    {category.toUpperCase()}
                                </h2>
                                <Link
                                    href={`/events?category=${encodeURIComponent(category)}`}
                                    style={{ fontSize: '13px', color: '#E63950', fontWeight: 600, textDecoration: 'none' }}
                                >
                                    See All
                                </Link>
                            </div>

                            {/* Horizontal scroll row — full width */}
                            <div
                                className="drag-scroll"
                                style={{ ...scrollRow, padding: '0 24px 8px', cursor: 'grab' }}
                            >
                                {catEvents.map((event) => {
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
                                            style={eventCardStyle}
                                        >
                                            {/* Portrait image — 3:4 aspect ratio with date overlay */}
                                            {ev.banner_url?.startsWith('http') ? (
                                                <div style={{ width: '100%', aspectRatio: '3/4', overflow: 'hidden', position: 'relative' }}>
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={ev.banner_url}
                                                        alt={ev.title}
                                                        className="portrait-img"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', display: 'block' }}
                                                    />
                                                    {/* Date overlay — BookMyShow style */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: 0,
                                                        left: 0,
                                                        right: 0,
                                                        background: 'linear-gradient(transparent, rgba(0,0,0,0.78))',
                                                        padding: '28px 10px 10px',
                                                    }}>
                                                        <span style={{ fontSize: '13px', color: '#FFFFFF', fontWeight: 700, letterSpacing: '0.2px' }}>
                                                            {overlayDate}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    width: '100%',
                                                    aspectRatio: '3/4',
                                                    background: '#F0F0F0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                    <span style={{ color: '#C0C0C8', fontSize: '12px' }}>No image</span>
                                                </div>
                                            )}

                                            {/* Card body */}
                                            <div style={{ padding: '8px 6px 12px' }}>
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
                                                        marginBottom: '4px',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 1,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                    } as React.CSSProperties}>
                                                        {location}
                                                    </p>
                                                ) : null}
                                                <p style={{ fontSize: '13px', color: '#0A0A0F', fontWeight: 600, marginTop: '2px' }}>
                                                    {priceStr}
                                                </p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                    ))
                )}
            </div>

            {/* Client-side interactions */}
            <Script id="homepage-interactions" strategy="afterInteractive">{`
                // Hide webkit scrollbars
                document.querySelectorAll('.drag-scroll, .city-scroll').forEach(function(el) {
                    el.style.msOverflowStyle = 'none';
                });

                // City card hover
                document.querySelectorAll('.city-card').forEach(function(card) {
                    var img = card.querySelector('.city-card-img');
                    card.addEventListener('mouseenter', function() { if (img) img.style.transform = 'scale(1.08)'; });
                    card.addEventListener('mouseleave', function() { if (img) img.style.transform = 'scale(1)'; });
                });

                // Event card hover
                document.querySelectorAll('.event-portrait-card').forEach(function(card) {
                    var img = card.querySelector('.portrait-img');
                    card.addEventListener('mouseenter', function() {
                        card.style.transform = 'translateY(-4px)';
                        if (img) img.style.transform = 'scale(1.05)';
                    });
                    card.addEventListener('mouseleave', function() {
                        card.style.transform = 'translateY(0)';
                        if (img) img.style.transform = 'scale(1)';
                    });
                });

                // Drag-to-scroll
                document.querySelectorAll('.drag-scroll').forEach(function(el) {
                    var isDown = false;
                    var startX = 0;
                    var scrollLeft = 0;
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
                        var x = e.pageX - el.offsetLeft;
                        el.scrollLeft = scrollLeft - (x - startX);
                    });
                });
            `}</Script>
        </div>
    );
}
