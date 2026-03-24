import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { organiser_id, rating, comment } = await req.json();

    if (!organiser_id || !rating || !comment) {
        return NextResponse.json({ error: 'organiser_id, rating, and comment are required' }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }
    if (comment.length < 10) {
        return NextResponse.json({ error: 'Comment must be at least 10 characters' }, { status: 400 });
    }

    // Find a confirmed booking for this organiser's events
    const { data: booking } = await supabase
        .from('bookings')
        .select('id, event_id, events!inner(organiser_id)')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .eq('events.organiser_id', organiser_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (!booking) {
        return NextResponse.json({ error: 'You must have a confirmed booking for this organiser\'s event to leave a review' }, { status: 403 });
    }

    // Check if already reviewed
    const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', booking.event_id)
        .single();

    if (existingReview) {
        return NextResponse.json({ error: 'You have already reviewed this organiser' }, { status: 409 });
    }

    const { error } = await supabase.from('reviews').insert({
        event_id: booking.event_id,
        user_id: user.id,
        rating,
        comment,
        is_visible: true,
    });

    if (error) {
        return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
