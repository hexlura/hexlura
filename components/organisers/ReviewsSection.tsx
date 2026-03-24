'use client';

import { useState } from 'react';
import ReviewForm from './ReviewForm';
import { Review } from '@/types';

interface ReviewsSectionProps {
    organiserId: string;
    reviews: (Review & { user?: { full_name: string | null } })[];
    averageRating: number;
    reviewCount: number;
    canReview: boolean;
    hasReviewed: boolean;
    isLoggedIn: boolean;
}

function Stars({ rating, size = 18 }: { rating: number; size?: number }) {
    return (
        <span style={{ display: 'inline-flex', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} style={{ fontSize: size, color: s <= Math.round(rating) ? '#F5A623' : '#2A2A3A', lineHeight: 1 }}>★</span>
            ))}
        </span>
    );
}

export default function ReviewsSection({ organiserId, reviews: initialReviews, averageRating, reviewCount, canReview, hasReviewed, isLoggedIn }: ReviewsSectionProps) {
    const [submitted, setSubmitted] = useState(false);

    return (
        <div>
            <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '24px', color: '#F0F0F8', marginBottom: '24px', letterSpacing: '1px' }}>
                REVIEWS
            </h2>

            {/* Average rating */}
            {reviewCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                    <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '48px', color: '#F5A623', lineHeight: 1 }}>
                        {averageRating.toFixed(1)}
                    </span>
                    <div>
                        <Stars rating={averageRating} size={20} />
                        <p style={{ fontSize: '13px', color: '#8888AA', marginTop: '4px' }}>({reviewCount} review{reviewCount !== 1 ? 's' : ''})</p>
                    </div>
                </div>
            )}

            {/* Review form or status message */}
            <div style={{ marginBottom: '32px' }}>
                {!isLoggedIn ? (
                    <p style={{ fontSize: '13px', color: '#8888AA' }}>Only verified attendees can leave reviews.</p>
                ) : !canReview ? (
                    <p style={{ fontSize: '13px', color: '#8888AA' }}>Only verified attendees can leave reviews.</p>
                ) : hasReviewed || submitted ? (
                    <p style={{ fontSize: '13px', color: '#00E5A0' }}>You have already reviewed this organiser.</p>
                ) : (
                    <ReviewForm organiserId={organiserId} onSubmitted={() => setSubmitted(true)} />
                )}
            </div>

            {/* Reviews list */}
            {initialReviews.length > 0 ? (
                <div>
                    {initialReviews.map((review) => (
                        <div key={review.id} style={{ background: '#1A1A24', border: '1px solid #2A2A3A', padding: '16px', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#F0F0F8' }}>
                                        {review.user?.full_name || 'Anonymous'}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#00E5A0', border: '1px solid rgba(0,229,160,0.3)', padding: '1px 6px', borderRadius: '2px' }}>
                                        Verified Attendee
                                    </span>
                                </div>
                                <span style={{ fontSize: '11px', color: '#8888AA' }}>
                                    {new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <Stars rating={review.rating ?? 0} size={14} />
                            <p style={{ fontSize: '14px', color: '#8888AA', lineHeight: 1.7, marginTop: '8px' }}>
                                {review.comment}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed #2A2A3A' }}>
                    <p style={{ color: '#8888AA', fontSize: '14px' }}>No reviews yet. Be the first to share your experience!</p>
                </div>
            )}
        </div>
    );
}
