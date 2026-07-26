'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FollowButtonProps {
    organiserId: string;
    initialFollowing: boolean;
    initialCount: number;
    initialCountShow: boolean;
    isLoggedIn: boolean;
}

function formatCount(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
}

export default function FollowButton({ organiserId, initialFollowing, initialCount, initialCountShow, isLoggedIn }: FollowButtonProps) {
    const [following, setFollowing] = useState(initialFollowing);
    const [count, setCount] = useState(initialCount);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleClick() {
        if (!isLoggedIn) {
            router.push('/auth/login');
            return;
        }
        setLoading(true);
        const optimisticFollowing = !following;
        const optimisticCount = optimisticFollowing ? count + 1 : count - 1;
        setFollowing(optimisticFollowing);
        setCount(optimisticCount);
        try {
            const res = await fetch('/api/follows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organiser_id: organiserId }),
            });
            const data = await res.json();
            if (res.ok) {
                setFollowing(data.following);
                setCount(data.count);
            } else {
                setFollowing(!optimisticFollowing);
                setCount(count);
            }
        } catch {
            setFollowing(!optimisticFollowing);
            setCount(count);
        }
        setLoading(false);
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
                onClick={handleClick}
                disabled={loading}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '2px',
                    cursor: loading ? 'default' : 'pointer',
                    border: '1px solid #0A0A0F',
                    background: '#0A0A0F',
                    color: '#FFFFFF',
                    transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                }}
            >
                {following && (
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
                    </svg>
                )}
                {following ? 'Following' : 'Follow'}
            </button>
            {initialCountShow ? (
                <span style={{ fontSize: '12px', color: '#666677' }}>
                    {formatCount(count)} Follower{count !== 1 ? 's' : ''}
                </span>
            ) : null}
        </div>
    );
}
