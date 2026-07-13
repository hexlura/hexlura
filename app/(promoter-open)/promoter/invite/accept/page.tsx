import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { AcceptClient } from './accept-client'

export const dynamic = 'force-dynamic'

export default async function PromoterInviteAcceptPage({
    searchParams,
}: { searchParams: { token?: string } }) {
    const token = searchParams.token?.trim()
    if (!token) redirect('/')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect(`/auth/login?next=/promoter/invite/accept?token=${encodeURIComponent(token)}`)
    }

    const serviceClient = createServiceClient()

    const { data: assignment } = await serviceClient
        .from('promoter_event_assignments')
        .select(`
            id, status, commission_percent,
            event:events(title, start_at, venue_name),
            organiser:organiser_profiles(org_name)
        `)
        .eq('invite_token', token)
        .maybeSingle()

    type AssignmentRow = {
        id: string
        status: string
        commission_percent: number
        event: { title: string; start_at: string; venue_name: string | null } | null
        organiser: { org_name: string } | null
    } | null

    const a = assignment as unknown as AssignmentRow

    const { data: promoter } = await serviceClient
        .from('promoter_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

    return (
        <div className="min-h-screen bg-background">
            <header className="flex items-center justify-between px-6 py-4 border-b border-border">
                <a href="/" className="font-heading text-2xl text-accent tracking-widest">HEXLURA<sup className="text-[0.45em] align-super tracking-normal">®</sup></a>
            </header>

            <div className="flex items-center justify-center p-6 py-12">
                <div className="max-w-md w-full bg-card border border-border p-8">
                    <h1 className="font-heading text-3xl text-text tracking-wide mb-2">PROMOTER INVITATION</h1>

                    {!a && (
                        <p className="text-sm text-accent mt-4">This invitation link is invalid or has expired.</p>
                    )}

                    {a && a.status === 'removed' && (
                        <p className="text-sm text-accent mt-4">This invitation has been withdrawn by the organiser.</p>
                    )}

                    {a && a.status !== 'removed' && (
                        <AcceptClient
                            token={token}
                            isPromoter={!!promoter}
                            alreadyAccepted={a.status === 'active'}
                            orgName={a.organiser?.org_name || 'An organiser'}
                            eventName={a.event?.title || 'this event'}
                            eventDate={a.event?.start_at || ''}
                            commissionPercent={a.commission_percent}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
