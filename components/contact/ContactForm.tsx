'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { CONTACT_TOPICS, type ContactTopic } from '@/lib/contact'

type Status = 'idle' | 'loading' | 'success' | 'error'

const MAX_DETAILS = 2000

export function ContactForm() {
    const pathname = usePathname()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [organizationName, setOrganizationName] = useState('')
    const [phone, setPhone] = useState('')
    const [topic, setTopic] = useState<ContactTopic | ''>('')
    const [eventDetails, setEventDetails] = useState('')
    const [website, setWebsite] = useState('') // honeypot — must stay empty
    const [status, setStatus] = useState<Status>('idle')
    const [error, setError] = useState('')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (status === 'loading') return
        setError('')

        if (name.trim().length < 2) {
            setError('Please enter your name')
            return
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setError('Please enter a valid email address')
            return
        }
        if (organizationName.trim().length < 1) {
            setError('Please enter your organization name')
            return
        }
        if (!topic) {
            setError("Please let us know what this is about")
            return
        }
        if (eventDetails.trim().length < 10) {
            setError('Please share a few more details (at least 10 characters)')
            return
        }

        setStatus('loading')
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    organizationName: organizationName.trim(),
                    phone: phone.trim(),
                    topic,
                    eventDetails: eventDetails.trim(),
                    hxl_hp_field: website,
                    pagePath: pathname,
                }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setError(data.error || 'Something went wrong. Please try again.')
                setStatus('error')
                return
            }
            setStatus('success')
        } catch (err) {
            console.error(err)
            setError('Something went wrong. Please try again.')
            setStatus('error')
        }
    }

    function resetForm() {
        setName('')
        setEmail('')
        setOrganizationName('')
        setPhone('')
        setTopic('')
        setEventDetails('')
        setStatus('idle')
        setError('')
    }

    if (status === 'success') {
        return (
            <div
                role="status"
                aria-live="polite"
                className="contact-fade-up bg-card border border-success/30 shadow-[0_0_0_1px_rgba(0,196,138,0.08),0_20px_40px_-24px_rgba(0,196,138,0.35)] p-10 text-center flex flex-col items-center gap-4"
            >
                <span className="contact-success-pop flex items-center justify-center w-14 h-14 rounded-full bg-success/10 border border-success/30 text-success">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                    </svg>
                </span>
                <div className="space-y-1.5">
                    <h3 className="font-heading text-2xl text-text">Thanks! Your enquiry has been sent.</h3>
                    <p className="text-sm text-muted max-w-sm mx-auto">
                        Our team will review your event details and get back to you shortly.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={resetForm}
                    className="mt-2 text-sm text-accent hover:underline font-medium"
                >
                    Send another enquiry
                </button>
            </div>
        )
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="contact-fade-up bg-card border border-border p-6 sm:p-8 space-y-5"
        >
            <div className="space-y-1 mb-2">
                <h2 className="font-heading text-2xl sm:text-3xl text-text">Tell us about your event</h2>
                <p className="text-sm text-muted">Share a few details and our team will get back to you.</p>
            </div>

            {/* Honeypot — hidden from real users, left empty by them, filled in by bots */}
            <div className="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
                <label htmlFor="hxl-hp-field">Leave this field blank</label>
                <input
                    id="hxl-hp-field"
                    name="hxl_hp_field"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="contact-name" className="text-xs text-muted uppercase tracking-wider">
                        Name <span className="text-accent">*</span>
                    </label>
                    <input
                        id="contact-name"
                        name="name"
                        type="text"
                        required
                        maxLength={120}
                        placeholder="Your name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="h-11 w-full rounded-sm border border-border bg-background px-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition"
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="contact-email" className="text-xs text-muted uppercase tracking-wider">
                        Email <span className="text-accent">*</span>
                    </label>
                    <input
                        id="contact-email"
                        name="email"
                        type="email"
                        required
                        maxLength={254}
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="h-11 w-full rounded-sm border border-border bg-background px-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition"
                    />
                </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="contact-org" className="text-xs text-muted uppercase tracking-wider">
                        Organization name <span className="text-accent">*</span>
                    </label>
                    <input
                        id="contact-org"
                        name="organizationName"
                        type="text"
                        required
                        maxLength={160}
                        placeholder="Your company or event name"
                        value={organizationName}
                        onChange={e => setOrganizationName(e.target.value)}
                        className="h-11 w-full rounded-sm border border-border bg-background px-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition"
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="contact-phone" className="text-xs text-muted uppercase tracking-wider">
                        Phone number <span className="normal-case text-muted/70">(optional)</span>
                    </label>
                    <input
                        id="contact-phone"
                        name="phone"
                        type="tel"
                        maxLength={30}
                        placeholder="+44 7000 000000"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="h-11 w-full rounded-sm border border-border bg-background px-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-topic" className="text-xs text-muted uppercase tracking-wider">
                    What&apos;s this about? <span className="text-accent">*</span>
                </label>
                <select
                    id="contact-topic"
                    name="topic"
                    required
                    value={topic}
                    onChange={e => setTopic(e.target.value as ContactTopic)}
                    className="h-11 w-full rounded-sm border border-border bg-background px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent transition"
                >
                    <option value="" disabled>Select a topic</option>
                    {CONTACT_TOPICS.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-details" className="text-xs text-muted uppercase tracking-wider">
                    Tell us about your event <span className="text-accent">*</span>
                </label>
                <textarea
                    id="contact-details"
                    name="eventDetails"
                    required
                    rows={6}
                    maxLength={MAX_DETAILS}
                    placeholder="Tell us about your event, expected attendance, date, venue, or anything else that can help us understand your requirements..."
                    value={eventDetails}
                    onChange={e => setEventDetails(e.target.value)}
                    className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition resize-y"
                />
                <p className="text-xs text-muted text-right">{eventDetails.length} / {MAX_DETAILS}</p>
            </div>

            {error && (
                <p
                    role="alert"
                    aria-live="assertive"
                    className="contact-shake text-sm text-accent bg-accent/10 border border-accent/20 rounded-sm px-4 py-2.5"
                >
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={status === 'loading'}
                className="group w-full h-12 rounded-sm bg-[#0A0A0F] text-white font-semibold text-sm hover:bg-[#2a2a3f] hover:-translate-y-px active:translate-y-0 active:opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 flex items-center justify-center gap-2"
            >
                {status === 'loading' ? (
                    <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending...
                    </>
                ) : (
                    <>
                        Send enquiry
                        <svg
                            className="w-4 h-4 transition-transform group-hover:translate-x-1"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        >
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                        </svg>
                    </>
                )}
            </button>

            <style jsx>{`
                @keyframes contact-fade-up {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes contact-success-pop {
                    from { opacity: 0; transform: scale(0.85); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes contact-shake {
                    10%, 90% { transform: translateX(-1px); }
                    20%, 80% { transform: translateX(2px); }
                    30%, 50%, 70% { transform: translateX(-4px); }
                    40%, 60% { transform: translateX(4px); }
                }
                .contact-fade-up { animation: contact-fade-up 0.5s ease-out; }
                .contact-success-pop { animation: contact-success-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
                .contact-shake { animation: contact-shake 0.4s ease-in-out; }
                @media (prefers-reduced-motion: reduce) {
                    .contact-fade-up, .contact-success-pop, .contact-shake {
                        animation: none;
                    }
                }
            `}</style>
        </form>
    )
}
