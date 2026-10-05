'use client'

import { useState } from 'react'
import { formatPence } from '@/lib/fees'

interface LinkItem {
    assignmentId: string
    commissionPercent: number
    event: { id: string; title: string; slug: string; start_at: string; status: string }
    clicks: number
    sales: number
    earnedPence: number
}

interface Props {
    items: LinkItem[]
    referralCode: string
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function getStatus(event: LinkItem['event']): { label: string; className: string } {
    if (event.status === 'cancelled') return { label: 'Cancelled', className: 'text-muted bg-border' }
    const now = new Date()
    const start = new Date(event.start_at)
    if (start < now) return { label: 'Ended', className: 'text-muted bg-border' }
    const daysAway = (start.getTime() - now.getTime()) / 86400000
    if (daysAway > 7) return { label: 'Upcoming', className: 'text-warm-amberText bg-warm-amber/15' }
    return { label: 'Active', className: 'text-warm-green bg-warm-green/10' }
}

function getAppUrl(): string {
    if (typeof window !== 'undefined') return window.location.origin
    return ''
}

export function LinksClient({ items, referralCode }: Props) {
    const [copiedId, setCopiedId] = useState<string | null>(null)

    function buildUrl(slug: string): string {
        return `${getAppUrl()}/events/${slug}?ref=${referralCode}`
    }

    async function copy(id: string, slug: string) {
        try {
            await navigator.clipboard.writeText(buildUrl(slug))
            setCopiedId(id)
            setTimeout(() => setCopiedId(null), 1500)
        } catch {
            /* ignore */
        }
    }

    async function share(slug: string, title: string) {
        const url = buildUrl(slug)
        if (typeof navigator !== 'undefined' && 'share' in navigator) {
            try {
                await (navigator as Navigator & { share: (data: { title?: string; url: string }) => Promise<void> }).share({ title, url })
                return
            } catch { /* user cancelled */ }
        }
        // Fallback: open mailto
        window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
    }

    return (
        <div className="max-w-7xl">
            <div className="mb-6">
                <h1 className="font-heading text-4xl tracking-wide">MY REFERRAL LINKS</h1>
                <p className="text-muted text-sm mt-1">Share these links — earn commission on every booking.</p>
            </div>

            {items.length === 0 ? (
                <div className="bg-card rounded-2xl shadow-card p-10 text-center">
                    <p className="font-semibold">You haven&apos;t been assigned any events yet.</p>
                    <p className="text-sm text-muted mt-1">Organisers will invite you by email — keep an eye on your inbox.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    {items.map(item => {
                        const status = getStatus(item.event)
                        const url = buildUrl(item.event.slug)
                        const isCopied = copiedId === item.assignmentId
                        return (
                            <div key={item.assignmentId} className="bg-card rounded-2xl shadow-card p-6">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-3 mb-1">
                                            <h3 className="font-semibold text-lg truncate">{item.event.title}</h3>
                                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${status.className}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted">
                                            {fmtDate(item.event.start_at)} · <span className="text-warm-green font-semibold">{item.commissionPercent}% commission</span>
                                        </p>

                                        <div className="mt-4 flex flex-wrap items-center gap-2">
                                            <code className="font-mono text-xs bg-background border border-border rounded-lg px-3 py-2.5 flex-1 min-w-[200px] truncate">
                                                {url}
                                            </code>
                                            <button
                                                onClick={() => copy(item.assignmentId, item.event.slug)}
                                                className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-card border border-border text-muted hover:text-text transition"
                                                title="Copy"
                                            >
                                                {isCopied ? 'Copied!' : 'Copy'}
                                            </button>
                                            <button
                                                onClick={() => share(item.event.slug, item.event.title)}
                                                className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-accent text-white shadow-glow hover:brightness-110 transition"
                                            >
                                                Share
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-6 lg:min-w-[270px] text-center">
                                        <div>
                                            <p className="font-heading text-2xl">{item.clicks.toLocaleString('en-GB')}</p>
                                            <p className="text-[10px] text-muted uppercase tracking-wider">Clicks</p>
                                        </div>
                                        <div>
                                            <p className="font-heading text-2xl">{item.sales}</p>
                                            <p className="text-[10px] text-muted uppercase tracking-wider">Sales</p>
                                        </div>
                                        <div>
                                            <p className="font-heading text-2xl text-warm-green">{formatPence(item.earnedPence)}</p>
                                            <p className="text-[10px] text-muted uppercase tracking-wider">Earned</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
