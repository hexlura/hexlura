import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { AcceptClient } from './accept-client'
import { FocusShell } from '@/components/layout/FocusShell'

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
        <FocusShell>
            <div className="w-full max-w-md bg-card rounded-3xl border border-border shadow-card p-8 md:p-10">
                <div className="w-12 h-12 rounded-2xl bg-warm-red/10 flex items-center justify-center mb-4">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E63950" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
                </div>
                <h1 className="font-heading text-4xl tracking-wide mb-2">PROMOTER INVITATION</h1>

                {!a && (
                    <p className="text-sm font-semibold text-accent mt-4">This invitation link is invalid or has expired.</p>
                )}

                {a && a.status === 'removed' && (
                    <p className="text-sm font-semibold text-accent mt-4">This invitation has been withdrawn by the organiser.</p>
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
        </FocusShell>
    )
}
