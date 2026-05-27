import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PromoterSidebar } from '@/components/layout/PromoterSidebar'
import MobileBottomNav from '@/components/layout/MobileBottomNav'

export default async function PromoterLayout({ children }: { children: React.ReactNode }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/promoter')

    const serviceClient = createServiceClient()
    const [profileRes, promoterRes] = await Promise.all([
        serviceClient.from('profiles').select('full_name, role').eq('id', user.id).single(),
        serviceClient.from('promoter_profiles').select('display_name, referral_code').eq('user_id', user.id).maybeSingle(),
    ])

    const role = profileRes.data?.role
    if (!promoterRes.data && role !== 'admin') {
        redirect('/promoter/apply')
    }

    const userName = promoterRes.data?.display_name || profileRes.data?.full_name || 'Promoter'
    const referralCode = promoterRes.data?.referral_code || '—'

    return (
        <div className="flex min-h-screen bg-background">
            <PromoterSidebar userName={userName} referralCode={referralCode} userId={user.id} />
            <main className="flex-1 min-h-screen px-4 sm:px-8 pb-8 pt-14 lg:pt-8 lg:ml-[220px]">
                {children}
            </main>
            <MobileBottomNav role="promoter" />
        </div>
    )
}
