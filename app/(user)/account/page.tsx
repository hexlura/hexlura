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

    // Fetch profile, bookings, and organiser status in parallel
    const [{ data: profile }, { data: bookingsRaw }, { data: organiserProfile }] = await Promise.all([
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
    ])

    const fullName = profile?.full_name || user.user_metadata?.full_name || 'there'
    const email = user.email || ''
    const bookings = (bookingsRaw || []) as Booking[]

    const now = new Date().toISOString()
    const confirmedBookings = bookings.filter((b) => b.status === 'confirmed')
    const upcomingBookings = confirmedBookings.filter((b) => b.event && b.event.start_at > now)
    const totalSpent = confirmedBookings.reduce((sum, b) => sum + (b.total_pence || 0), 0)

    // Next 3 upcoming
    const nextUpcoming = upcomingBookings.slice(0, 3)

    const quickLinks = [
        { label: 'My Bookings', href: '/bookings', description: 'View all your tickets' },
        { label: 'Browse Events', href: '/events', description: 'Discover new events' },
        { label: 'Account Settings', href: '/account/settings', description: 'Update your profile' },
        { label: 'Apply as Organiser', href: '/organiser/apply', description: 'Start hosting events' },
    ]

    return (
        <section className="max-w-4xl mx-auto space-y-8">
            {/* Organiser Portal banner */}
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

            {/* Welcome */}
            <div>
                <h1 className="font-heading text-4xl text-text">WELCOME BACK, {fullName.toUpperCase()}</h1>
                <p className="text-muted mt-1">Here&apos;s an overview of your account.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface border border-border rounded-none p-5 text-center space-y-1">
                    <p className="text-3xl font-bold text-accent">{confirmedBookings.length}</p>
                    <p className="text-sm text-muted">Total Bookings</p>
                </div>
                <div className="bg-surface border border-border rounded-none p-5 text-center space-y-1">
                    <p className="text-3xl font-bold text-accent">{upcomingBookings.length}</p>
                    <p className="text-sm text-muted">Upcoming Events</p>
                </div>
                <div className="bg-surface border border-border rounded-none p-5 text-center space-y-1">
                    <p className="text-3xl font-bold text-accent">{formatPence(totalSpent)}</p>
                    <p className="text-sm text-muted">Total Spent</p>
                </div>
            </div>

            {/* Upcoming Bookings */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-heading text-2xl text-text">UPCOMING BOOKINGS</h2>
                    {upcomingBookings.length > 3 && (
                        <Link href="/bookings" className="text-accent hover:underline text-sm font-medium">
                            View All Bookings &rarr;
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

            {/* Quick Links */}
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

            {/* Account Info */}
            <div className="bg-surface border border-border rounded-none p-6 space-y-4">
                <h2 className="font-heading text-2xl text-text">ACCOUNT INFO</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-muted">Name</p>
                        <p className="text-text font-medium">{fullName}</p>
                    </div>
                    <div>
                        <p className="text-muted">Email</p>
                        <p className="text-text font-medium">{email}</p>
                    </div>
                </div>
                <Link
                    href="/account/settings"
                    className="inline-flex h-10 px-5 rounded-sm border border-border bg-card text-text text-sm font-medium hover:bg-card/80 transition items-center"
                >
                    Edit Profile
                </Link>
            </div>
        </section>
    )
}
