import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveManagingOrganiserId } from '@/lib/organiser-access'

// Called by the event form right after a successful save/publish so the public pages that are cached
// for a few minutes (event page: 2 min, homepage: 5 min) show the organiser's change straight away
// instead of the old banner/title/details.
//
// Security: caller must be signed in, must manage an organiser account (owner or non-door-staff
// team member), and the event must belong to that organiser. Only fixed public paths for THAT
// event's own slug are revalidated, so it can't be used to purge arbitrary pages.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(_req: Request, { params }: { params: { id: string } }) {
    // 1. Auth
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 3. Input validation
    if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Invalid event' }, { status: 400 })

    // 2. Authorization — role AND ownership
    let organiserId: string | null
    try {
        organiserId = await resolveManagingOrganiserId(user.id)
    } catch (e) {
        console.error('[event revalidate] access lookup failed:', e)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
    if (!organiserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()
    const { data: event, error } = await adminClient
        .from('events')
        .select('id, slug, organiser_id')
        .eq('id', params.id)
        .maybeSingle()
    if (error) {
        console.error('[event revalidate] event lookup failed:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
    if (!event || event.organiser_id !== organiserId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    revalidatePath('/')
    revalidatePath('/events')
    if (event.slug) revalidatePath(`/events/${event.slug}`)

    return NextResponse.json({ revalidated: true })
}
