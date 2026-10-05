import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { AdminTopBar } from '@/components/layout/AdminTopBar'
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
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

    // Open support tickets awaiting admin reply (user replied last and ticket
    // is still active). Cleaner signal than just status='open'.
    const { count: openSupportCount } = await serviceClient
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('last_reply_by_admin', false)
        .not('status', 'in', '(resolved,closed)')

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

    const adminName = profile.full_name ?? 'Admin'

    return (
        <div className="warm-theme flex min-h-screen">
            {impersonatedName && <ImpersonationBanner impersonatedName={impersonatedName} />}
            <AdminSidebar
                adminName={adminName}
                userId={user.id}
                pendingOrganisers={pendingCount ?? 0}
                openSupportTickets={openSupportCount ?? 0}
            />
            <main
                className="flex-1 min-w-0 overflow-auto pb-24 lg:pb-0 lg:ml-64"
                style={impersonatedName ? { paddingTop: '40px' } : undefined}
            >
                <AdminTopBar userId={user.id} />
                <div className="px-5 sm:px-8 lg:px-10 pt-14 lg:pt-10 lg:pb-10">
                    {children}
                </div>
            </main>
            <MobileBottomNav role="admin" />
        </div>
    )
}
