import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// Returns the organiser behind one of the caller's own bookings, plus whether
// the caller already follows them. Used by the post-checkout follow prompt.
// organiser_profiles has no public RLS read policy, so the lookup runs
// server-side with the service client after the booking ownership check.
export async function GET(_req: NextRequest, { params }: { params: { ref: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // RLS restricts bookings to the caller's own rows; the explicit user_id
    // check below is defence in depth.
    const { data: booking } = await supabase
        .from('bookings')
        .select('user_id, event:events(organiser_id)')
        .eq('booking_ref', params.ref)
        .single()

    const organiserId = (booking?.event as { organiser_id?: string } | null)?.organiser_id
    if (!booking || booking.user_id !== user.id || !organiserId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const serviceClient = createServiceClient()
    const { data: organiser } = await serviceClient
        .from('organiser_profiles')
        .select('id, org_name, slug, logo_url')
        .eq('id', organiserId)
        .single()
    if (!organiser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: existingFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('user_id', user.id)
        .eq('organiser_id', organiser.id)
        .maybeSingle()

    return NextResponse.json({
        organiser_id: organiser.id,
        org_name: organiser.org_name,
        slug: organiser.slug,
        logo_url: organiser.logo_url,
        following: !!existingFollow,
    })
}
