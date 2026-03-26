import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import UserMenu from './UserMenu'
import LeftMenu from './LeftMenu'

export async function Navbar() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let role = 'user'
    let fullName: string | null = null
    if (user) {
        // Service client bypasses RLS so the profile read always succeeds
        const serviceClient = createServiceClient()
        const { data: profile } = await serviceClient
            .from('profiles')
            .select('role, full_name')
            .eq('id', user.id)
            .single()
        role = profile?.role || 'user'
        fullName = profile?.full_name || null
    }

    const initials = fullName
        ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : user?.email?.[0]?.toUpperCase() || '?'

    const sellTicketsHref = !user
        ? '/sell-tickets'
        : (role === 'organiser' || role === 'admin')
            ? '/organiser'
            : '/organiser/apply'

    return (
        <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <div className="flex items-center">
                    <LeftMenu isLoggedIn={!!user} role={role} fullName={fullName} />
                    <Link href="/" className="flex items-center gap-2">
                        <span className="font-heading text-2xl text-accent tracking-wider">HEXLURA</span>
                    </Link>
                </div>
                <nav className="hidden md:flex gap-6">
                    <Link href="/events" className="text-sm font-medium text-muted hover:text-text transition">
                        Find Events
                    </Link>
                    <Link href={sellTicketsHref} className="text-sm font-medium text-muted hover:text-text transition">
                        Sell Tickets
                    </Link>
                </nav>
                <div className="flex items-center gap-3">
                    {user ? (
                        <UserMenu initials={initials} fullName={fullName} role={role} />
                    ) : (
                        <>
                            <Link
                                href="/auth/login"
                                className="hidden md:inline-flex items-center justify-center text-sm font-medium text-[#0A0A0F] border border-[#0A0A0F] bg-transparent px-5 py-2 rounded-sm hover:bg-[#0A0A0F] hover:text-white transition"
                            >
                                Log In
                            </Link>
                            <Link
                                href="/auth/register"
                                className="inline-flex items-center justify-center text-sm font-semibold text-white bg-accent border-0 px-5 py-2 rounded-sm hover:opacity-90 transition"
                            >
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    )
}
