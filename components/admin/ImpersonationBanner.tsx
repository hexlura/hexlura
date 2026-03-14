'use client'

import { useRouter } from 'next/navigation'

interface ImpersonationBannerProps {
    impersonatedName: string
}

export function ImpersonationBanner({ impersonatedName }: ImpersonationBannerProps) {
    const router = useRouter()

    const handleExit = async () => {
        await fetch('/api/admin/impersonate/exit', { method: 'POST' })
        router.push('/admin/users')
        router.refresh()
    }

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-4 py-2 px-4 text-sm font-medium cursor-pointer"
            style={{ background: '#E63950', color: '#fff' }}
            onClick={handleExit}
        >
            <span>⚠ IMPERSONATING {impersonatedName} — Click here to exit impersonation</span>
        </div>
    )
}
