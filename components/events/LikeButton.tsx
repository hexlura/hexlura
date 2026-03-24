'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LikeButtonProps {
    eventId: string;
    initialLiked: boolean;
    initialCount: number;
    isLoggedIn: boolean;
}

export default function LikeButton({ eventId, initialLiked, initialCount, isLoggedIn }: LikeButtonProps) {
    const [liked, setLiked] = useState(initialLiked);
    const [count, setCount] = useState(initialCount);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleClick() {
        if (!isLoggedIn) {
            router.push('/auth/login');
            return;
        }
        setLoading(true);
        const optimisticLiked = !liked;
        const optimisticCount = optimisticLiked ? count + 1 : count - 1;
        setLiked(optimisticLiked);
        setCount(optimisticCount);
        try {
            const res = await fetch('/api/likes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_id: eventId }),
            });
            const data = await res.json();
            if (res.ok) {
                setLiked(data.liked);
                setCount(data.count);
            } else {
                setLiked(!optimisticLiked);
                setCount(count);
            }
        } catch {
            setLiked(!optimisticLiked);
            setCount(count);
        }
        setLoading(false);
    }

    const heartOutline = (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    );

    const heartFilled = (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    );

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                border: liked ? '1px solid #E63950' : '1px solid #2A2A3A',
                borderRadius: '2px',
                background: liked ? 'rgba(230,57,80,0.1)' : 'transparent',
                color: liked ? '#E63950' : '#8888AA',
                fontSize: '13px',
                cursor: loading ? 'default' : 'pointer',
                transition: 'border-color 0.15s, color 0.15s, background 0.15s',
            }}
        >
            {liked ? heartFilled : heartOutline}
            <span>{count}</span>
        </button>
    );
}
