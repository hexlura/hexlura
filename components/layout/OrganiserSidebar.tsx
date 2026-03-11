import Link from 'next/link'

export function OrganiserSidebar() {
    return (
        <aside className="w-64 border-r border-border bg-surface flex flex-col">
            <div className="h-16 flex items-center px-6 border-b border-border">
                <span className="font-heading text-xl text-accent tracking-wider">ORGANISER</span>
            </div>
            <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
                <Link href="/organiser" className="block px-4 py-2 rounded-lg text-text hover:bg-card transition">
                    Dashboard
                </Link>
                <Link href="/organiser/events" className="block px-4 py-2 rounded-lg text-muted hover:text-text hover:bg-card transition">
                    My Events
                </Link>
                <Link href="/organiser/payouts" className="block px-4 py-2 rounded-lg text-muted hover:text-text hover:bg-card transition">
                    Payouts
                </Link>
            </nav>
            <div className="p-4 border-t border-border mt-auto">
                <Link href="/" className="text-sm text-muted hover:text-text transition">
                    ← Back to Main site
                </Link>
            </div>
        </aside>
    )
}
