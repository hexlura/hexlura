'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compress-image'

interface PortfolioItem {
    id: string
    organiser_id: string
    type: 'photo' | 'video'
    url: string
    thumbnail_url: string | null
    caption: string | null
    display_order: number
    is_active: boolean
    created_at: string
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

async function getVimeoThumbnail(url: string): Promise<string | null> {
    try {
        const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`)
        if (!res.ok) return null
        const data = await res.json()
        return data.thumbnail_url || null
    } catch {
        return null
    }
}

// Placeholder tile colours (used when a video has no thumbnail), as in the design
const TILE_GRADIENTS = [
    'from-accent to-warm-orange',
    'from-warm-yellow to-warm-orange',
    'from-warm-orange to-accent',
    'from-warm-green to-warm-amber',
]

const modalInput = 'w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25'

export default function PortfolioPage() {
    const [organiserId, setOrganiserId] = useState<string | null>(null)
    const [items, setItems] = useState<PortfolioItem[]>([])
    const [loading, setLoading] = useState(true)

    // Add media tab
    const [activeTab, setActiveTab] = useState<'photo' | 'video'>('photo')

    // Photo upload
    const [dragOver, setDragOver] = useState(false)
    const [photoFiles, setPhotoFiles] = useState<File[]>([])
    const [photoCaption, setPhotoCaption] = useState('')
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Video
    const [videoUrl, setVideoUrl] = useState('')
    const [videoCaption, setVideoCaption] = useState('')
    const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null)
    const [addingVideo, setAddingVideo] = useState(false)
    const [videoError, setVideoError] = useState('')

    // Errors from loading / reorder / hide / delete
    const [actionError, setActionError] = useState('')

    useEffect(() => {
        async function init() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: org } = await supabase
                .from('organiser_profiles')
                .select('id')
                .eq('user_id', user.id)
                .single()
            if (org) setOrganiserId(org.id)
        }
        init()
    }, [])

    const fetchItems = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/organiser/portfolio')
            if (!res.ok) throw new Error(`portfolio ${res.status}`)
            const data = await res.json()
            setItems(data.items || [])
            setActionError('')
        } catch (e) {
            console.error('[Portfolio] load failed:', e)
            setActionError('Could not load your portfolio. Please refresh and try again.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchItems()
    }, [fetchItems])

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault()
        setDragOver(true)
    }

    function handleDragLeave() {
        setDragOver(false)
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault()
        setDragOver(false)
        const files = Array.from(e.dataTransfer.files).filter(f =>
            ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
        ).slice(0, 5)
        setPhotoFiles(files)
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []).slice(0, 5)
        setPhotoFiles(files)
    }

    async function uploadPhotos() {
        if (!photoFiles.length || !organiserId) return
        setUploading(true)
        setUploadError('')
        const supabase = createClient()

        for (const file of photoFiles) {
            let blob: Blob
            try { blob = await compressImage(file, 1400) } catch { blob = file }
            const timestamp = Date.now()
            const path = `${organiserId}/${timestamp}.webp`
            const { error: storageError } = await supabase.storage
                .from('organiser-portfolio')
                .upload(path, blob, { contentType: 'image/webp' })
            if (storageError) {
                setUploadError('Upload failed: ' + storageError.message)
                continue
            }
            const { data: urlData } = supabase.storage.from('organiser-portfolio').getPublicUrl(path)
            const saveRes = await fetch('/api/organiser/portfolio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'photo',
                    url: urlData.publicUrl,
                    caption: photoCaption || null,
                }),
            })
            if (!saveRes.ok) setUploadError('A photo uploaded but could not be saved to your portfolio.')
        }

        setPhotoFiles([])
        setPhotoCaption('')
        if (fileInputRef.current) fileInputRef.current.value = ''
        await fetchItems()
        setUploading(false)
    }

    async function handleVideoUrlChange(url: string) {
        setVideoUrl(url)
        setVideoThumbnail(null)
        if (!url) return

        const ytId = extractYouTubeId(url)
        if (ytId) {
            setVideoThumbnail(`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`)
            return
        }

        const vimeoId = extractVimeoId(url)
        if (vimeoId) {
            const thumb = await getVimeoThumbnail(url)
            setVideoThumbnail(thumb)
        }
    }

    async function addVideo() {
        if (!videoUrl) return
        const ytId = extractYouTubeId(videoUrl)
        const vimeoId = extractVimeoId(videoUrl)
        if (!ytId && !vimeoId) {
            setVideoError('Please enter a valid YouTube or Vimeo URL')
            return
        }
        setAddingVideo(true)
        setVideoError('')
        const res = await fetch('/api/organiser/portfolio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'video',
                url: videoUrl,
                thumbnail_url: videoThumbnail,
                caption: videoCaption || null,
            }),
        })
        if (res.ok) {
            setVideoUrl('')
            setVideoCaption('')
            setVideoThumbnail(null)
            await fetchItems()
        } else {
            setVideoError('Failed to add video')
        }
        setAddingVideo(false)
    }

    async function moveItem(id: string, direction: 'up' | 'down') {
        const idx = items.findIndex(i => i.id === id)
        if (idx < 0) return
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1
        if (swapIdx < 0 || swapIdx >= items.length) return

        const current = items[idx]
        const swap = items[swapIdx]

        const results = await Promise.all([
            fetch('/api/organiser/portfolio', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: current.id, display_order: swap.display_order }),
            }),
            fetch('/api/organiser/portfolio', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: swap.id, display_order: current.display_order }),
            }),
        ])
        if (results.some(r => !r.ok)) setActionError('Could not reorder that item. Please try again.')
        await fetchItems()
    }

    async function toggleVisibility(item: PortfolioItem) {
        const res = await fetch('/api/organiser/portfolio', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
        })
        if (!res.ok) setActionError('Could not update that item. Please try again.')
        await fetchItems()
    }

    async function deleteItem(id: string) {
        if (!confirm('Delete this portfolio item?')) return
        const res = await fetch('/api/organiser/portfolio', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        })
        if (!res.ok) setActionError('Could not delete that item. Please try again.')
        await fetchItems()
    }

    const tabClass = (active: boolean) =>
        `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-card shadow-soft' : 'text-muted'}`
    const actionBtn = 'w-7 h-7 rounded bg-white/90 text-xs disabled:opacity-40 disabled:cursor-not-allowed'

    return (
        <div className="max-w-7xl">
            <div className="mb-6">
                <h1 className="font-heading text-4xl tracking-wide">PORTFOLIO</h1>
                <p className="text-muted text-sm mt-1">Showcase photos and videos from your events on your public organiser page</p>
            </div>

            {/* Upload panel */}
            <div className="bg-card rounded-2xl shadow-card p-6 mb-8">
                <div className="flex gap-1 bg-background rounded-xl p-1 mb-5 w-fit">
                    <button type="button" onClick={() => setActiveTab('photo')} className={tabClass(activeTab === 'photo')}>📷 Add Photo</button>
                    <button type="button" onClick={() => setActiveTab('video')} className={tabClass(activeTab === 'video')}>🎬 Add Video</button>
                </div>

                {activeTab === 'photo' && (
                    <div>
                        <label
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`block w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
                                dragOver ? 'border-warm-red/50 bg-background' : 'border-border hover:border-warm-red/50'
                            }`}
                        >
                            {photoFiles.length > 0 ? (
                                <>
                                    <p className="text-sm font-semibold">{photoFiles.length} file{photoFiles.length > 1 ? 's' : ''} selected</p>
                                    <p className="text-xs text-muted mt-1">{photoFiles.map(f => f.name).join(', ')}</p>
                                </>
                            ) : (
                                <p className="text-sm text-muted">Drag &amp; drop photos here, or click to browse (multiple allowed)</p>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                        <input
                            type="text"
                            value={photoCaption}
                            onChange={e => setPhotoCaption(e.target.value)}
                            placeholder="Add a caption (optional)"
                            className={`${modalInput} mb-4`}
                        />
                        {uploadError && <p className="text-warm-red text-sm mb-3">{uploadError}</p>}
                        <button
                            type="button"
                            onClick={uploadPhotos}
                            disabled={uploading || photoFiles.length === 0}
                            className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? 'Uploading...' : 'Upload Photos'}
                        </button>
                    </div>
                )}

                {activeTab === 'video' && (
                    <div>
                        <input
                            type="url"
                            value={videoUrl}
                            onChange={e => handleVideoUrlChange(e.target.value)}
                            placeholder="Paste YouTube or Vimeo URL"
                            className={`${modalInput} mb-4`}
                        />
                        {videoThumbnail && (
                            <div className="mb-4 relative w-[200px] h-[112px] rounded-xl overflow-hidden border border-border">
                                <Image src={videoThumbnail} alt="Video thumbnail" fill sizes="200px" className="object-cover" />
                            </div>
                        )}
                        <input
                            type="text"
                            value={videoCaption}
                            onChange={e => setVideoCaption(e.target.value)}
                            placeholder="Add a caption (optional)"
                            className={`${modalInput} mb-4`}
                        />
                        {videoError && <p className="text-warm-red text-sm mb-3">{videoError}</p>}
                        <button
                            type="button"
                            onClick={addVideo}
                            disabled={addingVideo || !videoUrl}
                            className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {addingVideo ? 'Adding...' : 'Add Video'}
                        </button>
                    </div>
                )}
            </div>

            {actionError && <p className="text-warm-red text-sm mb-4">{actionError}</p>}

            {/* Media grid */}
            {loading ? (
                <div className="bg-card rounded-2xl shadow-card p-12 text-center text-muted text-sm">Loading...</div>
            ) : items.length === 0 ? (
                <div className="bg-card rounded-2xl shadow-card p-12 text-center text-muted text-sm">
                    No portfolio items yet. Add photos or videos above.
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items.map((item, idx) => (
                        <div
                            key={item.id}
                            className={`group relative bg-card rounded-2xl shadow-card overflow-hidden aspect-square ${item.is_active ? '' : 'opacity-50'}`}
                        >
                            {item.type === 'photo' ? (
                                <Image
                                    src={item.url}
                                    alt={item.caption || ''}
                                    fill
                                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                                    className="object-cover"
                                />
                            ) : (
                                <>
                                    {item.thumbnail_url ? (
                                        <Image
                                            src={item.thumbnail_url}
                                            alt={item.caption || ''}
                                            fill
                                            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className={`w-full h-full bg-gradient-to-br ${TILE_GRADIENTS[idx % TILE_GRADIENTS.length]}`} />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center text-white text-2xl pointer-events-none">▶</div>
                                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">VIDEO</div>
                                </>
                            )}

                            {!item.is_active && (
                                <span className="absolute top-2 left-2 bg-text text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">Hidden</span>
                            )}

                            {item.caption && (
                                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs px-3 py-2 truncate">{item.caption}</div>
                            )}

                            {/* Actions — shown on hover (always on touch screens) */}
                            <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                                <button type="button" onClick={() => moveItem(item.id, 'up')} disabled={idx === 0} title="Move up" className={actionBtn}>↑</button>
                                <button type="button" onClick={() => moveItem(item.id, 'down')} disabled={idx === items.length - 1} title="Move down" className={actionBtn}>↓</button>
                                <button type="button" onClick={() => toggleVisibility(item)} title={item.is_active ? 'Hide' : 'Show'} className={actionBtn}>👁</button>
                                <button type="button" onClick={() => deleteItem(item.id)} title="Delete" className="w-7 h-7 rounded bg-accent text-white text-xs">🗑</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
