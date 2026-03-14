import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner'
import { cookies } from 'next/headers'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') redirect('/')

    const { count: pendingCount } = await supabase
        .from('organiser_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_approved', false)

    const cookieStore = cookies()
    const impersonatingId = cookieStore.get('hexlura_impersonating')?.value ?? null

    let impersonatedName: string | null = null
    if (impersonatingId) {
        const { data: imp } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', impersonatingId)
            .single()
        impersonatedName = imp?.full_name ?? 'Unknown User'
    }

    return (
        <div className="flex min-h-screen" style={{ background: '#0A0A0F' }}>
            {impersonatedName && <ImpersonationBanner impersonatedName={impersonatedName} />}
            <AdminSidebar
                adminName={profile.full_name ?? 'Admin'}
                pendingOrganisers={pendingCount ?? 0}
            />
            <main
                className="flex-1 p-8 overflow-auto"
                style={{ marginLeft: '240px', paddingTop: impersonatedName ? '56px' : '32px' }}
            >
                {children}
            </main>
        </div>
    )
}
