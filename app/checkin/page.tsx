export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

function formatTime(iso: string) {
    return new Intl.DateTimeFormat('en-GB', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Europe/London',
    }).format(new Date(iso))
}

function formatEventDate(iso: string) {
    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Europe/London',
    }).format(new Date(iso))
}

export default async function CheckinLandingPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/checkin')

    const serviceClient = createServiceClient()

    const { data: profile } = await serviceClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = profile?.role || 'user'

    // Support both legacy door_staff profile role and new organiser_team system
    let organiserIds: string[] = []

    // Organisers and admins access their own events directly — no door_staff lookup needed
    if (role === 'organiser' || role === 'admin') {
        const { data: orgProfile } = await serviceClient
            .from('organiser_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()
        if (orgProfile) {
            organiserIds = [orgProfile.id]
        }
    } else if (role === 'door_staff') {
        // Legacy: fetch from old door_staff assignments table
        const { data: assignments } = await serviceClient
            .from('door_staff')
            .select('organiser_id')
            .eq('user_id', user.id)
        organiserIds = assignments?.map((a: { organiser_id: string }) => a.organiser_id) ?? []
    } else {
        // New system: fetch organiser_ids from organiser_team
        const { data: teamRows } = await serviceClient
            .from('organiser_team')
            .select('organiser_id')
            .eq('user_id', user.id)
            .eq('privilege', 'door_staff')
            .eq('status', 'active')
        organiserIds = teamRows?.map((r: { organiser_id: string }) => r.organiser_id) ?? []

        // Not authorised in any system
        if (organiserIds.length === 0) redirect('/auth/login?next=/checkin')
    }

    type EventRow = {
        id: string
        title: string
        start_at: string
        end_at: string | null
        venue_name: string | null
        checkin_start_at: string | null
        checkin_end_at: string | null
    }

    let events: EventRow[] = []
    if (organiserIds.length > 0) {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { data } = await serviceClient
            .from('events')
            .select('id, title, start_at, end_at, venue_name, checkin_start_at, checkin_end_at')
            .in('organiser_id', organiserIds)
            .eq('status', 'published')
            .gte('start_at', cutoff)
            .order('start_at')
        events = (data as EventRow[]) ?? []
    }

    return (
        <div className="warm-theme min-h-screen">
            <header className="flex items-center justify-between px-5 py-4 max-w-md mx-auto">
                <Link href="/" className="font-heading text-3xl text-accent tracking-wider">
                    HEXLURA<sup className="text-[0.4em] align-super tracking-normal">®</sup>
                </Link>
                <Link href="/account" className="text-sm font-semibold text-muted hover:text-text">My account</Link>
            </header>
            <main className="px-5 pb-12 max-w-md mx-auto">
                <h1 className="font-heading text-4xl tracking-wide mt-2">SELECT EVENT</h1>
                <p className="text-sm text-muted mb-5">Choose the event you&apos;re working tonight.</p>

                {events.length === 0 ? (
                    <div className="bg-card rounded-2xl border border-dashed border-border py-12 px-6 text-center">
                        <p className="text-sm text-muted">No upcoming events yet. Your organiser hasn&apos;t published any events.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {events.map((event) => (
                            <div key={event.id} className="bg-card rounded-2xl border border-border shadow-card p-5">
                                <p className="text-lg font-bold leading-snug break-words">{event.title}</p>
                                <p className="text-sm text-muted mt-1 break-words">
                                    {formatEventDate(event.start_at)}
                                    {event.venue_name ? ` · ${event.venue_name}` : ''}
                                </p>
                                {(event.checkin_start_at || event.checkin_end_at) && (
                                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-warm-green bg-warm-green/10 rounded-full px-3 py-1 mt-3">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                                        Doors {event.checkin_start_at ? formatTime(event.checkin_start_at) : '—'} — {event.checkin_end_at ? formatTime(event.checkin_end_at) : '—'}
                                    </p>
                                )}
                                <Link
                                    href={`/organiser/events/${event.id}/checkin`}
                                    className="mt-4 w-full py-3.5 rounded-full bg-accent text-white font-semibold shadow-glow hover:brightness-110 transition flex items-center justify-center gap-2"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M7 12h10" /></svg>
                                    Start scanning
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
