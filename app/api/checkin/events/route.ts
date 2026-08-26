import { NextResponse, NextRequest } from 'next/server'
import { getRequestUser } from '@/lib/supabase/getRequestUser'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveDoorStaffContext } from '@/lib/checkin/authorize'

/**
 * JSON equivalent of app/checkin/page.tsx (the web door-staff landing page),
 * for the mobile app's event-select screen.
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getRequestUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const ctx = await resolveDoorStaffContext(user.id)
        if (!ctx.isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const adminClient = createAdminClient()

        if (ctx.isAdmin) {
            // Admins aren't scoped to an organiser_id — no door-staff use case for
            // platform-wide event scanning today, mirrors the web page's behaviour.
            return NextResponse.json({ events: [] })
        }

        if (ctx.organiserIds.length === 0) {
            return NextResponse.json({ events: [] })
        }

        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { data, error } = await adminClient
            .from('events')
            .select('id, title, start_at, end_at, venue_name, checkin_start_at, checkin_end_at')
            .in('organiser_id', ctx.organiserIds)
            .eq('status', 'published')
            .gte('start_at', cutoff)
            .order('start_at')

        if (error) {
            return NextResponse.json({ error: 'Failed to load events' }, { status: 500 })
        }

        return NextResponse.json({ events: data ?? [] })
    } catch (err) {
        console.error('Checkin events error:', err)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
