import { getStaticPageMetadata } from '@/lib/seo'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
    return getStaticPageMetadata('/browse')
}

export default function BrowsePage() {
    return (
        <section className="container mx-auto px-4 py-16">
            <h1 className="font-heading text-4xl text-text mb-8">BROWSE EVENTS</h1>
            <p className="text-muted">Explore upcoming events. Filters and event grid coming soon.</p>
        </section>
    )
}
