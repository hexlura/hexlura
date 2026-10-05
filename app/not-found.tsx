import Link from 'next/link'

export const metadata = {
    title: 'Page not found | Hexlura',
}

export default function NotFound() {
    return (
        <div className="warm-theme min-h-screen flex flex-col">
            <header className="px-6 py-5">
                <Link href="/" className="font-heading text-3xl text-accent tracking-wider">
                    HEXLURA<sup className="text-[0.4em] align-super tracking-normal">®</sup>
                </Link>
            </header>
            <main className="flex-1 flex items-center justify-center px-6 pb-16">
                <div className="text-center max-w-lg">
                    <p className="font-heading text-[9rem] leading-none text-accent/90 tracking-wider">404</p>
                    <h1 className="font-heading text-4xl tracking-wide -mt-2 mb-3">THIS PAGE HAS LEFT THE BUILDING</h1>
                    <p className="text-muted mb-8">
                        The page you&apos;re looking for doesn&apos;t exist, or the event has moved. Try searching for what you wanted.
                    </p>
                    <form action="/events" method="get" className="relative max-w-sm mx-auto mb-8">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                        <input
                            name="q"
                            placeholder="Search events…"
                            className="w-full pl-11 pr-4 py-3.5 rounded-full bg-card border border-border text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-accent/25"
                        />
                    </form>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Link href="/" className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-accent text-white font-semibold shadow-glow hover:brightness-110 transition">
                            Back to home
                        </Link>
                        <Link href="/events" className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-card border border-border text-sm font-semibold hover:border-text/30 transition">
                            Browse events
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    )
}
