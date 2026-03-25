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

    if (!profile || profile.role !== 'door_staff') {
        redirect('/checkin/login')
    }

    // Fetch door_staff assignments for this user
    const { data: assignments } = await serviceClient
        .from('door_staff')
        .select('organiser_id')
        .eq('user_id', user.id)

    const organiserIds: string[] = assignments?.map((a: { organiser_id: string }) => a.organiser_id) ?? []

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
                        No events assigned. Ask your organiser to add you as door staff.
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
                                <p style={{ fontSize: '18px', color: '#F0F0F8', fontWeight: '600', margin: '0 0 4px 0' }}>
                                    {event.title}
                                </p>
                                <p style={{ fontSize: '13px', color: '#8888AA', margin: '0 0 8px 0' }}>
                                    {formatEventDate(event.start_at)}
                                    {event.venue_name ? ` · ${event.venue_name}` : ''}
                                </p>
                                {(event.checkin_start_at || event.checkin_end_at) && (
                                    <p style={{ fontSize: '12px', color: '#00E5A0', margin: '0 0 16px 0' }}>
                                        Doors:{' '}
                                        {event.checkin_start_at ? formatTime(event.checkin_start_at) : '—'}
                                        {' — '}
                                        {event.checkin_end_at ? formatTime(event.checkin_end_at) : '—'}
                                    </p>
                                )}
                                <Link
                                    href={`/organiser/events/${event.id}/checkin`}
                                    style={{
                                        display: 'inline-block',
                                        background: '#E63950',
                                        color: 'white',
                                        padding: '8px 20px',
                                        borderRadius: '2px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        textDecoration: 'none',
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
