'use client'

import { useState, useEffect, useCallback } from 'react'

interface BannerCarouselProps {
    images: string[]
    title: string
}

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

    if (images.length === 1) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={images[0]} alt={title} className="w-full h-full object-cover object-top" />
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            {images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    key={src}
                    src={src}
                    alt={`${title} — image ${i + 1}`}
                    className="w-full h-full object-cover object-top"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: i === current ? 1 : 0,
                        transition: 'opacity 0.5s ease',
                        pointerEvents: i === current ? 'auto' : 'none',
                    }}
                />
            ))}

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
        </div>
    )
}
