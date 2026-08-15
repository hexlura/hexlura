'use client'

import { useState } from 'react'
import { Copy, Check, ArrowUpRight } from 'lucide-react'

export function ProfileLinkButton({ slug }: { slug: string }) {
    const [copied, setCopied] = useState(false)

    async function handleCopy() {
        const url = `${window.location.origin}/organisers/${slug}`
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (e) {
            console.error('[ProfileLinkButton] copy failed:', e)
        }
    }

    return (
        <div className="flex items-stretch border border-border rounded-none overflow-hidden">
            <button
                type="button"
                onClick={handleCopy}
                title="Copy profile link"
                aria-label="Copy profile link"
                className="basis-1/4 flex items-center justify-center px-3 border-r border-border bg-card hover:bg-surface transition-colors"
            >
                {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4 text-muted" />}
            </button>
            <a
                href={`/organisers/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm text-text bg-card hover:bg-surface transition-colors whitespace-nowrap"
            >
                View Public Profile
                <ArrowUpRight className="w-4 h-4" />
            </a>
        </div>
    )
}
