import Link from 'next/link'

export function AdminSidebar() {
    return (
        <aside className="w-64 border-r border-border bg-surface flex flex-col">
            <div className="h-16 flex items-center px-6 border-b border-border">
                <span className="font-heading text-xl text-accent tracking-wider">ADMIN</span>
            </div>
            <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
                <Link href="/admin" className="block px-4 py-2 rounded-lg text-text hover:bg-card transition">
                    Dashboard
                </Link>
                <Link href="/admin/users" className="block px-4 py-2 rounded-lg text-muted hover:text-text hover:bg-card transition">
                    Users
                </Link>
                <Link href="/admin/events" className="block px-4 py-2 rounded-lg text-muted hover:text-text hover:bg-card transition">
                    Events & Moderation
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
