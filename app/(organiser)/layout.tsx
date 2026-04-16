import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { OrganiserSidebar } from '@/components/layout/OrganiserSidebar'

async function getUserTeamAccess(userId: string) {
    const serviceClient = createServiceClient()
    const { data } = await serviceClient
        .from('organiser_team')
        .select('privilege, organiser:organiser_profiles!organiser_id(org_name)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)
    const row = Array.isArray(data) ? data[0] : null
    return row as { privilege: string; organiser: { org_name: string } | null } | null
}

export default async function OrganiserLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/auth/login')

    const serviceClient = createServiceClient()
    const [profileRes, organiserRes] = await Promise.all([
        serviceClient.from('profiles').select('full_name, role').eq('id', user.id).single(),
        serviceClient.from('organiser_profiles').select('org_name, is_approved').eq('user_id', user.id).maybeSingle(),
    ])

    const role = profileRes.data?.role || 'user'

    const userName = profileRes.data?.full_name || 'Organiser'
    let orgName = organiserRes.data?.org_name || ''

    if (role === 'organiser' || role === 'admin') {
        // Redirect unapproved organisers to pending (admins bypass this)
        if (role === 'organiser' && !organiserRes.data?.is_approved) {
            redirect('/organiser/pending')
        }
    } else {
        // Check organiser_team membership for non-organiser users
        const teamAccess = await getUserTeamAccess(user.id)
        if (!teamAccess || teamAccess.privilege !== 'door_staff') redirect('/')
        redirect('/checkin')
    }

    return (
        <div className="flex min-h-screen bg-background">
            <OrganiserSidebar userName={userName} orgName={orgName} />
            <main className="flex-1 min-h-screen px-8 pb-8 pt-14 lg:pt-8 lg:ml-[220px]">
                {children}
            </main>
        </div>
    )
}
