import { getStaticPageMetadata } from '@/lib/seo'
import type { Metadata } from 'next'
import TermsClient from './terms-client'
import { getLatestLegalDocument } from '@/lib/legal'
import { PublishedLegalDocument } from '@/components/legal/PublishedLegalDocument'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
    return getStaticPageMetadata('/terms')
}

export default async function TermsPage() {
    // Admin-published version wins; the hardcoded page is the fallback until
    // the first publish from /admin/legal.
    const doc = await getLatestLegalDocument('terms')
    if (doc) return <PublishedLegalDocument doc={doc} title="Terms & Conditions" />
    return <TermsClient />
}
