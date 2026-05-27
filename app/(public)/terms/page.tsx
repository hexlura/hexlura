import { getStaticPageMetadata } from '@/lib/seo'
import type { Metadata } from 'next'
import TermsClient from './terms-client'

export async function generateMetadata(): Promise<Metadata> {
    return getStaticPageMetadata('/terms')
}

export default function TermsPage() {
    return <TermsClient />
}
