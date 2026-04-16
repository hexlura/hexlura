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
    if (!user) redirect('/checkin/login')

    const serviceClient = createServiceClient()

    const { data: profile } = await serviceClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = profile?.role || 'user'

    // Support both legacy door_staff profile role and new organiser_team system
    let organiserIds: string[] = []

    if (role === 'door_staff') {
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

        // Not a door_staff in either system
        if (organiserIds.length === 0) redirect('/checkin/login')
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
        <div style={{ background: '#0A0A0F', minHeight: '100vh', padding: '24px 16px' }}>
            <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                <p style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '32px',
                    color: '#F0F0F8',
                    marginBottom: '24px',
                    letterSpacing: '2px',
                }}>
                    SELECT EVENT
                </p>

                {events.length === 0 ? (
                    <p style={{ color: '#8888AA', fontSize: '14px', textAlign: 'center', marginTop: '48px' }}>
                        No upcoming events yet. Your organiser hasn&apos;t published any events.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {events.map((event) => (
                            <div key={event.id} style={{
                                background: '#1A1A24',
                                border: '1px solid #2A2A3A',
                                padding: '20px',
                                borderRadius: '0',
                            }}>
                                <p style={{ fontSize: '18px', color: '#F0F0F8', fontWeight: '600', margin: '0 0 4px 0', wordBreak: 'break-word' }}>
                                    {event.title}
                                </p>
                                <p style={{ fontSize: '13px', color: '#8888AA', margin: '0 0 8px 0', wordBreak: 'break-word' }}>
                                    {formatEventDate(event.start_at)}
                                    {event.venue_name ? ` · ${event.venue_name}` : ''}
                                </p>
                                {(event.checkin_start_at || event.checkin_end_at) && (
                                    <p style={{ fontSize: '12px', color: '#00E5A0', margin: '0 0 16px 0', flexShrink: 0 }}>
                                        Doors:{' '}
                                        {event.checkin_start_at ? formatTime(event.checkin_start_at) : '—'}
                                        {' — '}
                                        {event.checkin_end_at ? formatTime(event.checkin_end_at) : '—'}
                                    </p>
                                )}
                                <Link
                                    href={`/organiser/events/${event.id}/checkin`}
                                    style={{
                                        display: 'block',
                                        background: '#E63950',
                                        color: 'white',
                                        padding: '12px 20px',
                                        borderRadius: '2px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        textDecoration: 'none',
                                        textAlign: 'center',
                                        marginTop: '16px',
                                    }}
                                >
                                    Start Scanning
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
