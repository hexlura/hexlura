import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { event_id } = await req.json();
    if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 });

    const { data: existing } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', event_id)
        .single();

    if (existing) {
        await supabase.from('likes').delete().eq('id', existing.id);
    } else {
        await supabase.from('likes').insert({ user_id: user.id, event_id });
    }

    const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event_id);

    return NextResponse.json({ liked: !existing, count: count ?? 0 });
}
