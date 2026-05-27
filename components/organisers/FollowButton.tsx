'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FollowButtonProps {
    organiserId: string;
    initialFollowing: boolean;
    initialCount: number;
    isLoggedIn: boolean;
}

function formatCount(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
}

export default function FollowButton({ organiserId, initialFollowing, initialCount, isLoggedIn }: FollowButtonProps) {
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
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '2px',
                    cursor: loading ? 'default' : 'pointer',
                    border: following ? '1px solid #E63950' : '1px solid #0A0A0F',
                    background: following ? 'rgba(230,57,80,0.1)' : '#0A0A0F',
                    color: following ? '#E63950' : '#FFFFFF',
                    transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                }}
            >
                {following ? 'Following' : 'Follow'}
            </button>
            <span style={{ fontSize: '12px', color: '#666677' }}>
                {formatCount(count)} Follower{count !== 1 ? 's' : ''}
            </span>
        </div>
    );
}
