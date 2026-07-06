import { getStaticPageMetadata } from '@/lib/seo'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import SellTicketsClient from './sell-tickets-client'

export async function generateMetadata(): Promise<Metadata> {
    return getStaticPageMetadata('/sell-tickets')
}

export default async function SellTicketsPage() {
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

    // Fetch the organiser guide storage details from the assets table
    const { data: asset } = await supabase
        .from('assets')
        .select('bucket_name, storage_path')
        .eq('file_name', 'hexlura-organiser-guide.pdf')
        .eq('is_active', true)
        .maybeSingle()

    const bucketName = asset?.bucket_name || 'terms-and-guidelines'
    const storagePath = asset?.storage_path || 'terms-and-guidelines/organiser/guidelines/hexlura-organiser-guide.pdf'

    return <SellTicketsClient ctaHref={ctaHref} bucketName={bucketName} storagePath={storagePath} />
}
