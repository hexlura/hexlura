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
    if (event.status === 'cancelled') return { label: 'Cancelled', className: 'text-muted bg-muted/10 border-muted/20' }
    const now = new Date()
    const start = new Date(event.start_at)
    if (start < now) return { label: 'Ended', className: 'text-muted bg-muted/10 border-muted/20' }
    const daysAway = (start.getTime() - now.getTime()) / 86400000
    if (daysAway > 7) return { label: 'Upcoming', className: 'text-gold bg-gold/10 border-gold/20' }
    return { label: 'Active', className: 'text-success bg-success/10 border-success/20' }
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
            <h1 className="font-heading text-4xl text-text tracking-wide mb-2">MY REFERRAL LINKS</h1>
            <p className="text-muted text-sm mb-8">Share these links — earn commission on every booking.</p>

            {items.length === 0 ? (
                <div className="bg-card border border-border p-8 text-center">
                    <p className="text-muted text-sm">You haven&apos;t been assigned any events yet.</p>
                    <p className="text-xs text-muted mt-2">Organisers will invite you by email — keep an eye on your inbox.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {items.map(item => {
                        const status = getStatus(item.event)
                        const url = buildUrl(item.event.slug)
                        const isCopied = copiedId === item.assignmentId
                        return (
                            <div key={item.assignmentId} className="bg-card border border-border p-5">
                                <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <h3 className="font-medium text-text text-lg truncate">{item.event.title}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${status.className}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted">
                                            {fmtDate(item.event.start_at)} · <span className="text-success font-medium">{item.commissionPercent}% commission</span>
                                        </p>

                                        <div className="mt-3 flex items-center gap-2">
                                            <code className="font-mono text-xs text-text bg-surface border border-border px-3 py-2 flex-1 truncate">
                                                {url}
                                            </code>
                                            <button
                                                onClick={() => copy(item.assignmentId, item.event.slug)}
                                                className="text-xs px-3 py-2 bg-card border border-border text-muted hover:text-text"
                                                title="Copy"
                                            >
                                                {isCopied ? 'Copied!' : 'Copy'}
                                            </button>
                                            <button
                                                onClick={() => share(item.event.slug, item.event.title)}
                                                className="text-xs px-3 py-2 bg-accent text-white font-medium hover:bg-accent/90"
                                            >
                                                Share
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 lg:gap-6 lg:min-w-[260px]">
                                        <div className="text-center">
                                            <div className="text-lg font-medium text-text">{item.clicks.toLocaleString('en-GB')}</div>
                                            <div className="text-xs text-muted uppercase tracking-wider mt-0.5">Clicks</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-medium text-text">{item.sales}</div>
                                            <div className="text-xs text-muted uppercase tracking-wider mt-0.5">Sales</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-medium text-success">{formatPence(item.earnedPence)}</div>
                                            <div className="text-xs text-muted uppercase tracking-wider mt-0.5">Earned</div>
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
