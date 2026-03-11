import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export async function Navbar() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let role = 'user'
    let fullName: string | null = null
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', user.id)
            .single()
        role = profile?.role || 'user'
        fullName = profile?.full_name || null
    }

    const dashboardHref = role === 'admin' ? '/admin' : role === 'organiser' ? '/organiser' : '/account'
    const initials = fullName
        ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : user?.email?.[0]?.toUpperCase() || '?'

    return (
        <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2">
                    <span className="font-heading text-2xl text-accent tracking-wider">HEXLURA</span>
                </Link>
                <nav className="hidden md:flex gap-6">
                    <Link href="/browse" className="text-sm font-medium text-muted hover:text-text transition">
                        Browse Events
                    </Link>
                </nav>
                <div className="flex items-center gap-4">
                    {user ? (
                        <Link
                            href={dashboardHref}
                            className="flex items-center gap-2 text-sm font-medium text-text bg-surface border border-border px-3 py-2 rounded-lg hover:bg-surface/80 transition"
                        >
                            <span className="w-7 h-7 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">
                                {initials}
                            </span>
                            <span className="hidden sm:inline">{fullName || 'Account'}</span>
                        </Link>
                    ) : (
                        <Link
                            href="/auth/login"
                            className="text-sm font-medium text-text bg-surface border border-border px-4 py-2 rounded-lg hover:bg-surface/80 transition"
                        >
                            Sign In
                        </Link>
                    )}
                </div>
            </div>
        </header>
    )
}
