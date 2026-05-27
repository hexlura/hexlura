'use client'

import { useState, useEffect, useCallback } from 'react'

interface PortfolioItem {
    id: string
    type: 'photo' | 'video'
    url: string
    thumbnail_url: string | null
    caption: string | null
    display_order: number
}

function extractYouTubeId(url: string): string | null {
    const match = url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([^&\s?#]+)/
    )
    return match ? match[1] : null
}

function extractVimeoId(url: string): string | null {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
    return match ? match[1] : null
}

export default function PortfolioSection({ items }: { items: PortfolioItem[] }) {
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
    const [videoItem, setVideoItem] = useState<PortfolioItem | null>(null)

    const photoItems = items.filter(i => i.type === 'photo')

    const closeLightbox = useCallback(() => setLightboxIdx(null), [])
    const closeVideo = useCallback(() => setVideoItem(null), [])

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                closeLightbox()
                closeVideo()
            }
            if (e.key === 'ArrowRight' && lightboxIdx !== null) {
                setLightboxIdx(i => (i !== null && i < photoItems.length - 1 ? i + 1 : i))
            }
            if (e.key === 'ArrowLeft' && lightboxIdx !== null) {
                setLightboxIdx(i => (i !== null && i > 0 ? i - 1 : i))
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [lightboxIdx, photoItems.length, closeLightbox, closeVideo])

    const currentPhoto = lightboxIdx !== null ? photoItems[lightboxIdx] : null

    function getEmbedUrl(item: PortfolioItem): string {
        const ytId = extractYouTubeId(item.url)
        if (ytId) return `https://www.youtube.com/embed/${ytId}?autoplay=1`
        const vimeoId = extractVimeoId(item.url)
        if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`
        return item.url
    }

    let photoIdx = 0

    return (
        <>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
            }}
                className="portfolio-public-grid"
            >
                {items.map(item => {
                    const thisPhotoIdx = item.type === 'photo' ? photoIdx++ : -1

                    return (
                        <div
                            key={item.id}
                            onClick={() => {
                                if (item.type === 'photo') {
                                    setLightboxIdx(thisPhotoIdx)
                                } else {
                                    setVideoItem(item)
                                }
                            }}
                            style={{
                                aspectRatio: '1/1',
                                overflow: 'hidden',
                                position: 'relative',
                                cursor: 'pointer',
                                background: '#F0F0F0',
                            }}
                            className="portfolio-item-hover"
                        >
                            {item.type === 'photo' ? (
                                <img
                                    src={item.url}
                                    alt={item.caption || ''}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        display: 'block',
                                        transition: 'transform 0.3s',
                                    }}
                                    className="portfolio-img"
                                />
                            ) : (
                                <>
                                    {item.thumbnail_url && (
                                        <img
                                            src={item.thumbnail_url}
                                            alt={item.caption || ''}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                display: 'block',
                                            }}
                                        />
                                    )}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'rgba(0,0,0,0.3)',
                                            transition: 'background 0.2s',
                                        }}
                                        className="play-overlay"
                                    >
                                        <div style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '50%',
                                            background: 'rgba(0,0,0,0.5)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <span style={{ color: 'white', fontSize: 18, marginLeft: 4 }}>▶</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Photo Lightbox */}
            {currentPhoto && (
                <div
                    onClick={closeLightbox}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.9)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
                        <img
                            src={currentPhoto.url}
                            alt={currentPhoto.caption || ''}
                            style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
                        />
                        {currentPhoto.caption && (
                            <p style={{ color: 'white', fontSize: 14, textAlign: 'center', marginTop: 12 }}>
                                {currentPhoto.caption}
                            </p>
                        )}
                    </div>

                    {/* Close */}
                    <button
                        onClick={closeLightbox}
                        style={{
                            position: 'fixed',
                            top: 20,
                            right: 20,
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            fontSize: 32,
                            cursor: 'pointer',
                            lineHeight: 1,
                            zIndex: 101,
                        }}
                    >×</button>

                    {/* Previous */}
                    {lightboxIdx !== null && lightboxIdx > 0 && (
                        <button
                            onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i !== null ? i - 1 : i)) }}
                            style={{
                                position: 'fixed',
                                left: 20,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(255,255,255,0.15)',
                                border: 'none',
                                color: 'white',
                                fontSize: 28,
                                cursor: 'pointer',
                                padding: '12px 16px',
                                zIndex: 101,
                            }}
                        >‹</button>
                    )}

                    {/* Next */}
                    {lightboxIdx !== null && lightboxIdx < photoItems.length - 1 && (
                        <button
                            onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i !== null ? i + 1 : i)) }}
                            style={{
                                position: 'fixed',
                                right: 20,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(255,255,255,0.15)',
                                border: 'none',
                                color: 'white',
                                fontSize: 28,
                                cursor: 'pointer',
                                padding: '12px 16px',
                                zIndex: 101,
                            }}
                        >›</button>
                    )}
                </div>
            )}

            {/* Video Modal */}
            {videoItem && (
                <div
                    onClick={closeVideo}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.9)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <div onClick={e => e.stopPropagation()} style={{ width: '80vw', aspectRatio: '16/9' }}>
                        <iframe
                            src={getEmbedUrl(videoItem)}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            allow="autoplay; fullscreen"
                            allowFullScreen
                        />
                    </div>
                    <button
                        onClick={closeVideo}
                        style={{
                            position: 'fixed',
                            top: 20,
                            right: 20,
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            fontSize: 32,
                            cursor: 'pointer',
                            lineHeight: 1,
                            zIndex: 101,
                        }}
                    >×</button>
                </div>
            )}

            <style>{`
                @media (max-width: 640px) {
                    .portfolio-public-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                }
                .portfolio-item-hover:hover .portfolio-img {
                    transform: scale(1.05);
                }
                .portfolio-item-hover:hover .play-overlay {
                    background: rgba(0,0,0,0.6) !important;
                }
            `}</style>
        </>
    )
}
