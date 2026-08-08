import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'
import { ENQUIRY_PRIORITIES } from '@/lib/contact'

const VALID_PRIORITIES = ENQUIRY_PRIORITIES.map(p => p.value) as string[]
const MAX_SUMMARY_LENGTH = 5000

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const updates: Record<string, string | boolean | null> = {}

    if ('is_read' in body) {
        if (typeof body.is_read !== 'boolean') {
            return NextResponse.json({ error: 'is_read must be a boolean' }, { status: 400 })
        }
        updates.is_read = body.is_read
    }

    if ('is_connected' in body) {
        if (typeof body.is_connected !== 'boolean') {
            return NextResponse.json({ error: 'is_connected must be a boolean' }, { status: 400 })
        }
        updates.is_connected = body.is_connected
    }

    if ('is_converted' in body) {
        if (typeof body.is_converted !== 'boolean') {
            return NextResponse.json({ error: 'is_converted must be a boolean' }, { status: 400 })
        }
        updates.is_converted = body.is_converted
    }

    if ('priority' in body) {
        if (body.priority !== null && !VALID_PRIORITIES.includes(body.priority)) {
            return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
        }
        updates.priority = body.priority
    }

    if ('lead_summary' in body) {
        if (body.lead_summary !== null && typeof body.lead_summary !== 'string') {
            return NextResponse.json({ error: 'lead_summary must be a string or null' }, { status: 400 })
        }
        if (typeof body.lead_summary === 'string') {
            const trimmed = body.lead_summary.trim().slice(0, MAX_SUMMARY_LENGTH)
            updates.lead_summary = trimmed.length > 0 ? trimmed : null
        } else {
            updates.lead_summary = null
        }
    }

    if ('upcoming_schedule' in body) {
        if (body.upcoming_schedule !== null) {
            if (typeof body.upcoming_schedule !== 'string' || Number.isNaN(Date.parse(body.upcoming_schedule))) {
                return NextResponse.json({ error: 'upcoming_schedule must be a valid ISO date or null' }, { status: 400 })
            }
            updates.upcoming_schedule = new Date(body.upcoming_schedule).toISOString()
        } else {
            updates.upcoming_schedule = null
        }
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    const { data: enquiry, error } = await adminClient
        .from('contact_enquiries')
        .update(updates)
        .eq('id', params.id)
        .select('*')
        .single()

    if (error || !enquiry) {
        return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })
    }

    await logAuditAction({
        actorId: user.id,
        action: 'update_contact_enquiry',
        entityType: 'contact_enquiry',
        entityId: enquiry.id,
        metadata: updates,
    })

    return NextResponse.json({ enquiry })
}
