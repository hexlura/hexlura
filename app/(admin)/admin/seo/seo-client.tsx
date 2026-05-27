'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { SaveFeedback } from '@/components/ui/SaveFeedback'
import type { SeoMetadata } from '@/types'

const KNOWN_PAGES = [
    { path: '/', label: 'Homepage' },
    { path: '/about', label: 'About' },
    { path: '/how-it-works', label: 'How It Works' },
    { path: '/contact', label: 'Contact' },
    { path: '/privacy', label: 'Privacy Policy' },
    { path: '/terms', label: 'Terms & Conditions' },
    { path: '/sell-tickets', label: 'Sell Tickets' },
    { path: '/events', label: 'Events (Browse)' },
    { path: '/browse', label: 'Browse' },
    { path: '/cookies', label: 'Cookies' },
    { path: '/cookie-policy', label: 'Cookie Policy' },
    { path: '/events/[slug]', label: 'Event Detail (Template)' },
    { path: '/organisers/[slug]', label: 'Organiser Profile (Template)' },
]

interface Props {
    seoEntries: SeoMetadata[]
    globalDefaults: Record<string, string>
}

export function SeoClient({ seoEntries, globalDefaults }: Props) {
    const router = useRouter()

    // Global defaults
    const [siteName, setSiteName] = useState(globalDefaults['seo_site_name'] ?? 'Hexlura')
    const [defaultOgImage, setDefaultOgImage] = useState(globalDefaults['seo_default_og_image'] ?? '')
    const [twitterHandle, setTwitterHandle] = useState(globalDefaults['seo_twitter_handle'] ?? '@hexlura')
    const [defaultDescription, setDefaultDescription] = useState(globalDefaults['seo_default_description'] ?? '')

    // Page selector
    const [selectedPage, setSelectedPage] = useState('/')
    const [customPath, setCustomPath] = useState('')
    const [useCustomPath, setUseCustomPath] = useState(false)

    // Per-page fields
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [ogTitle, setOgTitle] = useState('')
    const [ogDescription, setOgDescription] = useState('')
    const [ogImageUrl, setOgImageUrl] = useState('')
    const [twitterCard, setTwitterCard] = useState<'summary' | 'summary_large_image'>('summary_large_image')
    const [keywords, setKeywords] = useState('')
    const [canonicalUrl, setCanonicalUrl] = useState('')
    const [robots, setRobots] = useState('index, follow')
    const [jsonLd, setJsonLd] = useState('')

    const [saving, setSaving] = useState<string | null>(null)
    const [feedback, setFeedback] = useState<Record<string, { message: string; tone: 'success' | 'error' }>>({})

    function showFeedback(section: string, message: string, tone: 'success' | 'error' = 'success') {
        setFeedback(prev => ({ ...prev, [section]: { message, tone } }))
        setTimeout(() => {
            setFeedback(prev => {
                if (prev[section]?.message !== message) return prev
                const rest = { ...prev }
                delete rest[section]
                return rest
            })
        }, 3000)
    }

    const activePath = useCustomPath ? customPath.trim() : selectedPage

    function loadPageData(path: string) {
        const entry = seoEntries.find(e => e.page_path === path)
        setTitle(entry?.title ?? '')
        setDescription(entry?.description ?? '')
        setOgTitle(entry?.og_title ?? '')
        setOgDescription(entry?.og_description ?? '')
        setOgImageUrl(entry?.og_image_url ?? '')
        setTwitterCard(entry?.twitter_card ?? 'summary_large_image')
        setKeywords(entry?.keywords ?? '')
        setCanonicalUrl(entry?.canonical_url ?? '')
        setRobots(entry?.robots ?? 'index, follow')
        setJsonLd(entry?.json_ld ? JSON.stringify(entry.json_ld, null, 2) : '')
    }

    function handleSelectPage(path: string) {
        setSelectedPage(path)
        setUseCustomPath(false)
        loadPageData(path)
    }

    function handleLoadCustomPath() {
        if (!customPath.trim()) return
        setUseCustomPath(true)
        loadPageData(customPath.trim())
    }

    // Save global defaults via existing settings API
    async function saveSetting(key: string, value: string) {
        await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value }),
        })
    }

    async function handleSaveGlobals() {
        setSaving('globals')
        await Promise.all([
            saveSetting('seo_site_name', siteName),
            saveSetting('seo_default_og_image', defaultOgImage),
            saveSetting('seo_twitter_handle', twitterHandle),
            saveSetting('seo_default_description', defaultDescription),
        ])
        setSaving(null)
        showFeedback('globals', 'Global SEO defaults saved')
        router.refresh()
    }

    async function handleSavePageSeo() {
        if (!activePath) return
        setSaving('page')
        const res = await fetch('/api/admin/seo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                page_path: activePath,
                title: title || null,
                description: description || null,
                og_title: ogTitle || null,
                og_description: ogDescription || null,
                og_image_url: ogImageUrl || null,
                twitter_card: twitterCard,
                keywords: keywords || null,
                canonical_url: canonicalUrl || null,
                robots,
                json_ld: jsonLd || null,
            }),
        })
        const data = await res.json()
        setSaving(null)
        if (data.error) {
            showFeedback('page', `Error: ${data.error}`, 'error')
        } else {
            showFeedback('page', `SEO saved for ${activePath}`)
            router.refresh()
        }
    }

    async function handleDeletePageSeo() {
        if (!activePath) return
        if (!confirm(`Remove all SEO overrides for "${activePath}"? The page will revert to defaults.`)) return
        setSaving('delete')
        await fetch('/api/admin/seo', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page_path: activePath }),
        })
        setSaving(null)
        setTitle('')
        setDescription('')
        setOgTitle('')
        setOgDescription('')
        setOgImageUrl('')
        setTwitterCard('summary_large_image')
        setKeywords('')
        setCanonicalUrl('')
        setRobots('index, follow')
        setJsonLd('')
        showFeedback('page', `SEO overrides removed for ${activePath}`)
        router.refresh()
    }

    const hasExistingEntry = seoEntries.some(e => e.page_path === activePath)

    const sectionClass = "bg-card border border-border rounded-none p-6 mb-6"
    const labelClass = "text-xs text-muted block mb-1"
    const inputClass = "w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"

    return (
        <div className="max-w-3xl">

            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">SEO MANAGER</h1>
                <p className="text-muted text-sm mt-1">Manage meta tags, Open Graph, and structured data for all pages</p>
            </div>

            {/* Global SEO Defaults */}
            <div className={sectionClass}>
                <h2 className="text-sm font-medium text-text mb-4">Global Defaults</h2>
                <p className="text-xs text-muted mb-4">These values are used as fallbacks when a page has no specific override set.</p>
                <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                        <label className={labelClass}>Site Name</label>
                        <input type="text" value={siteName} onChange={e => setSiteName(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Default OG Image URL</label>
                        <input type="text" value={defaultOgImage} onChange={e => setDefaultOgImage(e.target.value)} className={inputClass} placeholder="https://..." />
                    </div>
                    <div>
                        <label className={labelClass}>Twitter / X Handle</label>
                        <input type="text" value={twitterHandle} onChange={e => setTwitterHandle(e.target.value)} className={inputClass} placeholder="@hexlura" />
                    </div>
                    <div>
                        <label className={labelClass}>Default Meta Description</label>
                        <textarea value={defaultDescription} onChange={e => setDefaultDescription(e.target.value)} className={inputClass} rows={2} />
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="primary" size="md" onClick={handleSaveGlobals} disabled={saving === 'globals'}>
                        {saving === 'globals' ? 'Saving...' : 'Save Global Defaults'}
                    </Button>
                    <SaveFeedback message={feedback.globals?.message ?? null} tone={feedback.globals?.tone ?? 'success'} />
                </div>
            </div>

            {/* Per-Page SEO */}
            <div className={sectionClass}>
                <h2 className="text-sm font-medium text-text mb-4">Per-Page SEO</h2>

                {/* Page selector */}
                <div className="mb-4">
                    <label className={labelClass}>Select Page</label>
                    <div className="flex gap-2">
                        <select
                            value={useCustomPath ? '__custom__' : selectedPage}
                            onChange={e => {
                                if (e.target.value === '__custom__') {
                                    setUseCustomPath(true)
                                } else {
                                    handleSelectPage(e.target.value)
                                }
                            }}
                            className={inputClass}
                        >
                            {KNOWN_PAGES.map(p => (
                                <option key={p.path} value={p.path}>
                                    {p.label} ({p.path})
                                    {seoEntries.some(e => e.page_path === p.path) ? ' *' : ''}
                                </option>
                            ))}
                            <option value="__custom__">Custom path...</option>
                        </select>
                    </div>
                </div>

                {useCustomPath && (
                    <div className="mb-4">
                        <label className={labelClass}>Custom Path (e.g. /events/summer-party-2026)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={customPath}
                                onChange={e => setCustomPath(e.target.value)}
                                className={inputClass}
                                placeholder="/events/my-event-slug"
                            />
                            <Button variant="secondary" size="md" onClick={handleLoadCustomPath}>
                                Load
                            </Button>
                        </div>
                    </div>
                )}

                {hasExistingEntry && (
                    <div className="mb-4 px-3 py-2 bg-accent/10 border border-accent/30 text-xs text-accent">
                        This page has custom SEO overrides configured.
                    </div>
                )}

                {/* SEO Fields */}
                <div className="space-y-4 mb-4">
                    <div>
                        <label className={labelClass}>Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="Leave blank to use auto-generated title" />
                    </div>
                    <div>
                        <label className={labelClass}>Meta Description <span className="text-muted">({description.length}/160)</span></label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className={inputClass}
                            rows={3}
                            maxLength={320}
                            placeholder="Recommended: 120-160 characters"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>OG Title <span className="text-muted">(falls back to Title)</span></label>
                            <input type="text" value={ogTitle} onChange={e => setOgTitle(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Twitter Card Type</label>
                            <select value={twitterCard} onChange={e => setTwitterCard(e.target.value as 'summary' | 'summary_large_image')} className={inputClass}>
                                <option value="summary_large_image">Large Image</option>
                                <option value="summary">Summary</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>OG Description <span className="text-muted">(falls back to Meta Description)</span></label>
                        <textarea value={ogDescription} onChange={e => setOgDescription(e.target.value)} className={inputClass} rows={2} />
                    </div>
                    <div>
                        <label className={labelClass}>OG Image URL</label>
                        <input type="text" value={ogImageUrl} onChange={e => setOgImageUrl(e.target.value)} className={inputClass} placeholder="https://... (1200x630 recommended)" />
                    </div>
                    <div>
                        <label className={labelClass}>Keywords <span className="text-muted">(comma-separated)</span></label>
                        <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} className={inputClass} placeholder="events, tickets, london" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Canonical URL</label>
                            <input type="text" value={canonicalUrl} onChange={e => setCanonicalUrl(e.target.value)} className={inputClass} placeholder="https://..." />
                        </div>
                        <div>
                            <label className={labelClass}>Robots Directive</label>
                            <select value={robots} onChange={e => setRobots(e.target.value)} className={inputClass}>
                                <option value="index, follow">index, follow (default)</option>
                                <option value="noindex, follow">noindex, follow</option>
                                <option value="index, nofollow">index, nofollow</option>
                                <option value="noindex, nofollow">noindex, nofollow</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>JSON-LD Structured Data</label>
                        <textarea
                            value={jsonLd}
                            onChange={e => setJsonLd(e.target.value)}
                            className={`${inputClass} font-mono text-xs`}
                            rows={6}
                            placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "..."\n}'}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="primary" size="md" onClick={handleSavePageSeo} disabled={saving === 'page' || !activePath}>
                        {saving === 'page' ? 'Saving...' : 'Save Page SEO'}
                    </Button>
                    {hasExistingEntry && (
                        <Button variant="secondary" size="md" onClick={handleDeletePageSeo} disabled={saving === 'delete'}>
                            {saving === 'delete' ? 'Removing...' : 'Remove Overrides'}
                        </Button>
                    )}
                    <SaveFeedback message={feedback.page?.message ?? null} tone={feedback.page?.tone ?? 'success'} />
                </div>
            </div>

            {/* Configured Pages Overview */}
            {seoEntries.length > 0 && (
                <div className={sectionClass}>
                    <h2 className="text-sm font-medium text-text mb-4">Configured Pages</h2>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                {['Page', 'Title', 'Robots', 'Updated'].map(h => (
                                    <th key={h} className="text-left text-xs text-muted py-2 font-normal">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {seoEntries.map(entry => (
                                <tr
                                    key={entry.page_path}
                                    className="border-b border-border/50 cursor-pointer hover:bg-surface/50"
                                    onClick={() => {
                                        const known = KNOWN_PAGES.find(p => p.path === entry.page_path)
                                        if (known) {
                                            handleSelectPage(entry.page_path)
                                        } else {
                                            setCustomPath(entry.page_path)
                                            setUseCustomPath(true)
                                            loadPageData(entry.page_path)
                                        }
                                        window.scrollTo({ top: 0, behavior: 'smooth' })
                                    }}
                                >
                                    <td className="py-2 font-mono text-accent text-xs">{entry.page_path}</td>
                                    <td className="py-2 text-text text-xs truncate max-w-[200px]">{entry.title || '—'}</td>
                                    <td className="py-2 text-muted text-xs">{entry.robots || 'index, follow'}</td>
                                    <td className="py-2 text-muted text-xs">
                                        {new Date(entry.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
