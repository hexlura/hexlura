import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { OrganiserTicketForm } from '@/components/organiser/OrganiserSupport'

export const dynamic = 'force-dynamic'

const BASE = '/organiser/support'

export default async function OrganiserNewSupportTicketPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/auth/login?next=${BASE}/new`)

    return (
        <div className="max-w-7xl">
            <Link href={BASE} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors mb-4">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                Back to Support
            </Link>
            <div className="max-w-2xl">
                <div className="mb-6">
                    <h1 className="font-heading text-4xl tracking-wide">NEW TICKET</h1>
                    <p className="text-muted text-sm mt-1">Tell us what&apos;s going on and we&apos;ll get back to you</p>
                </div>
                <OrganiserTicketForm framed />
            </div>
        </div>
    )
}
