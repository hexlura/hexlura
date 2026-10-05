import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import GdprExportButton from '@/components/account/GdprExportButton'

export default async function AccountPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Service client for profile reads — bypasses RLS so role is always correct
    const serviceClient = createServiceClient()

    // Fetch profile, bookings, organiser status, and team memberships in parallel
    const [{ data: profile }, { data: organiserProfile }, { data: teamMemberships }] = await Promise.all([
        serviceClient
            .from('profiles')
            .select('full_name, email, avatar_url, role, created_at')
            .eq('id', user.id)
            .single(),
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

    const quickLinks = [
        { href: '/bookings', title: 'My Bookings', sub: 'View tickets & booking history', tint: 'bg-warm-red/10', color: '#E63950', icon: <path d="M4 4h16v4H4zM4 12h10M4 16h16M4 20h10" /> },
        { href: '/favourites', title: 'Favourites', sub: 'Saved events & followed organisers', tint: 'bg-warm-orange/10', color: '#FF7A3D', icon: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /> },
        { href: '/notifications', title: 'Notifications', sub: 'Booking & event updates', tint: 'bg-warm-amber/10', color: '#F5A623', icon: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></> },
        { href: '/support', title: 'Help & Support', sub: 'Support tickets & contact', tint: 'bg-warm-green/10', color: '#1B9C63', icon: <><circle cx="12" cy="12" r="10" /><path d="M9.5 9a2.5 2.5 0 0 1 4.8 1c0 1.5-2.3 1.8-2.3 3.5" /><path d="M12 17h.01" /></> },
    ]

    return (
        <section className="max-w-4xl mx-auto">
            <h1 className="font-heading text-3xl tracking-wide mb-6">MY ACCOUNT</h1>

            {/* Profile card */}
            <div className="bg-card rounded-2xl border border-border shadow-soft p-6 flex items-center justify-between flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-warm-orange flex items-center justify-center text-white text-2xl font-bold shrink-0">
                        {fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-lg truncate">{fullName}</p>
                        <p className="text-sm text-muted truncate">{email}</p>
                        {profile?.created_at && (
                            <p className="text-xs text-muted mt-1">
                                Member since{' '}
                                {new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(
                                    new Date(profile.created_at)
                                )}
                            </p>
                        )}
                    </div>
                </div>
                <Link
                    href="/account/settings"
                    className="px-5 py-2.5 rounded-full border border-border text-sm font-semibold hover:bg-background transition"
                >
                    Edit Profile
                </Link>
            </div>

            {/* Organiser portal banner */}
            {profile?.role === 'organiser' && organiserProfile?.is_approved && (
                <Link
                    href="/organiser"
                    className="bg-text rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 group hover:brightness-110 transition"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-warm-red/20 flex items-center justify-center shrink-0">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E63950" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>
                        </div>
                        <div>
                            <p className="text-white font-semibold text-sm">Organiser Portal</p>
                            <p className="text-white/50 text-xs">You have an active organiser account — manage your events</p>
                        </div>
                    </div>
                    <span className="text-accent text-sm font-semibold group-hover:translate-x-0.5 transition-transform">Go to Dashboard →</span>
                </Link>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {quickLinks.map((q) => (
                    <Link key={q.href} href={q.href} className="bg-card rounded-2xl border border-border shadow-soft p-5 hover:shadow-hover transition flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-xl ${q.tint} flex items-center justify-center shrink-0`}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={q.color} strokeWidth="2">{q.icon}</svg>
                        </div>
                        <div>
                            <p className="font-semibold text-sm">{q.title}</p>
                            <p className="text-xs text-muted">{q.sub}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Team access */}
            {teamMemberships && teamMemberships.length > 0 && teamMemberships.map((tm) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const org = tm.organiser as any
                return (
                    <div key={tm.id} className="bg-card rounded-2xl border border-border shadow-soft p-5 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-sm">Team Access</p>
                            <span className="px-2.5 py-1 rounded-full bg-warm-amber/15 text-warm-amberText text-xs font-bold">DOOR STAFF</span>
                        </div>
                        <p className="text-sm text-muted mb-3">
                            You&apos;ve been added as door staff for <span className="font-semibold text-text">{org?.org_name || 'an organiser'}</span>.
                        </p>
                        <Link href="/checkin" className="text-sm font-semibold text-accent hover:underline">Open Check-in Scanner →</Link>
                    </div>
                )
            })}

            {/* Privacy & Data */}
            <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
                <GdprExportButton />
            </div>
        </section>
    )
}
