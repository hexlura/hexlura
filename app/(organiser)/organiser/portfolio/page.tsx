'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

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

    // Hover state for grid items
    const [hoveredId, setHoveredId] = useState<string | null>(null)

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
        const res = await fetch('/api/organiser/portfolio')
        if (res.ok) {
            const data = await res.json()
            setItems(data.items || [])
        }
        setLoading(false)
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
            if (file.size > 5 * 1024 * 1024) {
                setUploadError(`${file.name} exceeds 5MB limit`)
                continue
            }
            const timestamp = Date.now()
            const path = `${organiserId}/${timestamp}-${file.name}`
            const { error: storageError } = await supabase.storage
                .from('organiser-portfolio')
                .upload(path, file)
            if (storageError) {
                setUploadError('Upload failed: ' + storageError.message)
                continue
            }
            const { data: urlData } = supabase.storage.from('organiser-portfolio').getPublicUrl(path)
            await fetch('/api/organiser/portfolio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'photo',
                    url: urlData.publicUrl,
                    caption: photoCaption || null,
                }),
            })
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

        await Promise.all([
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
        await fetchItems()
    }

    async function toggleVisibility(item: PortfolioItem) {
        await fetch('/api/organiser/portfolio', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
        })
        await fetchItems()
    }

    async function deleteItem(id: string) {
        if (!confirm('Delete this portfolio item?')) return
        await fetch('/api/organiser/portfolio', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        })
        await fetchItems()
    }

    const tabBtnStyle = (active: boolean): React.CSSProperties => ({
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        background: active ? '#0A0A0F' : 'transparent',
        color: active ? '#FFFFFF' : '#0A0A0F',
        border: active ? 'none' : '1px solid #C0C0C8',
        transition: 'all 0.15s',
    })

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
            <h1 style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 36,
                color: '#0A0A0F',
                letterSpacing: '1px',
                marginBottom: 32,
            }}>
                PORTFOLIO
            </h1>

            {/* Add Media Section */}
            <div style={{
                background: '#FFFFFF',
                border: '1px solid #E0E0E0',
                padding: 24,
                marginBottom: 32,
            }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#0A0A0F', marginBottom: 16 }}>
                    Add to Portfolio
                </p>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <button style={tabBtnStyle(activeTab === 'photo')} onClick={() => setActiveTab('photo')}>
                        📷 Add Photo
                    </button>
                    <button style={tabBtnStyle(activeTab === 'video')} onClick={() => setActiveTab('video')}>
                        🎬 Add Video
                    </button>
                </div>

                {activeTab === 'photo' && (
                    <div>
                        {/* Drop zone */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: `2px dashed ${dragOver ? '#0A0A0F' : '#C0C0C8'}`,
                                padding: 32,
                                textAlign: 'center',
                                borderRadius: 0,
                                cursor: 'pointer',
                                background: dragOver ? '#F5F5F7' : 'transparent',
                                transition: 'all 0.15s',
                                marginBottom: 12,
                            }}
                        >
                            {photoFiles.length > 0 ? (
                                <div>
                                    <p style={{ fontSize: 14, color: '#0A0A0F', fontWeight: 600 }}>
                                        {photoFiles.length} file{photoFiles.length > 1 ? 's' : ''} selected
                                    </p>
                                    <p style={{ fontSize: 12, color: '#8888AA', marginTop: 4 }}>
                                        {photoFiles.map(f => f.name).join(', ')}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <p style={{ fontSize: 14, color: '#8888AA' }}>
                                        Drag photos here or click to upload
                                    </p>
                                    <p style={{ fontSize: 12, color: '#C0C0C8', marginTop: 6 }}>
                                        JPG, PNG or WebP · Max 5MB each · Up to 5 at once
                                    </p>
                                </>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                        </div>

                        <input
                            type="text"
                            value={photoCaption}
                            onChange={e => setPhotoCaption(e.target.value)}
                            placeholder="Add a caption (optional)"
                            style={{
                                width: '100%',
                                border: '1px solid #C0C0C8',
                                padding: '8px 12px',
                                fontSize: 14,
                                marginBottom: 12,
                                boxSizing: 'border-box',
                                outline: 'none',
                            }}
                        />

                        {uploadError && (
                            <p style={{ fontSize: 13, color: '#E63950', marginBottom: 8 }}>{uploadError}</p>
                        )}

                        <button
                            onClick={uploadPhotos}
                            disabled={uploading || photoFiles.length === 0}
                            style={{
                                background: '#0A0A0F',
                                color: '#FFFFFF',
                                padding: '10px 24px',
                                fontSize: 13,
                                fontWeight: 600,
                                border: 'none',
                                cursor: uploading || photoFiles.length === 0 ? 'not-allowed' : 'pointer',
                                opacity: uploading || photoFiles.length === 0 ? 0.5 : 1,
                            }}
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
                            style={{
                                width: '100%',
                                border: '1px solid #C0C0C8',
                                padding: '8px 12px',
                                fontSize: 14,
                                marginBottom: 4,
                                boxSizing: 'border-box',
                                outline: 'none',
                            }}
                        />
                        <p style={{ fontSize: 12, color: '#8888AA', marginBottom: 12 }}>
                            Supports YouTube and Vimeo links
                        </p>

                        {videoThumbnail && (
                            <div style={{ marginBottom: 12 }}>
                                <img
                                    src={videoThumbnail}
                                    alt="Video thumbnail"
                                    style={{
                                        width: 200,
                                        height: 112,
                                        objectFit: 'cover',
                                        border: '1px solid #E0E0E0',
                                    }}
                                />
                            </div>
                        )}

                        <input
                            type="text"
                            value={videoCaption}
                            onChange={e => setVideoCaption(e.target.value)}
                            placeholder="Add a caption (optional)"
                            style={{
                                width: '100%',
                                border: '1px solid #C0C0C8',
                                padding: '8px 12px',
                                fontSize: 14,
                                marginBottom: 12,
                                boxSizing: 'border-box',
                                outline: 'none',
                            }}
                        />

                        {videoError && (
                            <p style={{ fontSize: 13, color: '#E63950', marginBottom: 8 }}>{videoError}</p>
                        )}

                        <button
                            onClick={addVideo}
                            disabled={addingVideo || !videoUrl}
                            style={{
                                background: '#E63950',
                                color: '#FFFFFF',
                                padding: '10px 24px',
                                fontSize: 13,
                                fontWeight: 600,
                                border: 'none',
                                cursor: addingVideo || !videoUrl ? 'not-allowed' : 'pointer',
                                opacity: addingVideo || !videoUrl ? 0.5 : 1,
                            }}
                        >
                            {addingVideo ? 'Adding...' : 'Add Video'}
                        </button>
                    </div>
                )}
            </div>

            {/* Portfolio Grid */}
            <div>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#0A0A0F', marginBottom: 16 }}>
                    Your Portfolio
                </p>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#8888AA', fontSize: 14 }}>
                        Loading...
                    </div>
                ) : items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#8888AA', fontSize: 14 }}>
                        No portfolio items yet. Add photos or videos above.
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 12,
                    }}
                        className="portfolio-grid"
                    >
                        {items.map((item, idx) => (
                            <div key={item.id}>
                                <div
                                    onMouseEnter={() => setHoveredId(item.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    style={{
                                        position: 'relative',
                                        borderRadius: 0,
                                        overflow: 'hidden',
                                        aspectRatio: '1/1',
                                        cursor: 'pointer',
                                        background: '#F0F0F0',
                                        opacity: item.is_active ? 1 : 0.5,
                                    }}
                                >
                                    {/* Image/Thumbnail */}
                                    {item.type === 'photo' ? (
                                        <img
                                            src={item.url}
                                            alt={item.caption || ''}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                        />
                                    ) : (
                                        <>
                                            {item.thumbnail_url && (
                                                <img
                                                    src={item.thumbnail_url}
                                                    alt={item.caption || ''}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                />
                                            )}
                                            {/* Play button */}
                                            <div style={{
                                                position: 'absolute',
                                                inset: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                pointerEvents: 'none',
                                            }}>
                                                <div style={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: '50%',
                                                    background: 'rgba(0,0,0,0.6)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                    <span style={{ color: 'white', fontSize: 18, marginLeft: 3 }}>▶</span>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Hidden badge */}
                                    {!item.is_active && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 6,
                                            left: 6,
                                            background: '#8888AA',
                                            color: 'white',
                                            fontSize: 10,
                                            fontWeight: 700,
                                            padding: '2px 6px',
                                            pointerEvents: 'none',
                                        }}>
                                            Hidden
                                        </div>
                                    )}

                                    {/* Hover overlay */}
                                    {hoveredId === item.id && (
                                        <div style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'rgba(0,0,0,0.5)',
                                        }}>
                                            {/* Caption */}
                                            {item.caption && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    left: 0,
                                                    right: 0,
                                                    padding: '0 8px 10px',
                                                    fontSize: 12,
                                                    color: 'white',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}>
                                                    {item.caption}
                                                </div>
                                            )}

                                            {/* Action buttons */}
                                            <div style={{
                                                position: 'absolute',
                                                top: 6,
                                                right: 6,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 4,
                                            }}>
                                                <button
                                                    onClick={() => moveItem(item.id, 'up')}
                                                    disabled={idx === 0}
                                                    title="Move up"
                                                    style={{
                                                        width: 28, height: 28,
                                                        background: 'rgba(255,255,255,0.9)',
                                                        border: 'none',
                                                        borderRadius: 2,
                                                        cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                                        fontSize: 13,
                                                        opacity: idx === 0 ? 0.4 : 1,
                                                    }}
                                                >↑</button>
                                                <button
                                                    onClick={() => moveItem(item.id, 'down')}
                                                    disabled={idx === items.length - 1}
                                                    title="Move down"
                                                    style={{
                                                        width: 28, height: 28,
                                                        background: 'rgba(255,255,255,0.9)',
                                                        border: 'none',
                                                        borderRadius: 2,
                                                        cursor: idx === items.length - 1 ? 'not-allowed' : 'pointer',
                                                        fontSize: 13,
                                                        opacity: idx === items.length - 1 ? 0.4 : 1,
                                                    }}
                                                >↓</button>
                                                <button
                                                    onClick={() => toggleVisibility(item)}
                                                    title={item.is_active ? 'Hide' : 'Show'}
                                                    style={{
                                                        width: 28, height: 28,
                                                        background: 'rgba(255,255,255,0.9)',
                                                        border: 'none',
                                                        borderRadius: 2,
                                                        cursor: 'pointer',
                                                        fontSize: 13,
                                                    }}
                                                >👁</button>
                                                <button
                                                    onClick={() => deleteItem(item.id)}
                                                    title="Delete"
                                                    style={{
                                                        width: 28, height: 28,
                                                        background: '#E63950',
                                                        border: 'none',
                                                        borderRadius: 2,
                                                        cursor: 'pointer',
                                                        fontSize: 13,
                                                        color: 'white',
                                                    }}
                                                >🗑</button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Caption below */}
                                {item.caption && (
                                    <p style={{
                                        fontSize: 12,
                                        color: '#666677',
                                        marginTop: 4,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        {item.caption}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                @media (max-width: 640px) {
                    .portfolio-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                }
            `}</style>
        </div>
    )
}
