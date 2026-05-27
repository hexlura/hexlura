import { getStaticPageMetadata } from '@/lib/seo'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import BrowseEventsClient from './events-client'

// Search/filter page — varies by query string; client uses useSearchParams.
// Don't prerender; serve dynamically so the URL params are read at request time.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
    return getStaticPageMetadata('/events')
}

export default function EventsPage() {
    return (
        <Suspense fallback={null}>
            <BrowseEventsClient />
        </Suspense>
    )
}
