'use client'

import { useRef, useState } from 'react'
import styles from './selling.module.css'
import { Reveal } from './Reveal'
import VideoModal from './VideoModal'

const videos = [
    { id: 'T4_Uh1xeme8', title: "Start Here: Complete Organiser Setup" },
    { id: 'PH9RkfTXUTk', title: 'Create Your Hexlura Organiser Account' },
    { id: '2HsNKRz19Sw', title: 'Customise Your Profile and Settings' },
    { id: 'tBXPGP0BEB0', title: 'Create and List Your Event' },
    { id: 'nGqezziT3vM', title: 'Set Up Ticket Types and Pricing' },
    { id: 'eUAaDOy7Yp4', title: 'Preview Your Event Listing' },
    { id: 'loWEP4n-v_U', title: 'Edit a Published Event' },
    { id: 'Fz1oioUjynE', title: 'Duplicate, Edit or Delete an Event' },
]

function VideoCard({
    video,
    onOpen,
}: {
    video: { id: string; title: string }
    onOpen: (id: string) => void
}) {
    const [hovered, setHovered] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleEnter = () => {
        setHovered(true)
        timeoutRef.current = setTimeout(() => setShowPreview(true), 300)
    }
    const handleLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setHovered(false)
        setShowPreview(false)
    }

    return (
        <div
            className={`${styles.vidCard} relative flex-shrink-0 w-72 h-40 rounded-xl overflow-hidden cursor-pointer bg-gray-900 border border-white/10`}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            onClick={() => onOpen(video.id)}
            role="button"
            tabIndex={0}
            aria-label={`Play tutorial: ${video.title}`}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onOpen(video.id)
            }}
        >
            <img
                src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                alt={video.title}
                className="absolute inset-0 w-full h-full object-cover opacity-80 transition-opacity duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 text-white">
                <p className="text-xs font-bold leading-tight drop-shadow-md truncate" title={video.title}>
                    {video.title}
                </p>
            </div>
            <div className={`${styles.vidPlayOverlay} absolute inset-0 flex items-center justify-center`}>
                <div className="w-12 h-12 bg-hexred/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(234,40,69,0.6)]">
                    <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </div>
            </div>
            <div
                className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500"
                style={{ opacity: showPreview ? 1 : 0 }}
            >
                {showPreview && hovered && (
                    <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&showinfo=0`}
                        title={video.title}
                        allow="autoplay; encrypted-media"
                        className="w-full h-full object-cover scale-[1.3]"
                    />
                )}
            </div>
        </div>
    )
}

export default function TutorialCarousel() {
    const [openId, setOpenId] = useState<string | null>(null)
    const [paused, setPaused] = useState(false)
    const doubled = [...videos, ...videos]

    return (
        <div className="mt-32 relative">
            <Reveal className="text-center mb-10">
                <>
                    <h3 className="text-3xl font-black tracking-tight mb-2">WATCH &amp; LEARN</h3>
                    <p className="text-gray-500">Hover to preview, click to play full tutorial in our setup series.</p>
                </>
            </Reveal>

            <Reveal>
                <div className="relative w-full overflow-hidden bg-hexdark rounded-3xl py-12 px-0 shadow-inner group">
                    <div className={`${styles.meshBg} opacity-30`}>
                        <div className={`${styles.blob} ${styles.blobDrift} w-[40rem] h-[20rem] bg-hexred/40 top-0 left-0`} />
                        <div className={`${styles.blob} ${styles.blobDriftSlow} w-[30rem] h-[20rem] bg-hexviolet/40 bottom-0 right-1/4`} />
                    </div>

                    <div
                        className={`${styles.videoMarqueeTrack} ${paused ? styles.paused : ''} flex gap-6 px-6`}
                        onMouseEnter={() => setPaused(true)}
                        onMouseLeave={() => setPaused(false)}
                    >
                        {doubled.map((video, i) => (
                            <VideoCard key={`${video.id}-${i}`} video={video} onOpen={setOpenId} />
                        ))}
                    </div>
                </div>
            </Reveal>

            <VideoModal videoId={openId} onClose={() => setOpenId(null)} />
        </div>
    )
}
