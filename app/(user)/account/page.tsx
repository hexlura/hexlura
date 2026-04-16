import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
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
