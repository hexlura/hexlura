import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolvePromoterId } from '@/lib/promoter-access'
import { LinksClient } from './links-client'

export const dynamic = 'force-dynamic'

export default async function PromoterLinksPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/promoter/links')

    const promoterId = await resolvePromoterId(user.id)
    if (!promoterId) redirect('/promoter/apply')

    const serviceClient = createServiceClient()

    const { data: profile } = await serviceClient
        .from('promoter_profiles')
        .select('referral_code')
        .eq('id', promoterId)
        .single()
    const referralCode = profile?.referral_code || ''

    // Active assignments only — hide invited/removed
    const { data: assignments } = await serviceClient
        .from('promoter_event_assignments')
        .select('id, commission_percent, status, event:events(id, title, slug, start_at, status)')
        .eq('promoter_id', promoterId)
        .eq('status', 'active')

    type Row = {
        id: string
        commission_percent: number
        status: string
        event: { id: string; title: string; slug: string; start_at: string; status: string } | null
    }
    const rows = (assignments || []) as unknown as Row[]
    const eventIds = rows.map(r => r.event?.id).filter((x): x is string => !!x)

    // Aggregate clicks/sales/earnings per event for this promoter in parallel
    const [clicksRes, earningsRes] = await Promise.all([
        eventIds.length === 0
            ? Promise.resolve({ data: [] as { event_id: string | null }[] })
            : serviceClient
                .from('promoter_link_clicks')
                .select('event_id')
                .eq('promoter_id', promoterId)
                .in('event_id', eventIds),
        eventIds.length === 0
            ? Promise.resolve({ data: [] as { event_id: string; commission_pence: number; status: string }[] })
            : serviceClient
                .from('promoter_earnings')
                .select('event_id, commission_pence, status')
                .eq('promoter_id', promoterId)
                .in('event_id', eventIds),
    ])

    const clicksByEvent: Record<string, number> = {}
    for (const c of clicksRes.data || []) {
        if (!c.event_id) continue
        clicksByEvent[c.event_id] = (clicksByEvent[c.event_id] || 0) + 1
    }
    const salesByEvent: Record<string, { count: number; earnedPence: number }> = {}
    for (const e of earningsRes.data || []) {
        if (e.status === 'reversed') continue
        if (!salesByEvent[e.event_id]) salesByEvent[e.event_id] = { count: 0, earnedPence: 0 }
        salesByEvent[e.event_id].count += 1
        salesByEvent[e.event_id].earnedPence += e.commission_pence || 0
    }

    const enriched = rows
        .filter(r => r.event)
        .map(r => ({
            assignmentId: r.id,
            commissionPercent: r.commission_percent,
            event: r.event!,
            clicks: clicksByEvent[r.event!.id] || 0,
            sales: salesByEvent[r.event!.id]?.count || 0,
            earnedPence: salesByEvent[r.event!.id]?.earnedPence || 0,
        }))

    return <LinksClient items={enriched} referralCode={referralCode} />
}
