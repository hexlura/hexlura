'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

export type FeaturedEvent = {
    id: string
    title: string
    slug: string
    banner_url: string | null
    start_at: string
    venue_name: string | null
    venue_address: string | null
    category: string | null
    min_price_pence: number | null
}

export type SlideData =
    | { type: 'brand' }
    | { type: 'event'; event: FeaturedEvent }
    | { type: 'organiser' }
    | { type: 'fomo' }

function formatSlideDate(iso: string): string {
    const d = new Date(iso)
    const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'Europe/London' }).format(d)
    const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'Europe/London' }).format(d)
    const month = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'Europe/London' }).format(d)
    return `${weekday}, ${day} ${month}`
}

function formatPrice(pence: number | null): string {
    if (pence === null || pence === 0) return 'Free'
    return `From \u00A3${(pence / 100).toFixed(2)}`
}

function BrandSlide() {
    return (
        <div style={{
            width: '100%', height: '100%', position: 'relative',
            background: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 50%, #2D1B69 100%)',
            display: 'flex', alignItems: 'center',
        }}>
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                pointerEvents: 'none',
            }} />
            <div className="slide-content" style={{ position: 'relative', zIndex: 1, maxWidth: '700px' }}>
                <p style={{ fontSize: '11px', color: '#E63950', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 20px 0' }}>
                    THE UK&apos;S HOME FOR LIVE EVENTS
                </p>
                <h1 className="hero-h1-brand" style={{ color: '#FFFFFF' }}>FIND. BOOK.</h1>
                <h1 className="hero-h1-brand" style={{ color: '#E63950' }}>EXPERIENCE.</h1>
                <p className="slide-desc" style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', maxWidth: '480px', marginTop: '20px', lineHeight: 1.6 }}>
                    Concerts, club nights, festivals, comedy and more — discover the best live events happening across the UK, all in one place.
                </p>
                <Link
                    href="/events"
                    className="hero-cta-btn"
                    style={{
                        display: 'inline-block',
                        background: '#E63950', color: '#FFFFFF',
                        padding: '14px 36px', fontSize: '15px', fontWeight: 700,
                        borderRadius: 0, textDecoration: 'none', marginTop: '28px',
                    }}
                >
                    Explore Events &rarr;
                </Link>
            </div>
        </div>
    )
}

function EventSlide({ event }: { event: FeaturedEvent }) {
    const priceStr = formatPrice(event.min_price_pence)
    const dateStr = formatSlideDate(event.start_at)
    const hasBanner = Boolean(event.banner_url?.startsWith('http'))

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            {/* Blurred bg */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                {hasBanner ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={event.banner_url!}
                        alt=""
                        style={{
                            width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center',
                            filter: 'blur(20px) brightness(0.4) saturate(1.2)',
                            transform: 'scale(1.1)',
                        }}
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', background: '#1A1A2E' }} />
                )}
            </div>
            {/* Dark overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1 }} />
            {/* Content */}
            <div className="hero-content" style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', padding: '0 48px', gap: '40px' }}>
                {/* Portrait image */}
                <div className="hero-portrait" style={{
                    width: '200px', aspectRatio: '2 / 3', flexShrink: 0,
                    overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                }}>
                    {hasBanner ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={event.banner_url!} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', background: '#2D2D4E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#8888AA', fontSize: '14px' }}>No image</span>
                        </div>
                    )}
                </div>
                {/* Details */}
                <div className="slide-text" style={{ flex: 1, minWidth: 0 }}>
                    {event.category && (
                        <span style={{
                            display: 'inline-block', background: '#E63950', color: '#FFFFFF',
                            fontSize: '11px', fontWeight: 700, padding: '4px 12px',
                            letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px',
                        }}>
                            {event.category}
                        </span>
                    )}
                    <h2 className="hero-event-title" style={{
                        fontFamily: '"Bebas Neue", "Arial Black", sans-serif',
                        color: '#FFFFFF', lineHeight: 1, margin: '0 0 12px 0',
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    } as React.CSSProperties}>
                        {event.title}
                    </h2>
                    <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.75)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>&#128197;</span> {dateStr}{event.venue_name ? ` · ${event.venue_name}` : ''}
                    </p>
                    {event.venue_address && (
                        <p className="slide-desc" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>
                            &#128205; {event.venue_address}
                        </p>
                    )}
                    {!event.venue_address && <div style={{ marginBottom: '24px' }} />}
                    <p style={{ fontSize: '20px', color: '#FFFFFF', fontWeight: 700, marginBottom: '24px' }}>
                        {priceStr}
                    </p>
                    <Link
                        href={`/events/${event.slug}`}
                        className="hero-cta-btn"
                        style={{
                            display: 'inline-block',
                            background: '#E63950', color: '#FFFFFF',
                            padding: '14px 36px', fontSize: '15px', fontWeight: 700,
                            borderRadius: 0, textDecoration: 'none',
                        }}
                    >
                        Book Tickets &rarr;
                    </Link>
                </div>
            </div>
        </div>
    )
}

function OrganiserSlide() {
    return (
        <div style={{
            width: '100%', height: '100%', position: 'relative',
            background: 'linear-gradient(135deg, #0A0A0F 0%, #1C1C2E 40%, #16213E 100%)',
            display: 'flex', alignItems: 'center',
        }}>
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 40px)',
                pointerEvents: 'none',
            }} />
            <div className="slide-content" style={{ position: 'relative', zIndex: 1, maxWidth: '700px' }}>
                <p style={{ fontSize: '11px', color: '#E63950', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 16px 0' }}>
                    FOR EVENT ORGANISERS
                </p>
                <h1 className="hero-h1" style={{ color: '#FFFFFF' }}>SELL TICKETS.</h1>
                <h1 className="hero-h1" style={{ color: '#E63950' }}>KEEP 100%.</h1>
                <p className="slide-desc" style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', maxWidth: '440px', marginTop: '16px', lineHeight: 1.6 }}>
                    No monthly fees. No contracts. You keep every penny of face value. Instant setup, fast payouts.
                </p>
                <div className="slide-stats" style={{ display: 'flex', gap: '32px', marginTop: '24px', flexWrap: 'wrap' }}>
                    {[
                        { num: '\u00A30', label: 'Monthly Fees' },
                        { num: '100%', label: 'Revenue Yours' },
                        { num: '2 Days', label: 'Fast Payouts' },
                    ].map(({ num, label }) => (
                        <div key={label}>
                            <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '36px', color: '#E63950', lineHeight: 1 }}>{num}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>{label}</div>
                        </div>
                    ))}
                </div>
                <Link
                    href="/sell-tickets"
                    className="hero-org-btn"
                    style={{
                        display: 'inline-block',
                        background: '#FFFFFF', color: '#0A0A0F',
                        padding: '14px 36px', fontSize: '15px', fontWeight: 700,
                        borderRadius: 0, textDecoration: 'none', marginTop: '32px',
                    }}
                >
                    Start Selling Free &rarr;
                </Link>
            </div>
        </div>
    )
}

function FomoSlide() {
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            {/* BG image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1400&q=80"
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            />
            {/* Gradient overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 100%)' }} />
            {/* Content */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                <div className="slide-content" style={{ maxWidth: '600px' }}>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px', margin: '0 0 16px 0' }}>
                        LIVE EVENTS UK
                    </p>
                    <h1 className="hero-h1-fomo" style={{ color: '#FFFFFF' }}>DON&apos;T</h1>
                    <h1 className="hero-h1-fomo" style={{ color: '#E63950' }}>MISS OUT</h1>
                    <p className="slide-desc" style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', maxWidth: '420px', marginTop: '16px', lineHeight: 1.6 }}>
                        Thousands of live events happening across the UK. Your next unforgettable night starts here.
                    </p>
                    <Link
                        href="/events"
                        className="hero-cta-btn"
                        style={{
                            display: 'inline-block',
                            background: '#E63950', color: '#FFFFFF',
                            padding: '14px 36px', fontSize: '15px', fontWeight: 700,
                            borderRadius: 0, textDecoration: 'none', marginTop: '32px',
                        }}
                    >
                        Find Events Near You &rarr;
                    </Link>
                </div>
            </div>
        </div>
    )
}

function renderSlide(slide: SlideData) {
    switch (slide.type) {
        case 'brand': return <BrandSlide />
        case 'event': return <EventSlide event={slide.event} />
        case 'organiser': return <OrganiserSlide />
        case 'fomo': return <FomoSlide />
    }
}

export function HeroSlider({ slides }: { slides: SlideData[] }) {
    const [current, setCurrent] = useState(0)
    const [visible, setVisible] = useState(true)
    const isPausedRef = useRef(false)
    const currentRef = useRef(0)
    const touchStartXRef = useRef(0)

    currentRef.current = current

    const goto = useCallback((i: number) => {
        setVisible(false)
        setTimeout(() => {
            setCurrent(i)
            setVisible(true)
        }, 300)
    }, [])

    useEffect(() => {
        const id = setInterval(() => {
            if (!isPausedRef.current) {
                goto((currentRef.current + 1) % slides.length)
            }
        }, 5000)
        return () => clearInterval(id)
    }, [slides.length, goto])

    if (slides.length === 0) return null

    const slide = slides[current]

    return (
        <div
            className="hero-slider"
            style={{ width: '100%', height: '520px', position: 'relative', overflow: 'hidden', background: '#0A0A0F', borderRadius: '16px' }}
            onMouseEnter={() => { isPausedRef.current = true }}
            onMouseLeave={() => { isPausedRef.current = false }}
            onTouchStart={e => { touchStartXRef.current = e.touches[0].clientX }}
            onTouchEnd={e => {
                const diff = touchStartXRef.current - e.changedTouches[0].clientX
                if (Math.abs(diff) > 50) {
                    if (diff > 0) goto((currentRef.current + 1) % slides.length)
                    else goto((currentRef.current - 1 + slides.length) % slides.length)
                }
            }}
        >
            <style>{`
                .hero-slider { touch-action: pan-y; }
                @media (max-width: 768px) { .hero-slider { height: 280px !important; } }

                .hero-h1 {
                    font-family: "Bebas Neue", "Arial Black", sans-serif;
                    font-size: 88px; line-height: 0.85; margin: 0;
                }
                @media (max-width: 768px) { .hero-h1 { font-size: 40px !important; } }

                .hero-h1-brand {
                    font-family: "Bebas Neue", "Arial Black", sans-serif;
                    font-size: 96px; line-height: 0.85; margin: 0;
                }
                @media (max-width: 768px) { .hero-h1-brand { font-size: 42px !important; } }

                .hero-h1-fomo {
                    font-family: "Bebas Neue", "Arial Black", sans-serif;
                    font-size: 96px; line-height: 0.85; margin: 0;
                }
                @media (max-width: 768px) { .hero-h1-fomo { font-size: 42px !important; } }

                .hero-event-title { font-size: 52px; }
                @media (max-width: 768px) { .hero-event-title { font-size: 26px !important; } }

                .hero-portrait { width: 200px !important; }
                @media (max-width: 768px) { .hero-portrait { width: 110px !important; } }

                .hero-content { gap: 40px !important; padding: 0 48px !important; }
                @media (max-width: 768px) { .hero-content { gap: 20px !important; padding: 0 20px !important; } }

                .hero-arrow { display: flex !important; }
                @media (max-width: 768px) { .hero-arrow { display: none !important; } }

                .hero-cta-btn:hover { background: #C0392B !important; }
                .hero-org-btn:hover { background: #E63950 !important; color: #FFFFFF !important; }

                .slide-content {
                    display: flex; flex-direction: column;
                    align-items: flex-start; text-align: left;
                    padding: 0 0 0 60px; width: 100%;
                }
                @media (max-width: 768px) {
                    .slide-content { align-items: center; text-align: center; padding: 0 24px; }
                }
                .slide-text { text-align: left; }
                @media (max-width: 768px) { .slide-text { text-align: center; } }
                @media (max-width: 768px) { .slide-desc { display: none !important; } }
                @media (max-width: 768px) { .slide-stats { display: none !important; } }
            `}</style>

            {/* Slide with fade */}
            <div style={{ width: '100%', height: '100%', opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease' }}>
                {renderSlide(slide)}
            </div>

            {/* Dot indicators */}
            <div style={{
                position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: '8px', zIndex: 10,
            }}>
                {slides.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => goto(i)}
                        style={{
                            width: i === current ? '24px' : '8px',
                            height: '8px',
                            borderRadius: i === current ? '4px' : '50%',
                            background: i === current ? '#E63950' : 'rgba(255,255,255,0.4)',
                            border: 'none', cursor: 'pointer', padding: 0,
                            transition: 'all 0.3s',
                        }}
                    />
                ))}
            </div>

            {/* Left arrow */}
            <button
                className="hero-arrow"
                onClick={() => goto((current - 1 + slides.length) % slides.length)}
                style={{
                    position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                    width: '44px', height: '44px',
                    background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.2)', color: '#FFFFFF',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 10, fontSize: '20px',
                }}
            >
                &#8592;
            </button>

            {/* Right arrow */}
            <button
                className="hero-arrow"
                onClick={() => goto((current + 1) % slides.length)}
                style={{
                    position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                    width: '44px', height: '44px',
                    background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.2)', color: '#FFFFFF',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 10, fontSize: '20px',
                }}
            >
                &#8594;
            </button>
        </div>
    )
}
