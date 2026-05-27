import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolvePromoterId } from '@/lib/promoter-access'
import { SettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

export default async function PromoterSettingsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/promoter/settings')

    const promoterId = await resolvePromoterId(user.id)
    if (!promoterId) redirect('/promoter/apply')

    const serviceClient = createServiceClient()
    const { data: profile } = await serviceClient
        .from('promoter_profiles')
        .select('display_name, referral_code, bio, payout_method, bank_account_name, bank_account_number, bank_sort_code')
        .eq('id', promoterId)
        .single()

    if (!profile) redirect('/promoter/apply')

    return (
        <SettingsClient
            initial={{
                displayName: profile.display_name,
                referralCode: profile.referral_code,
                bio: profile.bio || '',
                payoutMethod: profile.payout_method || '',
                bankAccountName: profile.bank_account_name || '',
                bankAccountNumber: profile.bank_account_number || '',
                bankSortCode: profile.bank_sort_code || '',
            }}
        />
    )
}
