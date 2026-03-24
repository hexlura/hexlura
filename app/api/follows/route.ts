import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { organiser_id } = await req.json();
    if (!organiser_id) return NextResponse.json({ error: 'organiser_id required' }, { status: 400 });

    const { data: existing } = await supabase
        .from('follows')
        .select('id')
        .eq('user_id', user.id)
        .eq('organiser_id', organiser_id)
        .single();

    if (existing) {
        await supabase.from('follows').delete().eq('id', existing.id);
    } else {
        await supabase.from('follows').insert({ user_id: user.id, organiser_id });
    }

    const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('organiser_id', organiser_id);

    return NextResponse.json({ following: !existing, count: count ?? 0 });
}
