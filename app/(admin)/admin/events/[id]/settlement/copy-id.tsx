'use client'

import { useState } from 'react'

/** Monospace Stripe ID: click to copy, optionally with an "open in Stripe" link. */
export function CopyId({ value, href }: { value: string; href?: string }) {
    const [copied, setCopied] = useState(false)

    async function copy() {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1000)
        } catch {
            // Clipboard can be blocked (insecure context, permissions) — the ID
            // stays selectable as plain text, so this is a convenience only.
        }
    }

    return (
        <span className="inline-flex items-center gap-1.5 font-mono text-[12px] whitespace-nowrap">
            <button
                type="button"
                onClick={copy}
                title="Click to copy"
                className={copied ? 'text-success' : 'text-text hover:text-accent transition-colors'}
            >
                {copied ? 'Copied ✓' : value}
            </button>
            {href && (
                <a href={href} target="_blank" rel="noopener noreferrer" title="Open in Stripe" className="text-muted hover:text-text">
                    ↗
                </a>
            )}
        </span>
    )
}
