import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PromoterSidebar } from '@/components/layout/PromoterSidebar'
import { PromoterTopBar } from '@/components/layout/PromoterTopBar'
import MobileBottomNav from '@/components/layout/MobileBottomNav'

export default async function PromoterLayout({ children }: { children: React.ReactNode }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/promoter')

    const serviceClient = createServiceClient()
    const [profileRes, promoterRes] = await Promise.all([
        serviceClient.from('profiles').select('full_name, role').eq('id', user.id).single(),
        serviceClient.from('promoter_profiles').select('display_name, referral_code, status').eq('user_id', user.id).maybeSingle(),
    ])

    const role = profileRes.data?.role
    if (!promoterRes.data && role !== 'admin') {
        redirect('/promoter/apply')
    }

    const userName = promoterRes.data?.display_name || profileRes.data?.full_name || 'Promoter'
    const referralCode = promoterRes.data?.referral_code || '—'
    const isSuspended = promoterRes.data?.status === 'suspended'

    return (
        <div className="warm-theme flex min-h-screen">
            <PromoterSidebar userName={userName} referralCode={referralCode} userId={user.id} />
            <main className="flex-1 min-w-0 min-h-screen lg:ml-64">
                <PromoterTopBar userId={user.id} userName={userName} />
                <div className="px-4 sm:px-8 lg:px-10 pb-8 pt-14 lg:pt-8">
                    {isSuspended && (
                        <div className="bg-warm-red/10 border border-warm-red/30 rounded-2xl px-4 py-3 mb-6 flex items-start gap-3">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E63950" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            <p className="text-sm text-accent">
                                Your promoter account has been suspended. You can view your data but cannot make changes or request payouts. Contact{' '}
                                <a href="mailto:support@hexlura.com" className="underline font-semibold">support@hexlura.com</a> for help.
                            </p>
                        </div>
                    )}
                    {children}
                </div>
            </main>
            <MobileBottomNav role="promoter" />
        </div>
    )
}
