import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
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

    // Use service role client to bypass RLS — anon client may fail to read
    // profiles in layout context due to RLS policy evaluation
    const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    )

    const { data: profile, error: profileError } = await serviceClient
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', user.id)
        .single()

    if (profileError) {
        console.error('[AdminLayout] profile fetch failed:', profileError.message, profileError)
    }

    if (!profile || profile.role !== 'admin') {
        console.error('[AdminLayout] access denied — user:', user.id, 'role:', profile?.role ?? 'null')
        redirect('/')
    }

    const { count: pendingCount } = await serviceClient
        .from('organiser_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_approved', false)

    const cookieStore = cookies()
    const impersonatingId = cookieStore.get('hexlura_impersonating')?.value ?? null

    let impersonatedName: string | null = null
    if (impersonatingId) {
        const { data: imp } = await serviceClient
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
                className="flex-1 overflow-auto px-8 pb-8 pt-14 lg:pt-8 lg:ml-[240px]"
                style={impersonatedName ? { paddingTop: '56px' } : undefined}
            >
                {children}
            </main>
        </div>
    )
}
