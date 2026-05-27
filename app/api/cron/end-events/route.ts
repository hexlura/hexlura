import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Called by Vercel Cron every hour (see vercel.json).
// Marks any published event whose end_at has passed as 'ended'.
export async function GET(req: NextRequest) {
    const secret = req.headers.get('authorization')
    if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    const now = new Date().toISOString()

    const { data, error } = await supabase
        .from('events')
        .update({ status: 'ended' })
        .eq('status', 'published')
        .or(`end_at.lt.${now},and(end_at.is.null,start_at.lt.${now})`)
        .select('id, title, slug')

    if (error) {
        console.error('[cron/end-events] Supabase error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[cron/end-events] Marked ${data?.length ?? 0} event(s) as ended`)
    return NextResponse.json({ ended: data?.length ?? 0, events: data })
}
