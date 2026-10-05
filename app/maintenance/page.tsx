import Link from 'next/link'

export const metadata = {
    title: "We'll be right back | Hexlura",
}

// Maintenance screen. NOTE: nothing redirects visitors here yet — the "Maintenance Mode"
// switch in Admin → Settings is saved but the site does not read it. This page exists so
// the gate can be wired up (middleware, admins bypassed) as a separate, deliberate change.
export default function MaintenancePage() {
    return (
        <div className="warm-theme min-h-screen flex flex-col">
            <header className="px-6 py-5">
                <Link href="/" className="font-heading text-3xl text-accent tracking-wider">
                    HEXLURA<sup className="text-[0.4em] align-super tracking-normal">®</sup>
                </Link>
            </header>
            <main className="flex-1 flex items-center justify-center px-6 pb-16">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-accent/10 flex items-center justify-center mb-6">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#E63950" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4L15 12l-3-3z" /></svg>
                    </div>
                    <h1 className="font-heading text-5xl tracking-wide mb-3">WE&apos;LL BE RIGHT BACK</h1>
                    <p className="text-muted mb-6">
                        Hexlura is getting a quick tune-up. Your tickets are safe, and bookings you&apos;ve already made are not affected.
                    </p>
                    <div className="bg-card rounded-2xl border border-border shadow-card p-5 mb-6 text-left">
                        <p className="text-xs font-bold tracking-widest text-muted mb-2">AT THE DOOR TONIGHT?</p>
                        <p className="text-sm text-muted">Your ticket QR code still works at the venue. Open it from the confirmation email you received.</p>
                    </div>
                    <p className="text-xs text-muted">
                        Questions?{' '}
                        <a href="mailto:support@hexlura.com" className="text-accent font-semibold hover:underline">support@hexlura.com</a>
                    </p>
                </div>
            </main>
        </div>
    )
}
