'use client'

import { useState } from 'react'
import styles from './selling.module.css'
import { Reveal } from './Reveal'

const faqs = [
    {
        q: 'Do you really take 0% commission?',
        a: "Yes. We don't add a service fee on top of your ticket price, and we don't take a cut of your sales. Standard Stripe payment processing still applies, same as any online payment.",
    },
    {
        q: 'When do I get paid?',
        a: 'Payouts land in your connected bank account 2 business days after your event finishes, automatically — no invoices to chase.',
    },
    {
        q: 'Is there a monthly or setup fee?',
        a: "The Base plan is completely free. There's no cost to create an account, list an event, or sell tickets. We optionally offer a Pro tier for advanced marketing tools, but ticketing is always free.",
    },
]

export default function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0)

    return (
        <section id="faq" className="py-24 bg-white relative scroll-mt-28">
            <Reveal className="max-w-4xl mx-auto px-6">
                <>
                    <div className="mb-12 text-center">
                        <div className="inline-block border border-hexred text-hexred px-3 py-1 rounded-full font-mono text-xs mb-4">
                            ANSWERS, NO FLUFF
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
                            QUESTIONS, <span className={styles.gradText}>ANSWERED PLAINLY.</span>
                        </h2>
                    </div>
                    <div className="space-y-4 font-sans">
                        {faqs.map((faq, i) => {
                            const isOpen = openIndex === i
                            return (
                                <div
                                    key={faq.q}
                                    className={`${styles.faqItem} ${isOpen ? styles.open : ''} border rounded-2xl p-6 cursor-pointer transition-colors ${isOpen ? 'border-gray-200 bg-gray-50' : 'border-gray-200 hover:border-hexred/40'}`}
                                    onClick={() => setOpenIndex(isOpen ? null : i)}
                                    role="button"
                                    tabIndex={0}
                                    aria-expanded={isOpen}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            setOpenIndex(isOpen ? null : i)
                                        }
                                    }}
                                >
                                    <div className={`flex justify-between items-center transition-colors ${isOpen ? 'text-hexred' : ''}`}>
                                        <h4 className="font-bold text-lg">{faq.q}</h4>
                                        <span className={`${styles.faqIcon} text-2xl font-mono leading-none ${isOpen ? '' : 'text-hexred'}`}>+</span>
                                    </div>
                                    <div className={styles.faqAnswer}>
                                        <div className={styles.faqAnswerInner}>
                                            <p className="mt-4 text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </>
            </Reveal>
        </section>
    )
}
