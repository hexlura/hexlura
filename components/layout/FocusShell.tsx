import Link from 'next/link'

// Warm-theme page frame for single-card flows (organiser apply / pending / terms update,
// promoter apply / invite, team invite). Logo top-left, optional action top-right,
// content centred underneath.
export function FocusShell({
    right,
    children,
    align = 'center',
}: {
    right?: React.ReactNode
    children: React.ReactNode
    align?: 'center' | 'top'
}) {
    return (
        <div className="warm-theme min-h-screen flex flex-col">
            <header className="flex items-center justify-between px-6 py-4">
                <Link href="/" className="font-heading text-3xl text-accent tracking-wider">
                    HEXLURA<sup className="text-[0.4em] align-super tracking-normal">®</sup>
                </Link>
                {right}
            </header>
            <main className={`flex-1 flex justify-center px-6 pb-16 ${align === 'center' ? 'items-center pt-2' : 'items-start pt-6'}`}>
                {children}
            </main>
        </div>
    )
}

export const focusLinkClass = 'flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text transition'
