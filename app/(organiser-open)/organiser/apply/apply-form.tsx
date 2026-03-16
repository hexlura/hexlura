'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

interface ApplyFormProps {
    userId: string
    userEmail: string
}

export function ApplyForm({ userId, userEmail }: ApplyFormProps) {
    const router = useRouter()
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

    function toSlug(name: string) {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!agreedTerms) return setError('You must agree to the organiser terms')
        setSubmitting(true)
        setError('')

        try {
            const supabase = createClient()
            const baseSlug = toSlug(orgName)
            const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`

            // Create organiser profile
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
                    is_approved: false,
                })

            if (insertError) {
                setError(insertError.message)
                setSubmitting(false)
                return
            }

            // Notify support
            await fetch('/api/notifications/organiser-apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orgName, role, website, description, monthlyEvents, email: userEmail }),
            }).catch(() => {}) // best effort

            router.push('/organiser/pending')
        } catch {
            setError('Something went wrong. Please try again.')
            setSubmitting(false)
        }
    }

    const inputClass = "w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
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
                <div onClick={() => setVatRegistered(!vatRegistered)} className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${vatRegistered ? 'bg-accent' : 'bg-border'}`}>
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
                    I agree to the <a href="#" className="text-accent hover:underline">Organiser Terms</a> and understand that my account will be reviewed before activation.
                </span>
            </label>
            {error && <p className="text-accent text-xs">{error}</p>}
            <Button type="submit" variant="primary" size="lg" disabled={submitting} className="w-full">
                {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>
        </form>
    )
}
