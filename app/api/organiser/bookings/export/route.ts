import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveManagingOrganiserId } from '@/lib/organiser-access'

// CSV export of the caller's own bookings (optionally for one event).
// Ticket amounts only — platform fees and buyer gross totals are never exposed to organisers.

const PAGE_SIZE = 1000
const MAX_ROWS = 10000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Quote every cell; neutralise spreadsheet formulas (=, +, -, @, tab, CR) by prefixing an apostrophe
function cell(value: string | number | null | undefined): string {
    let s = value === null || value === undefined ? '' : String(value)
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
    return `"${s.replace(/"/g, '""')}"`
}

export async function GET(req: NextRequest) {
    // 1. Auth
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 2. Authorization — owner or non-door-staff team member
    let organiserId: string | null
    try {
        organiserId = await resolveManagingOrganiserId(user.id)
    } catch (e) {
        console.error('[bookings export] access lookup failed:', e)
        return NextResponse.json({ error: 'Export failed.' }, { status: 500 })
    }
    if (!organiserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // 3. Input validation — optional event id must be a UUID that belongs to this organiser
    const requestedEvent = req.nextUrl.searchParams.get('event')
    if (requestedEvent && !UUID_RE.test(requestedEvent)) {
        return NextResponse.json({ error: 'Invalid event.' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { data: events, error: eventsErr } = await adminClient
        .from('events')
        .select('id, title')
        .eq('organiser_id', organiserId)
    if (eventsErr) return NextResponse.json({ error: 'Export failed.' }, { status: 500 })

    const titleById = new Map((events || []).map(e => [e.id as string, e.title as string]))
    if (requestedEvent && !titleById.has(requestedEvent)) {
        return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
    }
    const scopeIds = requestedEvent ? [requestedEvent] : Array.from(titleById.keys())

    type Row = {
        booking_ref: string
        status: string
        is_complimentary: boolean | null
        ticket_subtotal_pence: number | null
        created_at: string
        event_id: string
        booking_items: { quantity: number; attendee_name: string | null }[]
    }

    const rows: Row[] = []
    if (scopeIds.length > 0) {
        for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
            const { data, error } = await adminClient
                .from('bookings')
                .select('booking_ref, status, is_complimentary, ticket_subtotal_pence, created_at, event_id, booking_items(quantity, attendee_name)')
                .in('event_id', scopeIds)
                .order('created_at', { ascending: false })
                .range(from, from + PAGE_SIZE - 1)
            if (error) return NextResponse.json({ error: 'Export failed.' }, { status: 500 })
            rows.push(...((data || []) as unknown as Row[]))
            if (!data || data.length < PAGE_SIZE) break
        }
    }

    const header = ['Booking Ref', 'Buyer', 'Event', 'Status', 'Tickets', 'Amount (GBP)', 'Complimentary', 'Date']
    const lines = [header.map(cell).join(',')]
    for (const b of rows) {
        const qty = b.booking_items.reduce((s, i) => s + i.quantity, 0)
        const buyer = b.booking_items.find(i => i.attendee_name)?.attendee_name || 'Guest'
        lines.push([
            b.booking_ref,
            buyer,
            titleById.get(b.event_id) || '',
            b.status,
            qty,
            ((b.ticket_subtotal_pence || 0) / 100).toFixed(2),
            b.is_complimentary ? 'Yes' : 'No',
            new Date(b.created_at).toISOString(),
        ].map(cell).join(','))
    }

    const day = new Date().toISOString().slice(0, 10)
    return new NextResponse('﻿' + lines.join('\r\n'), {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="bookings-${day}.csv"`,
            'Cache-Control': 'no-store',
        },
    })
}
