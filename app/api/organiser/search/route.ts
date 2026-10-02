import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Global search for the organiser top bar: the caller's OWN events, bookings and
// attendees only. Every query is scoped to the caller's organiser_id.

const MIN_QUERY = 2
const MAX_QUERY = 60
const PER_GROUP = 5
const CHUNK = 100 // keeps `.in()` URLs short for organisers with many events/bookings

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
}

export async function GET(req: NextRequest) {
    // 1. Auth
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 2. Input validation — length bounds, then escape LIKE wildcards so the term is matched literally
    const raw = (req.nextUrl.searchParams.get('q') ?? '').trim()
    if (raw.length < MIN_QUERY || raw.length > MAX_QUERY) {
        return NextResponse.json({ events: [], bookings: [], attendees: [] })
    }
    const pattern = `%${raw.replace(/[\\%_]/g, m => '\\' + m)}%`

    const adminClient = createAdminClient()

    // 3. Authorization — account owner, or an active team member who is not door-staff-only
    let organiserId: string | null = null
    const { data: owned, error: ownedErr } = await adminClient
        .from('organiser_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
    if (ownedErr) return NextResponse.json({ error: 'Search failed.' }, { status: 500 })
    if (owned) {
        organiserId = owned.id
    } else {
        const { data: team, error: teamErr } = await adminClient
            .from('organiser_team')
            .select('organiser_id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .neq('privilege', 'door_staff')
            .limit(1)
        if (teamErr) return NextResponse.json({ error: 'Search failed.' }, { status: 500 })
        organiserId = team?.[0]?.organiser_id ?? null
    }
    if (!organiserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Events (scope for everything else)
    const { data: allEvents, error: eventsErr } = await adminClient
        .from('events')
        .select('id, title, start_at')
        .eq('organiser_id', organiserId)
    if (eventsErr) return NextResponse.json({ error: 'Search failed.' }, { status: 500 })

    const eventTitle = new Map((allEvents || []).map(e => [e.id, e.title as string]))
    const needle = raw.toLowerCase()
    const events = (allEvents || [])
        .filter(e => (e.title || '').toLowerCase().includes(needle))
        .sort((a, b) => b.start_at.localeCompare(a.start_at))
        .slice(0, PER_GROUP)
        .map(e => ({ id: e.id as string, title: e.title as string, start_at: e.start_at as string }))

    const eventIds = (allEvents || []).map(e => e.id as string)

    // Bookings by reference + the organiser's confirmed bookings (for the attendee lookup)
    const bookings: { ref: string; eventTitle: string }[] = []
    const bookingRef = new Map<string, { ref: string; eventId: string }>()
    for (const ids of chunk(eventIds, CHUNK)) {
        const { data, error } = await adminClient
            .from('bookings')
            .select('id, booking_ref, event_id, status')
            .in('event_id', ids)
        if (error) return NextResponse.json({ error: 'Search failed.' }, { status: 500 })
        for (const b of data || []) {
            if (b.status === 'confirmed') bookingRef.set(b.id, { ref: b.booking_ref, eventId: b.event_id })
            if (
                bookings.length < PER_GROUP &&
                (b.booking_ref || '').toLowerCase().includes(needle)
            ) {
                bookings.push({ ref: b.booking_ref, eventTitle: eventTitle.get(b.event_id) || '' })
            }
        }
    }

    // Attendees by name or email, restricted to the organiser's own bookings
    const attendees: { name: string; email: string; ref: string; eventTitle: string }[] = []
    const seen = new Set<string>()
    const bookingIds = Array.from(bookingRef.keys())
    outer: for (const ids of chunk(bookingIds, CHUNK)) {
        for (const column of ['attendee_name', 'attendee_email'] as const) {
            const { data, error } = await adminClient
                .from('booking_items')
                .select('id, booking_id, attendee_name, attendee_email')
                .in('booking_id', ids)
                .ilike(column, pattern)
                .limit(PER_GROUP)
            if (error) return NextResponse.json({ error: 'Search failed.' }, { status: 500 })
            for (const it of data || []) {
                if (seen.has(it.id)) continue
                const b = bookingRef.get(it.booking_id)
                if (!b) continue
                seen.add(it.id)
                attendees.push({
                    name: it.attendee_name || 'Guest',
                    email: it.attendee_email || '',
                    ref: b.ref,
                    eventTitle: eventTitle.get(b.eventId) || '',
                })
                if (attendees.length >= PER_GROUP) break outer
            }
        }
    }

    return NextResponse.json({ events, bookings, attendees })
}
