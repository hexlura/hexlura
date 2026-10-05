import { getStaticPageMetadata } from '@/lib/seo'
import type { Metadata } from 'next'

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
    return getStaticPageMetadata('/about')
}

const SECTIONS = [
    {
        title: 'OUR STORY',
        body: 'Hexlura was built for the UK events scene. We believe discovering and attending live events should be simple, transparent, and exciting — whether it’s a local club night, a live gig, a comedy show, or a major festival.',
    },
    {
        title: 'OUR MISSION',
        body: 'We connect event organisers with their audiences across the UK. Our platform gives organisers the tools to sell tickets professionally, while giving buyers a seamless booking experience with clear, honest pricing.',
    },
    {
        title: 'FOR BUSINESS',
        body: 'Hexlura is built with organisers in mind. We charge a simple, transparent booking fee — organisers keep 100% of the ticket face value. No hidden charges, no complex fee structures.',
    },
    {
        title: 'FOR BUYERS',
        body: 'Every ticket purchase on Hexlura comes with a clear breakdown of costs before you pay. Our booking fee is simple and transparent — you’ll always see the exact amount before completing your purchase.',
    },
]

export default function AboutPage() {
    return (
        <div className="max-w-3xl mx-auto px-6 lg:px-10 py-16">
            <h1 className="font-heading text-5xl lg:text-6xl tracking-wide mb-2 text-center">ABOUT HEXLURA</h1>
            <p className="text-xs text-muted text-center mb-12">Last updated: March 2026</p>

            {SECTIONS.map(sec => (
                <section key={sec.title} className="mb-10">
                    <h2 className="font-heading text-2xl text-accent tracking-wide mb-3">{sec.title}</h2>
                    <hr className="border-border mb-4" />
                    <p className="text-muted leading-relaxed">{sec.body}</p>
                </section>
            ))}

            <section>
                <h2 className="font-heading text-2xl text-accent tracking-wide mb-3">THE COMPANY</h2>
                <hr className="border-border mb-4" />
                <p className="text-muted leading-relaxed">Hexlura is operated by Hexlura Ltd, a company registered in England and Wales.</p>
                <div className="mt-4 space-y-1 text-sm text-muted">
                    <p><span className="font-semibold text-text">Company Number:</span> 17102803</p>
                    <p><span className="font-semibold text-text">Registered Address:</span> 41 Junction Road, Northampton, England, NN2 7JA</p>
                    <p>
                        <span className="font-semibold text-text">Contact:</span>{' '}
                        <a href="mailto:support@hexlura.com" className="text-accent hover:underline">support@hexlura.com</a>
                    </p>
                </div>
            </section>
        </div>
    )
}
