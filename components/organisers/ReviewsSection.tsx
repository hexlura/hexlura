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
                <span key={s} style={{ fontSize: size, color: s <= Math.round(rating) ? '#F5A623' : '#C0C0C8', lineHeight: 1 }}>★</span>
            ))}
        </span>
    );
}

export default function ReviewsSection({ organiserId, reviews: initialReviews, averageRating, reviewCount, canReview, hasReviewed, isLoggedIn }: ReviewsSectionProps) {
    const [submitted, setSubmitted] = useState(false);

    return (
        <div>
            <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '24px', color: '#0A0A0F', marginBottom: '24px', letterSpacing: '1px' }}>
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
                        <p style={{ fontSize: '13px', color: '#666677', marginTop: '4px' }}>({reviewCount} review{reviewCount !== 1 ? 's' : ''})</p>
                    </div>
                </div>
            )}

            {/* Review form or status message */}
            <div style={{ marginBottom: '32px' }}>
                {!isLoggedIn ? (
                    <p style={{ fontSize: '13px', color: '#666677' }}>Only verified attendees can leave reviews.</p>
                ) : !canReview ? (
                    <p style={{ fontSize: '13px', color: '#666677' }}>Only verified attendees can leave reviews.</p>
                ) : hasReviewed || submitted ? (
                    <p style={{ fontSize: '13px', color: '#00C48A' }}>You have already reviewed this organiser.</p>
                ) : (
                    <ReviewForm organiserId={organiserId} onSubmitted={() => setSubmitted(true)} />
                )}
            </div>

            {/* Reviews list */}
            {initialReviews.length > 0 ? (
                <div>
                    {initialReviews.map((review) => (
                        <div key={review.id} style={{ background: '#FFFFFF', border: '1px solid #C0C0C8', padding: '16px', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#0A0A0F' }}>
                                        {review.user?.full_name || 'Anonymous'}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#00C48A', border: '1px solid rgba(0,196,138,0.3)', padding: '1px 6px', borderRadius: '2px' }}>
                                        Verified Attendee
                                    </span>
                                </div>
                                <span style={{ fontSize: '11px', color: '#666677' }}>
                                    {new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <Stars rating={review.rating ?? 0} size={14} />
                            <p style={{ fontSize: '14px', color: '#666677', lineHeight: 1.7, marginTop: '8px' }}>
                                {review.comment}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed #C0C0C8' }}>
                    <p style={{ color: '#666677', fontSize: '14px' }}>No reviews yet. Be the first to share your experience!</p>
                </div>
            )}
        </div>
    );
}
