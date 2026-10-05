import Link from 'next/link'
import { getStaticPageMetadata } from '@/lib/seo'
import type { Metadata } from 'next'

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
    return getStaticPageMetadata('/how-it-works')
}

type Step = { title: string; body: string }

const BUYER_STEPS: Step[] = [
    { title: 'Find an event', body: 'Browse events by city or category. Use the Find Events page to discover what’s on near you.' },
    { title: 'Select your tickets', body: 'Choose your ticket type and quantity. See the full price breakdown including booking fee before you pay.' },
    { title: 'Pay securely', body: 'Pay by card through our secure Stripe-powered checkout. Your payment is protected.' },
    { title: 'Get your tickets', body: 'Receive a confirmation email with your PDF ticket containing your unique QR code. Download and save it to your phone.' },
    { title: 'Show up and enjoy', body: 'Show your QR code at the door. Each QR code is valid for one scan only.' },
]

const ORGANISER_STEPS: Step[] = [
    { title: 'Create an account', body: 'Register and select “I want to sell tickets” to set up your organiser profile.' },
    { title: 'Connect Stripe', body: 'Connect your Stripe account to receive payouts directly to your bank account.' },
    { title: 'Create your event', body: 'Add your event details, upload a banner, set ticket types and prices.' },
    { title: 'Share and sell', body: 'Your event goes live instantly. Share your event link and start selling tickets.' },
    { title: 'Manage attendees', body: 'Use your organiser dashboard to track sales, manage attendees, and check in guests on the door using our QR scanner.' },
    { title: 'Get paid', body: 'Receive your payout 2 business days after your event ends.' },
]

function Steps({ steps, circle }: { steps: Step[]; circle: string }) {
    return (
        <div className="space-y-6">
            {steps.map((step, i) => (
                <div key={step.title} className="flex gap-5">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-heading text-lg shrink-0 ${circle}`}>{i + 1}</div>
                    <div>
                        <p className="font-semibold mb-1">{step.title}</p>
                        <p className="text-white/60 text-sm leading-relaxed">{step.body}</p>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default function HowItWorksPage() {
    return (
        <div style={{ background: '#1A0E0C' }} className="text-white">
            <div className="max-w-3xl mx-auto px-6 lg:px-10 py-16">
                <h1 className="font-heading text-5xl lg:text-6xl tracking-wide mb-2 text-center">HOW IT WORKS</h1>
                <p className="text-xs text-white/40 text-center mb-14">Last updated: March 2026</p>

                <section className="mb-20">
                    <h2 className="font-heading text-3xl text-accent tracking-wide mb-8">FOR TICKET BUYERS</h2>
                    <Steps steps={BUYER_STEPS} circle="bg-accent text-white" />
                </section>

                <section>
                    <h2 className="font-heading text-3xl text-accent tracking-wide mb-8">FOR EVENT ORGANISERS</h2>
                    <Steps steps={ORGANISER_STEPS} circle="bg-warm-orange text-[#1A0E0C]" />
                </section>

                <div className="text-center mt-16">
                    <Link
                        href="/business"
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-accent text-white font-semibold shadow-glow hover:brightness-110 transition"
                    >
                        Start Selling Tickets →
                    </Link>
                </div>
            </div>
        </div>
    )
}
