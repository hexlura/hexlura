'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'

interface BannerCarouselProps {
    images: string[]
    title: string
}

// Banner column on event detail page:
//   <1200px container>, mobile = full bleed, desktop = 3fr / (3fr+2fr) ≈ 60%.
const BANNER_SIZES = '(min-width: 768px) 60vw, 100vw'

export default function BannerCarousel({ images, title }: BannerCarouselProps) {
    const [current, setCurrent] = useState(0)

    const next = useCallback(() => setCurrent(i => (i + 1) % images.length), [images.length])
    const prev = () => setCurrent(i => (i - 1 + images.length) % images.length)

    useEffect(() => {
        if (images.length <= 1) return
        const id = setInterval(next, 4000)
        return () => clearInterval(id)
    }, [images.length, next])

    if (images.length === 0) {
        return (
            <div className="w-full h-full bg-gradient-to-r from-neutral-800 to-neutral-900 flex items-center justify-center">
                <span className="text-white text-xl">No image provided</span>
            </div>
        )
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            {images.map((src, i) => {
                const isActive = i === current
                return (
                    <div
                        key={src}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            opacity: isActive ? 1 : 0,
                            transition: 'opacity 0.5s ease',
                            pointerEvents: isActive ? 'auto' : 'none',
                        }}
                    >
                        {/* Blurred backdrop — fills the frame so nothing looks empty
                            when the poster doesn't match the container's aspect ratio. */}
                        <Image
                            src={src}
                            alt=""
                            aria-hidden
                            fill
                            // First slide is the LCP candidate — preload it. Others lazy-load.
                            priority={i === 0}
                            sizes={BANNER_SIZES}
                            className="object-cover"
                            style={{
                                filter: 'blur(24px) brightness(0.55) saturate(1.1)',
                                transform: 'scale(1.1)',
                            }}
                        />
                        {/* The poster itself — object-contain so the full image is always visible. */}
                        <Image
                            src={src}
                            alt={images.length > 1 ? `${title} — image ${i + 1}` : title}
                            fill
                            priority={i === 0}
                            sizes={BANNER_SIZES}
                            className="object-contain"
                        />
                    </div>
                )
            })}

            {images.length > 1 && (
                <>
                    {/* Prev / Next arrows */}
                    <button
                        onClick={prev}
                        aria-label="Previous image"
                        style={{
                            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
                            width: '36px', height: '36px', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 2,
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <button
                        onClick={next}
                        aria-label="Next image"
                        style={{
                            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
                            width: '36px', height: '36px', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 2,
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>

                    {/* Dot indicators */}
                    <div style={{
                        position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
                        display: 'flex', gap: '6px', zIndex: 2,
                    }}>
                        {images.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrent(i)}
                                aria-label={`Go to image ${i + 1}`}
                                style={{
                                    width: i === current ? '20px' : '8px',
                                    height: '8px',
                                    borderRadius: '4px',
                                    background: i === current ? '#fff' : 'rgba(255,255,255,0.5)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'width 0.3s ease, background 0.3s ease',
                                }}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
