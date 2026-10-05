'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemedSelect } from '@/components/ui/ThemedSelect'
import { TERMS_VERSION } from '@/lib/terms'

interface ApplyFormProps {
    userId: string
    userEmail: string
    termsVersion?: string
}

type OrgType = 'individual' | 'artist' | 'club_venue' | 'event_company' | 'charity' | 'education'

const ORG_TYPES: { value: OrgType; emoji: string; name: string; description: string }[] = [
    { value: 'individual', emoji: '👤', name: 'Individual', description: 'Solo organiser running your own events' },
    { value: 'artist', emoji: '🎭', name: 'Artist / Performer', description: 'Musician, comedian, performer selling tickets to your own shows' },
    { value: 'club_venue', emoji: '🏢', name: 'Club / Venue', description: 'Nightclub, pub, venue or entertainment space' },
    { value: 'event_company', emoji: '🏗️', name: 'Event Company', description: 'Professional events business or promoter' },
    { value: 'charity', emoji: '❤️', name: 'Charity / Community', description: 'Non-profit, charity or community group' },
    { value: 'education', emoji: '🎓', name: 'Education', description: 'School, university, training provider or workshop host' },
]

export function ApplyForm({ userId, userEmail, termsVersion }: ApplyFormProps) {
    const router = useRouter()
    const [orgType, setOrgType] = useState<OrgType | null>(null)
    const [orgName, setOrgName] = useState('')
    const [role, setRole] = useState('')
    const [website, setWebsite] = useState('')
    const [description, setDescription] = useState('')
    const [monthlyEvents, setMonthlyEvents] = useState('')
    const [vatRegistered, setVatRegistered] = useState(false)
    const [vatNumber, setVatNumber] = useState('')
    const [agreedTerms, setAgreedTerms] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [typeError, setTypeError] = useState('')

    function toSlug(name: string) {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!orgType) {
            setTypeError('Please select your organiser type')
            return
        }
        setTypeError('')
        if (!agreedTerms) return setError('You must agree to the organiser terms')
        setSubmitting(true)
        setError('')

        try {
            const supabase = createClient()
            const baseSlug = toSlug(orgName)
            const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`

            // Create organiser profile — approved immediately
            const { error: insertError } = await supabase
                .from('organiser_profiles')
                .insert({
                    user_id: userId,
                    org_name: orgName,
                    slug,
                    description,
                    website: website || null,
                    vat_registered: vatRegistered,
                    vat_number: vatRegistered ? vatNumber : null,
                    organiser_type: orgType,
                    is_approved: true,
                    approved_at: new Date().toISOString(),
                    terms_accepted_at: new Date().toISOString(),
                    terms_version: termsVersion || TERMS_VERSION,
                })

            if (insertError) {
                setError(insertError.message)
                setSubmitting(false)
                return
            }

            // Promote role to organiser immediately
            await supabase
                .from('profiles')
                .update({ role: 'organiser' })
                .eq('id', userId)

            // Notify support + send organiser welcome email (both best-effort)
            await Promise.all([
                fetch('/api/notifications/organiser-apply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orgName, role, website, description, monthlyEvents, email: userEmail }),
                }).catch(() => {}),
                fetch('/api/notifications/organiser-welcome', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orgName }),
                }).catch(() => {}),
            ])

            router.push('/organiser')
        } catch {
            setError('Something went wrong. Please try again.')
            setSubmitting(false)
        }
    }

    const inputClass = "w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/25"
    const labelClass = "text-xs font-semibold text-muted mb-1.5 block"

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organiser Type Selection */}
            <div>
                <p className="text-sm font-bold mb-0.5">What type of organiser are you?</p>
                <p className="text-xs text-muted mb-3">This helps us personalise your experience.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {ORG_TYPES.map(t => (
                        <label key={t.value} className="cursor-pointer">
                            <input
                                type="radio"
                                name="organiser_type"
                                value={t.value}
                                checked={orgType === t.value}
                                onChange={() => { setOrgType(t.value); setTypeError('') }}
                                className="peer sr-only"
                            />
                            <div className="h-full rounded-2xl border border-border bg-background p-4 text-center transition hover:border-accent peer-checked:border-accent peer-checked:bg-warm-red/5 peer-checked:shadow-card peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40">
                                <div className="w-11 h-11 mx-auto rounded-full bg-card border border-border flex items-center justify-center text-xl">{t.emoji}</div>
                                <p className="font-bold text-sm mt-2.5">{t.name}</p>
                                <p className="text-xs text-muted mt-1">{t.description}</p>
                            </div>
                        </label>
                    ))}
                </div>
                {typeError && <p className="text-accent text-xs font-semibold mt-2">{typeError}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className={labelClass}>Organisation name *</label>
                    <input type="text" required value={orgName} onChange={e => setOrgName(e.target.value)} className={inputClass} placeholder="Your company or event brand name" />
                </div>
                <div>
                    <label className={labelClass}>Your role / title</label>
                    <input type="text" value={role} onChange={e => setRole(e.target.value)} className={inputClass} placeholder="e.g. Event Manager, Promoter" />
                </div>
                <div>
                    <label className={labelClass}>Website</label>
                    <input type="url" value={website} onChange={e => setWebsite(e.target.value)} className={inputClass} placeholder="https://" />
                </div>
            </div>

            <div>
                <label className={labelClass}>What kind of events do you run? *</label>
                <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="Tell us about your events…" />
            </div>

            <div>
                <label className={labelClass}>Expected monthly events *</label>
                <ThemedSelect required value={monthlyEvents} onChange={e => setMonthlyEvents(e.target.value)} className="w-full">
                    <option value="">Select…</option>
                    <option value="1-2">1–2 events</option>
                    <option value="3-5">3–5 events</option>
                    <option value="6-10">6–10 events</option>
                    <option value="10+">10+ events</option>
                </ThemedSelect>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-bold">VAT registered</p>
                        <p className="text-xs text-muted">Switch on if your organisation is registered for VAT.</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={vatRegistered}
                        onClick={() => setVatRegistered(!vatRegistered)}
                        className={`w-11 h-6 rounded-full relative shrink-0 transition-colors ${vatRegistered ? 'bg-accent' : 'bg-border'}`}
                    >
                        <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${vatRegistered ? 'left-[23px]' : 'left-[3px]'}`} />
                    </button>
                </div>
                {vatRegistered && (
                    <div className="mt-4">
                        <label className={labelClass}>VAT number</label>
                        <input type="text" value={vatNumber} onChange={e => setVatNumber(e.target.value)} className={`${inputClass} font-mono bg-card`} placeholder="GB123456789" />
                    </div>
                )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)} className="mt-1 w-4 h-4 accent-[#E63950]" />
                <span className="text-sm text-muted leading-relaxed">
                    I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-accent font-semibold hover:underline">Terms &amp; Conditions</a> (including the Event Organiser and Attendee Data Protection sections) and confirm I am authorised to create events on behalf of this organisation.
                </span>
            </label>

            {error && <p className="text-xs font-semibold text-accent">{error}</p>}

            <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-full bg-accent text-white font-semibold shadow-glow hover:brightness-110 transition disabled:opacity-60 disabled:shadow-none"
            >
                {submitting ? 'Creating Account...' : 'Create Organiser Account'}
            </button>
        </form>
    )
}
