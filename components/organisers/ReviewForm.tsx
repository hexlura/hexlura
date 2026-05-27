'use client';

import { useState } from 'react';

interface ReviewFormProps {
    organiserId: string;
    onSubmitted: () => void;
}

export default function ReviewForm({ organiserId, onSubmitted }: ReviewFormProps) {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (rating === 0) { setError('Please select a star rating.'); return; }
        if (comment.length < 10) { setError('Comment must be at least 10 characters.'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organiser_id: organiserId, rating, comment }),
            });
            const data = await res.json();
            if (res.ok) {
                onSubmitted();
            } else {
                setError(data.error || 'Failed to submit review.');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        }
        setLoading(false);
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHover(star)}
                        onMouseLeave={() => setHover(0)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '24px',
                            color: star <= (hover || rating) ? '#F5A623' : '#C0C0C8',
                            padding: '0 2px',
                            lineHeight: 1,
                        }}
                    >
                        ★
                    </button>
                ))}
            </div>
            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                rows={4}
                style={{
                    background: '#FFFFFF',
                    border: '1px solid #C0C0C8',
                    color: '#0A0A0F',
                    padding: '12px',
                    borderRadius: '2px',
                    minHeight: '80px',
                    fontSize: '14px',
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit',
                }}
            />
            {error && <p style={{ fontSize: '13px', color: '#E63950', margin: 0 }}>{error}</p>}
            <button
                type="submit"
                disabled={loading}
                style={{
                    alignSelf: 'flex-start',
                    padding: '8px 20px',
                    fontSize: '13px',
                    borderRadius: '2px',
                    border: '1px solid #0A0A0F',
                    background: loading ? '#C0C0C8' : '#0A0A0F',
                    color: '#FFFFFF',
                    cursor: loading ? 'default' : 'pointer',
                    fontWeight: 600,
                }}
            >
                {loading ? 'Submitting...' : 'Submit Review'}
            </button>
        </form>
    );
}
