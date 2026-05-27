import { getStaticPageMetadata } from '@/lib/seo'
import type { Metadata } from 'next'
import SellTicketsClient from './sell-tickets-client'

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
    return getStaticPageMetadata('/sell-tickets')
}

export default function SellTicketsPage() {
    return <SellTicketsClient />
}
