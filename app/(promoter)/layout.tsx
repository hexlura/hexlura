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
        <div className="flex min-h-screen bg-background">
            <PromoterSidebar userName={userName} referralCode={referralCode} userId={user.id} />
            <main className="flex-1 min-h-screen px-4 sm:px-8 pb-8 pt-14 lg:pt-8 lg:ml-[220px]">
                {isSuspended && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <p style={{ color: '#DC2626', fontSize: 14, margin: 0 }}>
                            Your promoter account has been suspended. You can view your data but cannot make changes or request payouts. Contact <a href="mailto:support@hexlura.com" style={{ textDecoration: 'underline' }}>support@hexlura.com</a> for help.
                        </p>
                    </div>
                )}
                {children}
            </main>
            <MobileBottomNav role="promoter" />
        </div>
    )
}
