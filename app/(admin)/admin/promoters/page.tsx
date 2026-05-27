import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PromotersClient } from './promoters-client'

export default async function AdminPromotersPage({
    searchParams,
}: {
    searchParams: { tab?: string }
}) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()

    const { data: promotersData, error } = await adminClient
        .from('promoter_profiles')
        .select(`
            id, display_name, referral_code, status, created_at, user_id, payout_method,
            profiles!promoter_profiles_user_id_fkey (full_name, email)
        `)
        .order('created_at', { ascending: false })

    if (error) console.error('Promoters query error:', error)

    type PromoterRow = {
        id: string
        display_name: string
        referral_code: string
        status: string
        created_at: string
        user_id: string
        payout_method: string | null
        profiles: { full_name: string | null; email: string | null } | null
        // computed
        lifetime_gross_pence: number
        available_pence: number
        paid_pence: number
        sales_count: number
    }

    const promoters = (promotersData || []) as unknown as Omit<PromoterRow, 'lifetime_gross_pence' | 'available_pence' | 'paid_pence' | 'sales_count'>[]
    const ids = promoters.map(p => p.id)

    // Aggregate earnings per promoter (best-effort; if zero promoters skip)
    const stats: Record<string, { lifetime: number; available: number; paid: number; sales: number }> = {}
    if (ids.length > 0) {
        const { data: earnings } = await adminClient
            .from('promoter_earnings')
            .select('promoter_id, commission_pence, status')
            .in('promoter_id', ids)

        for (const e of (earnings || []) as { promoter_id: string; commission_pence: number; status: string }[]) {
            if (!stats[e.promoter_id]) stats[e.promoter_id] = { lifetime: 0, available: 0, paid: 0, sales: 0 }
            const s = stats[e.promoter_id]
            if (e.status !== 'reversed') {
                s.lifetime += e.commission_pence || 0
                s.sales++
            }
            if (e.status === 'available') s.available += e.commission_pence || 0
            if (e.status === 'paid') s.paid += e.commission_pence || 0
        }
    }

    const enriched: PromoterRow[] = promoters.map(p => ({
        ...p,
        lifetime_gross_pence: stats[p.id]?.lifetime ?? 0,
        available_pence: stats[p.id]?.available ?? 0,
        paid_pence: stats[p.id]?.paid ?? 0,
        sales_count: stats[p.id]?.sales ?? 0,
    }))

    const active = enriched.filter(p => p.status === 'active')
    const suspended = enriched.filter(p => p.status === 'suspended')

    return (
        <PromotersClient
            active={active}
            suspended={suspended}
            defaultTab={(searchParams.tab as 'active' | 'suspended') ?? 'active'}
        />
    )
}
