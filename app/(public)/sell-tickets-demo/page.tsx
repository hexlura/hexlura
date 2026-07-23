import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import SellTicketsDemoClient from './sell-tickets-demo-client'

export const metadata: Metadata = {
    title: 'Sell Tickets (Demo) | Hexlura',
    robots: { index: false, follow: false },
}

export default async function SellTicketsDemoPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let ctaHref = '/auth/register?next=/organiser/apply'

    if (user) {
        const { data: profile } = await supabase
            .from('profiles').select('role').eq('id', user.id).single()

        if (profile?.role === 'organiser') ctaHref = '/organiser'
        else if (profile?.role === 'admin') ctaHref = '/admin'
        else ctaHref = '/organiser/apply'
    }

    return <SellTicketsDemoClient ctaHref={ctaHref} />
}
