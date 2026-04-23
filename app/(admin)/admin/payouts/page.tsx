import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

    const adminClient = createAdminClient()

    // Read configurable cooldown period
    const { data: cooldownRow } = await adminClient
        .from('platform_settings')
        .select('value')
        .eq('key', 'payout_cooldown_days')
        .single()
    const cooldownDays = parseInt(cooldownRow?.value ?? '2', 10)

    // Due payouts: pending AND event ended cooldown+ days ago
    const cooldownCutoff = new Date()
    cooldownCutoff.setDate(cooldownCutoff.getDate() - cooldownDays)

    // Fetch pending payouts (auto-generated, cooldown passed) and requested payouts (organiser-requested)
    const { data: dueData } = await adminClient
        .from('payouts')
        .select('id, gross_pence, net_pence, status, scheduled_at, requested_at, created_at, organiser_id, event_id, organiser_profiles(org_name, payout_method, profiles(full_name, email)), events(title, end_at, start_at)')
        .in('status', ['pending', 'requested'])

    type PayoutWithRelated = {
        id: string
        gross_pence: number | null
        net_pence: number | null
        status: string
        scheduled_at: string | null
        requested_at: string | null
        paid_at: string | null
        created_at: string
        organiser_id: string
        event_id: string | null
        stripe_transfer_id: string | null
        organiser_profiles: { org_name: string; payout_method?: string; profiles: { full_name: string | null; email: string | null } | null } | null
        events: { title: string; end_at: string | null; start_at: string } | null
    }

    // Requested payouts are always due (organiser explicitly asked); pending payouts need cooldown check
    const allDuePending = ((dueData || []) as unknown as PayoutWithRelated[]).filter(p => {
        if (p.status === 'requested') return true
        const endDate = p.events?.end_at || p.events?.start_at
        if (!endDate) return false
        return new Date(endDate) < cooldownCutoff
    })

    const page = Math.max(1, parseInt(searchParams.page ?? '1'))
    const pageSize = 25
    const offset = (page - 1) * pageSize

    let query = adminClient
        .from('payouts')
        .select('id, gross_pence, net_pence, fee_pence, status, scheduled_at, requested_at, paid_at, stripe_transfer_id, created_at, organiser_id, event_id, organiser_profiles(org_name, payout_method, bank_account_name, bank_sort_code, bank_account_number, stripe_account_id), events(title)', { count: 'exact' })
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
