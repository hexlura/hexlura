import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CONTACT_TOPICS, type ContactTopic } from '@/lib/contact'

const VALID_TOPICS = CONTACT_TOPICS.map(t => t.value)

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    // Honeypot: real users never fill this hidden field, bots often do.
    // Named away from anything ("website"/"url"/"company") that browser
    // autofill heuristics associate with organization-contact forms —
    // that was previously autofilling this field and silently dropping
    // real submissions.
    if (typeof body.hxl_hp_field === 'string' && body.hxl_hp_field.trim().length > 0) {
        // Pretend success so bots don't learn the honeypot was tripped.
        return NextResponse.json({ ok: true }, { status: 201 })
    }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const organizationName = typeof body.organizationName === 'string' ? body.organizationName.trim() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 30) : ''
    const topic = typeof body.topic === 'string' ? body.topic : ''
    const eventDetails = typeof body.eventDetails === 'string' ? body.eventDetails.trim() : ''

    if (name.length < 2 || name.length > 120) {
        return NextResponse.json({ error: 'Name must be 2–120 characters' }, { status: 400 })
    }
    if (email.length < 5 || email.length > 254 || !isValidEmail(email)) {
        return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }
    if (organizationName.length < 1 || organizationName.length > 160) {
        return NextResponse.json({ error: 'Organization name must be 1–160 characters' }, { status: 400 })
    }
    if (!VALID_TOPICS.includes(topic as ContactTopic)) {
        return NextResponse.json({ error: 'Please select a valid topic' }, { status: 400 })
    }
    if (eventDetails.length < 10 || eventDetails.length > 2000) {
        return NextResponse.json({ error: 'Please share at least a few details (10–2000 characters)' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: enquiry, error: insertErr } = await adminClient
        .from('contact_enquiries')
        .insert({
            name,
            email,
            organization_name: organizationName,
            phone: phone || null,
            topic,
            event_details: eventDetails,
            page_path: typeof body.pagePath === 'string' ? body.pagePath.slice(0, 200) : null,
        })
        .select('id')
        .single()

    if (insertErr || !enquiry) {
        console.error('[api/contact] insert failed:', insertErr)
        return NextResponse.json({ error: 'Failed to send enquiry' }, { status: 500 })
    }

    const { data: admins } = await adminClient
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

    if (admins?.length) {
        await adminClient.from('notifications').insert(
            admins.map(a => ({
                user_id: a.id,
                type: 'contact_enquiry_created',
                title: 'New contact enquiry',
                body: `${name} — ${organizationName}`,
                link: null,
            })),
        )
    }

    return NextResponse.json({ ok: true }, { status: 201 })
}
