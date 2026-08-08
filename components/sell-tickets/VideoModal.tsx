'use client'

import { useEffect, useState } from 'react'
import styles from './selling.module.css'

export default function VideoModal({
    videoId,
    onClose,
}: {
    videoId: string | null
    onClose: () => void
}) {
    const [renderedId, setRenderedId] = useState<string | null>(null)

    useEffect(() => {
        if (videoId) {
            setRenderedId(videoId)
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
            const t = setTimeout(() => setRenderedId(null), 400)
            return () => clearTimeout(t)
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [videoId])

    useEffect(() => {
        if (!videoId) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [videoId, onClose])

    if (!renderedId) return null

    return (
        <div
            className={`${styles.videoModal} ${videoId ? styles.active : ''} fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md`}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Tutorial video player"
        >
            <div className={`${styles.modalContent} relative w-full max-w-5xl mx-4 aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10`}>
                <button
                    onClick={onClose}
                    aria-label="Close video"
                    className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 hover:bg-hexred text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <div className="w-full h-full">
                    {videoId && (
                        <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
                            title="Hexlura tutorial video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
