import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { formatPence } from '@/lib/fees'
import { Booking } from '@/types'
import Link from 'next/link'

export default async function AccountPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Service client for profile reads — bypasses RLS so role is always correct
    const serviceClient = createServiceClient()

    // Fetch profile, bookings, organiser status, and team memberships in parallel
    const [{ data: profile }, { data: bookingsRaw }, { data: organiserProfile }, { data: teamMemberships }] = await Promise.all([
        serviceClient
            .from('profiles')
            .select('full_name, email, avatar_url, role, created_at')
            .eq('id', user.id)
            .single(),
        supabase
            .from('bookings')
            .select('*, event:events(title, start_at, end_at, venue_name, venue_address, banner_url)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        serviceClient
            .from('organiser_profiles')
            .select('is_approved')
            .eq('user_id', user.id)
            .maybeSingle(),
        serviceClient
            .from('organiser_team')
            .select('id, privilege, organiser:organiser_profiles!organiser_id(org_name)')
            .eq('user_id', user.id)
            .eq('status', 'active'),
    ])

    const fullName = profile?.full_name || user.user_metadata?.full_name || 'there'
    const email = user.email || ''
    const bookings = (bookingsRaw || []) as Booking[]

    const now = new Date().toISOString()
    const upcomingBookings = bookings
        .filter((b) => b.status === 'confirmed' && b.event && b.event.start_at > now)

    // Next 3 upcoming
    const nextUpcoming = upcomingBookings.slice(0, 3)

    const isOrganiserOrAdmin = profile?.role === 'organiser' || profile?.role === 'admin'

    const quickLinks = [
        { label: 'My Bookings', href: '/bookings', description: 'View all your tickets' },
        { label: 'Browse Events', href: '/events', description: 'Discover new events' },
        { label: 'Account Settings', href: '/account/settings', description: 'Update your profile' },
        isOrganiserOrAdmin
            ? { label: 'Organiser Dashboard', href: '/organiser', description: 'Manage your events' }
            : { label: 'Apply as Organiser', href: '/organiser/apply', description: 'Start hosting events' },
    ]

    return (
        <section className="max-w-4xl mx-auto space-y-8">

            {/* ── Profile Card (top priority) ── */}
            <div className="bg-surface border border-border rounded-none p-6">
                <div className="flex items-center gap-5">
                    {/* Avatar — initial letter circle */}
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            background: '#E63950',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <span style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                            {fullName.charAt(0).toUpperCase()}
                        </span>
                    </div>

                    {/* Name / email / member since */}
                    <div className="flex-1 min-w-0">
                        <p className="font-heading text-2xl text-text truncate">{fullName.toUpperCase()}</p>
                        <p className="text-sm text-muted truncate">{email}</p>
                        {profile?.created_at && (
                            <p className="text-xs text-muted mt-0.5">
                                Member since{' '}
                                {new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(
                                    new Date(profile.created_at)
                                )}
                            </p>
                        )}
                    </div>

                    {/* Edit Profile button */}
                    <Link
                        href="/account/settings"
                        className="hidden sm:inline-flex h-9 px-4 items-center border border-border bg-card text-text text-sm font-medium hover:bg-card/80 transition whitespace-nowrap"
                        style={{ borderRadius: 0, flexShrink: 0 }}
                    >
                        Edit Profile
                    </Link>
                </div>

                {/* Edit Profile link — mobile only (below the row) */}
                <div className="mt-4 sm:hidden">
                    <Link
                        href="/account/settings"
                        className="inline-flex h-9 px-4 items-center border border-border bg-card text-text text-sm font-medium hover:bg-card/80 transition"
                        style={{ borderRadius: 0 }}
                    >
                        Edit Profile
                    </Link>
                </div>
            </div>

            {/* ── Organiser Portal banner ── */}
            {profile?.role === 'organiser' && organiserProfile?.is_approved && (
                <Link
                    href="/organiser"
                    className="flex items-center justify-between gap-4 bg-accent/10 border border-accent/30 rounded-none px-6 py-4 hover:bg-accent/15 transition group"
                >
                    <div>
                        <p className="font-heading text-lg text-accent tracking-wide">ORGANISER PORTAL</p>
                        <p className="text-sm text-muted mt-0.5">Manage your events, tickets, and payouts</p>
                    </div>
                    <span className="text-accent text-xl group-hover:translate-x-1 transition-transform">&rarr;</span>
                </Link>
            )}

            {/* ── Upcoming Bookings ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-heading text-2xl text-text">UPCOMING BOOKINGS</h2>
                    {upcomingBookings.length > 3 && (
                        <Link href="/bookings" className="text-accent hover:underline text-sm font-medium">
                            View All &rarr;
                        </Link>
                    )}
                </div>

                {nextUpcoming.length > 0 ? (
                    <div className="space-y-3">
                        {nextUpcoming.map((booking) => {
                            const event = booking.event
                            const dateStr = event
                                ? new Intl.DateTimeFormat('en-GB', {
                                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
                                }).format(new Date(event.start_at))
                                : ''
                            const ticketCount = booking.items?.reduce((s, i) => s + i.quantity, 0) || 0

                            return (
                                <div key={booking.id} className="bg-surface border border-border rounded-none p-5 flex flex-col sm:flex-row gap-4 hover:border-accent/30 transition">
                                    <div className="flex-1 space-y-2">
                                        <h3 className="font-semibold text-text text-lg">{event?.title || 'Event'}</h3>
                                        <p className="text-sm text-muted">{dateStr}</p>
                                        {event?.venue_name && (
                                            <p className="text-sm text-muted">{event.venue_name}</p>
                                        )}
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="font-mono text-muted">{booking.booking_ref}</span>
                                            {ticketCount > 0 && <span className="text-muted">{ticketCount} ticket{ticketCount > 1 ? 's' : ''}</span>}
                                            {booking.total_pence && <span className="font-medium text-text">{formatPence(booking.total_pence)}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <Link
                                            href={`/bookings/${booking.booking_ref}`}
                                            className="h-10 px-5 rounded-sm border border-border bg-card text-text text-sm font-medium hover:bg-card/80 transition flex items-center gap-1 whitespace-nowrap"
                                        >
                                            View Ticket &rarr;
                                        </Link>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="py-12 text-center border-2 border-dashed border-border rounded-none">
                        <p className="text-muted mb-4">No upcoming bookings yet.</p>
                        <Link href="/events" className="text-accent hover:underline text-sm font-medium">
                            Browse events
                        </Link>
                    </div>
                )}
            </div>

            {/* ── Quick Links ── */}
            <div className="space-y-4">
                <h2 className="font-heading text-2xl text-text">QUICK LINKS</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {quickLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="bg-surface border border-border rounded-none p-5 hover:border-accent/30 transition group"
                        >
                            <p className="font-semibold text-text group-hover:text-accent transition">{link.label}</p>
                            <p className="text-sm text-muted mt-1">{link.description}</p>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── Team Access ── */}
            {teamMemberships && teamMemberships.length > 0 && (
                <div className="space-y-4">
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, color: '#0A0A0F', marginBottom: 16 }}>TEAM ACCESS</h2>
                    <div className="space-y-3">
                        {teamMemberships.map((tm) => {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const org = tm.organiser as any
                            return (
                                <div key={tm.id} style={{ background: '#FFFFFF', border: '1px solid #E0E0E0', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                    <div>
                                        <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0F', margin: '0 0 4px' }}>{org?.org_name || 'Organiser'}</p>
                                        <span style={{ background: 'rgba(0,196,138,0.1)', color: '#00C48A', fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>
                                            Door Staff
                                        </span>
                                    </div>
                                    <Link
                                        href="/checkin"
                                        style={{ display: 'inline-block', padding: '8px 20px', fontSize: 13, fontWeight: 600, textDecoration: 'none', border: '1px solid #0A0A0F', color: '#0A0A0F', background: 'transparent' }}
                                    >
                                        Open Scanner
                                    </Link>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </section>
    )
}
