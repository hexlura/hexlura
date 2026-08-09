import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PayoutsClient } from './payouts-client'
import { PromoterPayoutsSection, type PromoterPayoutRow } from './promoter-payouts-section'

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
        .select('id, gross_pence, net_pence, status, scheduled_at, requested_at, created_at, organiser_id, event_id, organiser_profiles(org_name, payout_method, identity_verified_at, profiles(full_name, email)), events(title, end_at, start_at)')
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
        organiser_profiles: { org_name: string; payout_method?: string; identity_verified_at: string | null; profiles: { full_name: string | null; email: string | null } | null } | null
        events: { title: string; end_at: string | null; start_at: string } | null
    }

    // Requested payouts are always due (organiser explicitly asked); pending
    // payouts need the cooldown check AND a verified organiser — an
    // unverified organiser's pending payout isn't actionable, so it
    // shouldn't show up as "due to process" here.
    const allDuePending = ((dueData || []) as unknown as PayoutWithRelated[]).filter(p => {
        if (p.status === 'requested') return true
        if (!p.organiser_profiles?.identity_verified_at) return false
        const endDate = p.events?.end_at || p.events?.start_at
        if (!endDate) return false
        return new Date(endDate) < cooldownCutoff
    })

    const page = Math.max(1, parseInt(searchParams.page ?? '1'))
    const pageSize = 25
    const offset = (page - 1) * pageSize

    // Pending payouts for an unverified organiser aren't actionable yet (they
    // can't be requested or processed without an override) — hide them from
    // the main table until the organiser verifies, so it doesn't read as
    // "ready to pay" when it isn't. PostgREST can't express "OR across an
    // embedded table" in a single filtered/paginated query, and payouts is a
    // small table (dozens of rows at most), so this filters and paginates in
    // JS instead of at the DB level.
    let query = adminClient
        .from('payouts')
        .select('id, gross_pence, net_pence, fee_pence, status, scheduled_at, requested_at, paid_at, stripe_transfer_id, reference, created_at, organiser_id, event_id, organiser_profiles(org_name, payout_method, bank_account_name, bank_sort_code, bank_account_number, stripe_account_id, identity_status, identity_verified_at), events(title)')
        .order('created_at', { ascending: false })

    if (searchParams.status && searchParams.status !== 'all') {
        query = query.eq('status', searchParams.status)
    }

    const { data: allPayoutsUnfiltered } = await query
    const visiblePayouts = ((allPayoutsUnfiltered || []) as unknown as PayoutWithRelated[]).filter(p =>
        p.status !== 'pending' || !!p.organiser_profiles?.identity_verified_at
    )
    const count = visiblePayouts.length
    const allPayouts = visiblePayouts.slice(offset, offset + pageSize)

    // Promoter payouts (separate table)
    const { data: promoterPayoutsData } = await adminClient
        .from('promoter_payouts')
        .select('id, gross_pence, net_pence, status, requested_at, paid_at, created_at, payout_method, reference, promoter_profiles(id, display_name, referral_code, payout_method, bank_account_name, bank_sort_code, bank_account_number, stripe_account_id)')
        .order('created_at', { ascending: false })

    const allPromoterPayouts = (promoterPayoutsData || []) as unknown as PromoterPayoutRow[]
    const duePromoterPayouts = allPromoterPayouts.filter(p => p.status === 'pending' || p.status === 'requested')

    return (
        <>
            <PayoutsClient
                duePayouts={allDuePending}
                allPayouts={(allPayouts || []) as unknown as PayoutWithRelated[]}
                totalRows={count ?? 0}
                page={page}
                pageSize={pageSize}
            />
            <PromoterPayoutsSection
                duePayouts={duePromoterPayouts}
                allPayouts={allPromoterPayouts}
            />
        </>
    )
}
