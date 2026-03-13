import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrganiserSidebar } from '@/components/layout/OrganiserSidebar'

export default async function OrganiserLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/auth/login')

    const [profileRes, organiserRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.from('organiser_profiles').select('org_name, is_approved').eq('user_id', user.id).single(),
    ])

    // Redirect to pending if organiser account not yet approved
    if (!organiserRes.data?.is_approved) {
        redirect('/organiser/pending')
    }

    const userName = profileRes.data?.full_name || 'Organiser'
    const orgName = organiserRes.data?.org_name || ''

    return (
        <div className="flex min-h-screen bg-background">
            <OrganiserSidebar userName={userName} orgName={orgName} />
            <main className="flex-1 min-h-screen p-8" style={{ marginLeft: '220px' }}>
                {children}
            </main>
        </div>
    )
}
