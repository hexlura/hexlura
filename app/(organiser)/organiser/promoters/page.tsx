import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveOrganiserId } from '@/lib/organiser-access'
import { PromotersClient } from './promoters-client'

export const dynamic = 'force-dynamic'

export default async function OrganiserPromotersPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/organiser/promoters')

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) redirect('/organiser/pending')

    const serviceClient = createServiceClient()

    // Fetch all assignments for this org's events
    const { data: assignmentsRaw } = await serviceClient
        .from('promoter_event_assignments')
        .select(`
            id, status, commission_percent, invited_email, created_at, accepted_at,
            event:events(id, title, slug),
            promoter:promoter_profiles(id, display_name, referral_code, user_id)
        `)
        .eq('organiser_id', organiserId)
        .not('status', 'in', '(removed,declined)')
        .order('created_at', { ascending: false })

    type AssignmentRow = {
        id: string
        status: string
        commission_percent: number
        invited_email: string | null
        created_at: string
        accepted_at: string | null
        event: { id: string; title: string; slug: string } | null
        promoter: { id: string; display_name: string; referral_code: string; user_id: string } | null
    }
    const assignments = (assignmentsRaw || []) as unknown as AssignmentRow[]

    // Pull buyer profile emails for promoters in one batch
    const promoterUserIds = Array.from(new Set(assignments.map(a => a.promoter?.user_id).filter((x): x is string => !!x)))
    const promoterEmailMap: Record<string, string | null> = {}
    if (promoterUserIds.length > 0) {
        const { data: profiles } = await serviceClient
            .from('profiles')
            .select('id, email')
            .in('id', promoterUserIds)
        for (const p of profiles || []) promoterEmailMap[p.id] = p.email
    }

    // Aggregate clicks/sales/earnings per promoter for THIS organiser's events
    const ownEventIds = Array.from(new Set(assignments.map(a => a.event?.id).filter((x): x is string => !!x)))
    const activePromoterIds = Array.from(new Set(
        assignments.filter(a => a.status === 'active' && a.promoter).map(a => a.promoter!.id)
    ))

    const [clicksRes, earningsRes, paidEarningsRes, allOrgEarningsRes] = await Promise.all([
        ownEventIds.length === 0
            ? Promise.resolve({ data: [] as { promoter_id: string; event_id: string | null }[] })
            : serviceClient
                .from('promoter_link_clicks')
                .select('promoter_id, event_id')
                .in('event_id', ownEventIds)
                .in('promoter_id', activePromoterIds.length === 0 ? ['00000000-0000-0000-0000-000000000000'] : activePromoterIds),
        activePromoterIds.length === 0
            ? Promise.resolve({ data: [] as { promoter_id: string; event_id: string; commission_pence: number; status: string }[] })
            : serviceClient
                .from('promoter_earnings')
                .select('promoter_id, event_id, commission_pence, status')
                .eq('organiser_id', organiserId)
                .in('promoter_id', activePromoterIds),
        // Total commission paid out from this org overall
        serviceClient
            .from('promoter_earnings')
            .select('commission_pence')
            .eq('organiser_id', organiserId)
            .eq('status', 'paid'),
        // Total pending (pending + available, not yet paid)
        serviceClient
            .from('promoter_earnings')
            .select('commission_pence, status')
            .eq('organiser_id', organiserId),
    ])

    const clicksByPromoterEvent: Record<string, number> = {}
    for (const c of clicksRes.data || []) {
        const key = `${c.promoter_id}|${c.event_id || ''}`
        clicksByPromoterEvent[key] = (clicksByPromoterEvent[key] || 0) + 1
    }
    const salesByPromoterEvent: Record<string, { count: number; earnedPence: number }> = {}
    for (const e of earningsRes.data || []) {
        if (e.status === 'reversed') continue
        const key = `${e.promoter_id}|${e.event_id}`
        if (!salesByPromoterEvent[key]) salesByPromoterEvent[key] = { count: 0, earnedPence: 0 }
        salesByPromoterEvent[key].count += 1
        salesByPromoterEvent[key].earnedPence += e.commission_pence || 0
    }

    // Org-wide rollups
    const totalPaidPence = (paidEarningsRes.data || []).reduce((s, e) => s + (e.commission_pence || 0), 0)
    type EarningStatusRow = { commission_pence: number; status: string }
    const allOrgEarnings = (allOrgEarningsRes.data || []) as EarningStatusRow[]
    const totalPendingPence = allOrgEarnings
        .filter(e => e.status === 'pending' || e.status === 'available')
        .reduce((s, e) => s + (e.commission_pence || 0), 0)
    const ticketsViaPromoters = allOrgEarnings.filter(e => e.status !== 'reversed').length

    const items = assignments.map(a => ({
        id: a.id,
        status: a.status as 'invited' | 'active' | 'requested',
        commissionPercent: a.commission_percent,
        invitedEmail: a.invited_email,
        event: a.event,
        promoter: a.promoter ? {
            id: a.promoter.id,
            displayName: a.promoter.display_name,
            referralCode: a.promoter.referral_code,
            email: promoterEmailMap[a.promoter.user_id] || null,
        } : null,
        clicks: a.promoter && a.event ? (clicksByPromoterEvent[`${a.promoter.id}|${a.event.id}`] || 0) : 0,
        sales: a.promoter && a.event ? (salesByPromoterEvent[`${a.promoter.id}|${a.event.id}`]?.count || 0) : 0,
        earnedPence: a.promoter && a.event ? (salesByPromoterEvent[`${a.promoter.id}|${a.event.id}`]?.earnedPence || 0) : 0,
    }))

    const activePromotersCount = activePromoterIds.length

    // Events list for the invite form (this organiser's published events)
    const { data: eventsForInvite } = await serviceClient
        .from('events')
        .select('id, title, start_at')
        .eq('organiser_id', organiserId)
        .in('status', ['published', 'draft'])
        .order('start_at', { ascending: false })
        .limit(50)

    return (
        <PromotersClient
            kpis={{
                activePromoters: activePromotersCount,
                ticketsViaPromoters,
                commissionPaidPence: totalPaidPence,
                commissionPendingPence: totalPendingPence,
            }}
            items={items}
            events={(eventsForInvite || []) as { id: string; title: string; start_at: string }[]}
        />
    )
}
