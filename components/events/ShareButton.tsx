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
            className="flex items-center gap-1.5 transition-colors hover:border-[#F0F0F8] hover:text-[#F0F0F8]"
            style={{
                fontSize: '13px',
                padding: '6px 14px',
                border: '1px solid #2A2A3A',
                borderRadius: '2px',
                background: 'transparent',
                color: copied ? '#00E5A0' : '#8888AA',
                cursor: 'pointer',
            }}
        >
            {!copied && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 1v9M5 4l3-3 3 3M3 11v3h10v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
            {copied ? 'Link copied!' : 'Share'}
        </button>
    );
}
