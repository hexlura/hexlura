import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getPromoterByReferralCode } from '@/lib/promoter-access'
import { getClientIp, hashVisitor, isBotUserAgent } from '@/lib/promoter-tracking'

export async function POST(request: NextRequest) {
    const userAgent = request.headers.get('user-agent') || ''
    if (isBotUserAgent(userAgent)) {
        // Don't count bot/prefetcher requests
        return NextResponse.json({ ok: true, skipped: 'bot' })
    }

    const body = await request.json().catch(() => ({})) as {
        ref?: string
        event_id?: string
        referrer?: string
    }
    const refCode = body.ref?.trim()
    const eventId = body.event_id?.trim()
    if (!refCode || !eventId) return NextResponse.json({ ok: false }, { status: 400 })

    const promoter = await getPromoterByReferralCode(refCode)
    if (!promoter) return NextResponse.json({ ok: false, skipped: 'unknown_code' })

    // Verify the promoter has an active assignment for this event (counts even if pending — they shared)
    const serviceClient = createServiceClient()
    const { data: assignment } = await serviceClient
        .from('promoter_event_assignments')
        .select('id')
        .eq('promoter_id', promoter.id)
        .eq('event_id', eventId)
        .eq('status', 'active')
        .maybeSingle()
    if (!assignment) return NextResponse.json({ ok: false, skipped: 'no_assignment' })

    const ip = getClientIp(request.headers)
    const visitorHash = hashVisitor(ip, userAgent)

    // Dedupe: count this visitor as unique only if no click in the last 24h for this (promoter, event, hash)
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { data: recent } = await serviceClient
        .from('promoter_link_clicks')
        .select('id')
        .eq('promoter_id', promoter.id)
        .eq('event_id', eventId)
        .eq('ip_hash', visitorHash)
        .gte('created_at', dayAgo)
        .maybeSingle()
    const isUnique = !recent

    await serviceClient.from('promoter_link_clicks').insert({
        promoter_id: promoter.id,
        event_id: eventId,
        ip_hash: visitorHash,
        user_agent: userAgent.slice(0, 200),
        referrer: body.referrer?.slice(0, 500) || null,
        is_unique: isUnique,
    })

    return NextResponse.json({ ok: true, unique: isUnique })
}
