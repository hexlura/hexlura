'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LikeButtonProps {
    eventId: string;
    initialLiked: boolean;
    initialCount: number;
    isLoggedIn: boolean;
}

export default function LikeButton({
    eventId,
    initialLiked,
    initialCount,
    isLoggedIn,
}: LikeButtonProps) {
    const router = useRouter();

    const [liked, setLiked] = useState(initialLiked);
    const [count, setCount] = useState(initialCount);
    const [loading, setLoading] = useState(false);

    async function handleClick() {
        if (!isLoggedIn) {
            router.push('/auth/login');
            return;
        }

        if (loading) return;

        const previousLiked = liked;
        const previousCount = count;

        const nextLiked = !previousLiked;
        const nextCount = Math.max(
            0,
            nextLiked ? previousCount + 1 : previousCount - 1
        );

        // Optimistic update
        setLiked(nextLiked);
        setCount(nextCount);
        setLoading(true);

        try {
            const response = await fetch('/api/likes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    event_id: eventId,
                }),
            });

            if (!response.ok) {
                throw new Error('Unable to update like');
            }

            const data: {
                liked: boolean;
                count: number;
            } = await response.json();

            setLiked(data.liked);
            setCount(data.count);
        } catch (error) {
            // Restore the previous state
            setLiked(previousLiked);
            setCount(previousCount);

            console.error('Like update failed:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <button
                type="button"
                className={`like-button ${liked ? 'liked' : ''}`}
                onClick={handleClick}
                disabled={loading}
                aria-pressed={liked}
                aria-label={`${liked ? 'Unlike' : 'Like'} this event. ${count} ${count === 1 ? 'like' : 'likes'
                    }`}
            >
                <span className="heart-wrapper" aria-hidden="true">
                    <svg
                        className="heart-icon"
                        viewBox="0 0 24 24"
                        fill={liked ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                </span>

                {/* <span className="button-label">
                    {liked ? 'Liked' : 'Like'}
                </span> */}

                <span className="like-count" aria-hidden="true">
                    {count}
                </span>
            </button>

            <style jsx>{`
                .like-button {
                    --button-color: #6B5D56;
                    --button-border: #F1E7E2;
                    --button-background: #ffffff;

                    position: relative;
                    display: inline-flex;
                    min-height: 38px;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 6px 12px 6px 14px;

                    border: 1px solid var(--button-border);
                    border-radius: 999px;
                    background: var(--button-background);
                    box-shadow:
                        0 1px 2px rgba(15, 23, 42, 0.04),
                        0 4px 14px rgba(15, 23, 42, 0.06);

                    color: var(--button-color);
                    font-family: inherit;
                    font-size: 14px;
                    font-weight: 600;
                    line-height: 1;
                    white-space: nowrap;

                    cursor: pointer;
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                    backdrop-filter: blur(10px);

                    transition:
                        color 180ms ease,
                        border-color 180ms ease,
                        background-color 180ms ease,
                        box-shadow 180ms ease,
                        transform 120ms ease;
                }

                .like-button:hover:not(:disabled) {
                    --button-color: #E63950;
                    --button-border: #F8C9D0;
                    --button-background: #FFF5F6;

                    box-shadow:
                        0 2px 4px rgba(230, 57, 80, 0.08),
                        0 8px 22px rgba(230, 57, 80, 0.12);

                    transform: translateY(-1px);
                }

                .like-button:active:not(:disabled) {
                    transform: translateY(0) scale(0.97);
                }

                .like-button:focus-visible {
                    outline: 3px solid rgba(230, 57, 80, 0.2);
                    outline-offset: 3px;
                }

                .like-button.liked {
                    --button-color: #E63950;
                    --button-border: #F8C9D0;
                    --button-background: linear-gradient(
                        135deg,
                        #FFF0F2 0%,
                        #FFF5F6 100%
                    );

                    box-shadow:
                        0 2px 4px rgba(230, 57, 80, 0.08),
                        0 8px 20px rgba(230, 57, 80, 0.1);
                }

                .like-button:disabled {
                    cursor: wait;
                    opacity: 0.7;
                }

                .heart-wrapper {
                    display: inline-flex;
                    width: 19px;
                    height: 19px;
                    align-items: center;
                    justify-content: center;
                }

                .heart-icon {
                    width: 19px;
                    height: 19px;
                    transition:
                        fill 180ms ease,
                        transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
                }

                .liked .heart-icon {
                    animation: heart-pop 350ms
                        cubic-bezier(0.2, 0.8, 0.2, 1);
                    filter: drop-shadow(
                        0 3px 5px rgba(230, 57, 80, 0.22)
                    );
                }

                .button-label {
                    letter-spacing: -0.01em;
                }

                .like-count {
                    display: inline-flex;
                    min-width: 25px;
                    height: 25px;
                    align-items: center;
                    justify-content: center;
                    padding: 0 7px;

                    border-radius: 999px;
                    background: rgba(107, 93, 86, 0.1);
                    font-size: 12px;
                    font-weight: 700;
                    font-variant-numeric: tabular-nums;

                    transition:
                        color 180ms ease,
                        background-color 180ms ease;
                }

                .liked .like-count {
                    background: rgba(230, 57, 80, 0.1);
                }

                @keyframes heart-pop {
                    0% {
                        transform: scale(0.75);
                    }

                    50% {
                        transform: scale(1.3);
                    }

                    100% {
                        transform: scale(1);
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .like-button,
                    .heart-icon,
                    .like-count {
                        transition: none;
                    }

                    .liked .heart-icon {
                        animation: none;
                    }
                }
            `}</style>
        </>
    );
}