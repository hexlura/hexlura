'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Sits under the card on the sign-in and create-account pages only.
export function AuthTermsNote() {
    const pathname = usePathname()
    if (pathname !== '/auth/login' && pathname !== '/auth/register') return null

    const verb = pathname === '/auth/register' ? 'By creating an account you agree to' : 'By continuing you agree to'
    return (
        <p className="text-xs text-muted mt-8 max-w-sm text-center">
            {verb} Hexlura&apos;s{' '}
            <Link href="/terms" className="hover:text-accent underline">Terms</Link> and{' '}
            <Link href="/privacy" className="hover:text-accent underline">Privacy Policy</Link>.
        </p>
    )
}
