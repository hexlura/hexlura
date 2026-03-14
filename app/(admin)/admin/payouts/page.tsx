import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PayoutsClient } from './payouts-client'

export default async function AdminPayoutsPage({
    searchParams,
}: {
    searchParams: { status?: string; page?: string }
}) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    // Due payouts: pending AND event ended 2+ days ago
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const { data: dueData } = await supabase
        .from('payouts')
        .select('id, gross_pence, net_pence, status, scheduled_at, created_at, organiser_id, event_id, organiser_profiles(org_name, profiles(full_name, email)), events(title, end_at, start_at)')
        .eq('status', 'pending')

    type PayoutWithRelated = {
        id: string
        gross_pence: number | null
        net_pence: number | null
        status: string
        scheduled_at: string | null
        paid_at: string | null
        created_at: string
        organiser_id: string
        event_id: string | null
        stripe_transfer_id: string | null
        organiser_profiles: { org_name: string; profiles: { full_name: string | null; email: string | null } | null } | null
        events: { title: string; end_at: string | null; start_at: string } | null
    }

    const allDuePending = ((dueData || []) as unknown as PayoutWithRelated[]).filter(p => {
        const endDate = p.events?.end_at || p.events?.start_at
        if (!endDate) return false
        return new Date(endDate) < twoDaysAgo
    })

    const page = Math.max(1, parseInt(searchParams.page ?? '1'))
    const pageSize = 25
    const offset = (page - 1) * pageSize

    let query = supabase
        .from('payouts')
        .select('id, gross_pence, net_pence, fee_pence, status, scheduled_at, paid_at, stripe_transfer_id, created_at, organiser_id, event_id, organiser_profiles(org_name), events(title)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

    if (searchParams.status && searchParams.status !== 'all') {
        query = query.eq('status', searchParams.status)
    }

    const { data: allPayouts, count } = await query

    return (
        <PayoutsClient
            duePayouts={allDuePending}
            allPayouts={(allPayouts || []) as unknown as PayoutWithRelated[]}
            totalRows={count ?? 0}
            page={page}
            pageSize={pageSize}
        />
    )
}
