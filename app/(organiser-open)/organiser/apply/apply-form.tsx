'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
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

    const inputClass = "w-full bg-surface border border-border rounded-sm px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Organiser Type Selection */}
            <div>
                <p className="text-sm font-semibold text-text mb-1">What type of organiser are you?</p>
                <p className="text-xs text-muted mb-3">This helps us personalise your experience</p>
                <div className="grid grid-cols-3 gap-3">
                    {ORG_TYPES.map(t => (
                        <div
                            key={t.value}
                            onClick={() => { setOrgType(t.value); setTypeError('') }}
                            style={{
                                background: orgType === t.value ? 'rgba(230,57,80,0.1)' : '#1A1A24',
                                border: `1px solid ${orgType === t.value ? '#E63950' : '#2A2A3A'}`,
                                borderRadius: '12px',
                                padding: '20px 16px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => {
                                if (orgType !== t.value) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(230,57,80,0.5)'
                            }}
                            onMouseLeave={e => {
                                if (orgType !== t.value) (e.currentTarget as HTMLDivElement).style.borderColor = '#2A2A3A'
                            }}
                        >
                            <div style={{ fontSize: '28px' }}>{t.emoji}</div>
                            <div style={{ fontWeight: 'bold', color: 'white', fontSize: '14px', marginTop: '8px' }}>{t.name}</div>
                            <div style={{ color: '#8888AA', fontSize: '12px', marginTop: '4px' }}>{t.description}</div>
                        </div>
                    ))}
                </div>
                {typeError && <p className="text-accent text-xs mt-2">{typeError}</p>}
            </div>

            <div>
                <label className="text-xs text-muted block mb-1.5">Organisation Name *</label>
                <input type="text" required value={orgName} onChange={e => setOrgName(e.target.value)} className={inputClass} placeholder="Your company or event brand name" />
            </div>
            <div>
                <label className="text-xs text-muted block mb-1.5">Your Role / Title</label>
                <input type="text" value={role} onChange={e => setRole(e.target.value)} className={inputClass} placeholder="e.g. Event Manager, Promoter" />
            </div>
            <div>
                <label className="text-xs text-muted block mb-1.5">Website URL</label>
                <input type="url" value={website} onChange={e => setWebsite(e.target.value)} className={inputClass} placeholder="https://" />
            </div>
            <div>
                <label className="text-xs text-muted block mb-1.5">What kind of events do you run? *</label>
                <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="Tell us about your events..." />
            </div>
            <div>
                <label className="text-xs text-muted block mb-1.5">Expected monthly events *</label>
                <select required value={monthlyEvents} onChange={e => setMonthlyEvents(e.target.value)} className={inputClass}>
                    <option value="">Select...</option>
                    <option value="1-2">1–2 events</option>
                    <option value="3-5">3–5 events</option>
                    <option value="6-10">6–10 events</option>
                    <option value="10+">10+ events</option>
                </select>
            </div>
            <div className="flex items-center justify-between py-2">
                <span className="text-sm text-text">VAT Registered</span>
                <div onClick={() => setVatRegistered(!vatRegistered)} className={`w-10 h-6 rounded-sm relative transition-colors cursor-pointer ${vatRegistered ? 'bg-accent' : 'bg-border'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${vatRegistered ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
            </div>
            {vatRegistered && (
                <div>
                    <label className="text-xs text-muted block mb-1.5">VAT Number</label>
                    <input type="text" value={vatNumber} onChange={e => setVatNumber(e.target.value)} className={inputClass} placeholder="GB123456789" />
                </div>
            )}
            <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)} className="mt-0.5 accent-accent" />
                <span className="text-sm text-muted">
                    I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Terms &amp; Conditions</a> (including the Event Organiser and Attendee Data Protection sections) and confirm I am authorised to create events on behalf of this organisation.
                </span>
            </label>
            {error && <p className="text-accent text-xs">{error}</p>}
            <Button type="submit" variant="primary" size="lg" disabled={submitting} className="w-full">
                {submitting ? 'Creating Account...' : 'Create Organiser Account'}
            </Button>
        </form>
    )
}
