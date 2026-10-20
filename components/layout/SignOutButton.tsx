'use client'

import { useState } from 'react'
import { signOut } from '@/app/auth/actions'

// Signs the visitor out (server action clears the session cookie) and sends them home.
// Styling is passed in so the same button works in the navbar dropdown, the mobile menu
// and the Account page.
export function SignOutButton({ className, children, menuItem = false }: { className?: string; children?: React.ReactNode; menuItem?: boolean }) {
    const [signingOut, setSigningOut] = useState(false)
    const [failed, setFailed] = useState(false)

    async function handleClick() {
        setSigningOut(true)
        setFailed(false)
        try {
            await signOut()
            window.location.href = '/'
        } catch (err) {
            console.error('Sign out failed:', err)
            setSigningOut(false)
            setFailed(true)
        }
    }

    return (
        <button type="button" role={menuItem ? 'menuitem' : undefined} disabled={signingOut} onClick={handleClick} className={`${className ?? ''} disabled:opacity-50 disabled:cursor-not-allowed`}>
            {signingOut ? 'Signing out…' : failed ? 'Could not sign out — try again' : (children ?? 'Sign Out')}
        </button>
    )
}
