import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolvePromoterId } from '@/lib/promoter-access'
import { markEarningsAvailable } from '@/lib/promoter-earnings'
import { PayoutsClient } from './payouts-client'

export const dynamic = 'force-dynamic'

export default async function PromoterPayoutsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/promoter/payouts')

    const promoterId = await resolvePromoterId(user.id)
    if (!promoterId) redirect('/promoter/apply')

    await markEarningsAvailable(promoterId)

    const serviceClient = createServiceClient()

    const [profileRes, earningsRes, payoutsRes] = await Promise.all([
        serviceClient.from('promoter_profiles').select('payout_method').eq('id', promoterId).single(),
        serviceClient.from('promoter_earnings').select('commission_pence, status, created_at').eq('promoter_id', promoterId),
        serviceClient.from('promoter_payouts').select('id, gross_pence, net_pence, status, requested_at, paid_at, created_at, payout_method, reference').eq('promoter_id', promoterId).order('created_at', { ascending: false }),
    ])

    type EarningRow = { commission_pence: number; status: string; created_at: string }
    const earnings = (earningsRes.data || []) as EarningRow[]

    const availablePence = earnings.filter(e => e.status === 'available').reduce((s, e) => s + (e.commission_pence || 0), 0)
    const totalEarnedPence = earnings.filter(e => ['available', 'paid'].includes(e.status)).reduce((s, e) => s + (e.commission_pence || 0), 0)
    const totalPaidPence = earnings.filter(e => e.status === 'paid').reduce((s, e) => s + (e.commission_pence || 0), 0)

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const monthStartISO = monthStart.toISOString()
    const thisMonthPence = earnings
        .filter(e => e.created_at >= monthStartISO && e.status !== 'reversed')
        .reduce((s, e) => s + (e.commission_pence || 0), 0)

    return (
        <PayoutsClient
            availablePence={availablePence}
            totalEarnedPence={totalEarnedPence}
            totalPaidPence={totalPaidPence}
            thisMonthPence={thisMonthPence}
            payoutMethod={profileRes.data?.payout_method || null}
            history={(payoutsRes.data || []) as unknown as PayoutHistoryRow[]}
        />
    )
}

type PayoutHistoryRow = {
    id: string
    gross_pence: number
    net_pence: number
    status: string
    requested_at: string | null
    paid_at: string | null
    created_at: string
    payout_method: string | null
    reference: string | null
}
