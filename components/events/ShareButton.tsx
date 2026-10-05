'use client';

import React, { useState } from 'react';

interface ShareButtonProps {
    title: string;
}

export default function ShareButton({ title }: ShareButtonProps) {
    const [copied, setCopied] = useState(false);

    async function handleShare() {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title, url });
            } catch {
                // User cancelled share — do nothing
            }
        } else {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    return (
        <button
            onClick={handleShare}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full border border-border bg-card text-sm font-semibold hover:bg-background transition ${copied ? 'text-warm-green' : ''}`}
        >
            {!copied && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>
            )}
            {copied ? 'Link copied!' : 'Share'}
        </button>
    );
}
