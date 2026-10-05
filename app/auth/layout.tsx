import Link from 'next/link'
import { AuthTermsNote } from './auth-terms-note'

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="warm-theme flex min-h-screen flex-col items-center justify-center px-6 py-12">
            <Link href="/" className="mb-8">
                <span className="font-heading text-3xl text-accent tracking-wider">HEXLURA<sup className="text-[0.4em] align-super tracking-normal">®</sup></span>
            </Link>
            <div className="w-full max-w-sm bg-card rounded-3xl border border-border shadow-card p-8">
                {children}
            </div>
            <AuthTermsNote />
        </div>
    )
}
