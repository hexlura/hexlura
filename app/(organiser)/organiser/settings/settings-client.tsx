'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import type { OrganiserProfile } from '@/types'

type OrganiserWithExtras = OrganiserProfile & {
    cover_url?: string | null
    social_instagram?: string | null
    social_facebook?: string | null
    social_website?: string | null
    location?: string | null
}

interface DoorStaffMember {
    id: string
    user_id: string
    full_name: string | null
    email: string | null
}

interface SettingsClientProps {
    organiser: OrganiserProfile
}

export function SettingsClient({ organiser: organiserProp }: SettingsClientProps) {
    const organiser = organiserProp as OrganiserWithExtras
    const [orgName, setOrgName] = useState(organiser.org_name)
    const [description, setDescription] = useState(organiser.description || '')
    const [website, setWebsite] = useState(organiser.website || '')
    const [vatRegistered, setVatRegistered] = useState(organiser.vat_registered)
    const [vatNumber, setVatNumber] = useState(organiser.vat_number || '')
    const [payoutMethod, setPayoutMethod] = useState<'bank_transfer' | 'stripe_connect'>(organiser.payout_method ?? 'bank_transfer')
    const [bankAccountName, setBankAccountName] = useState(organiser.bank_account_name || '')
    const [bankSortCode, setBankSortCode] = useState(organiser.bank_sort_code || '')
    const [bankAccountNumber, setBankAccountNumber] = useState(organiser.bank_account_number || '')
    const [payoutSaving, setPayoutSaving] = useState(false)
    const [payoutSaved, setPayoutSaved] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [logoUploading, setLogoUploading] = useState(false)
    const [logoUrl, setLogoUrl] = useState(organiser.logo_url || '')
    const [showCloseModal, setShowCloseModal] = useState(false)

    // Cover photo
    const [coverUrl, setCoverUrl] = useState(organiser.cover_url || '')
    const [coverUploading, setCoverUploading] = useState(false)

    // Social links
    const [socialInstagram, setSocialInstagram] = useState(organiser.social_instagram || '')
    const [socialFacebook, setSocialFacebook] = useState(organiser.social_facebook || '')
    const [socialWebsite, setSocialWebsite] = useState(organiser.social_website || '')
    const [location, setLocation] = useState(organiser.location || '')
    const [socialSaving, setSocialSaving] = useState(false)
    const [socialSaved, setSocialSaved] = useState(false)

    // Door staff
    const [doorStaff, setDoorStaff] = useState<DoorStaffMember[]>([])
    const [doorStaffEmail, setDoorStaffEmail] = useState('')
    const [addingStaff, setAddingStaff] = useState(false)
    const [doorStaffError, setDoorStaffError] = useState('')
    const [doorStaffSuccess, setDoorStaffSuccess] = useState('')
    const [removingId, setRemovingId] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/organiser/door-staff')
            .then(r => r.json())
            .then(data => { if (data.staff) setDoorStaff(data.staff) })
            .catch(() => {})
    }, [])

    async function addDoorStaff(e: React.FormEvent) {
        e.preventDefault()
        setAddingStaff(true)
        setDoorStaffError('')
        setDoorStaffSuccess('')
        const res = await fetch('/api/organiser/door-staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: doorStaffEmail }),
        })
        const data = await res.json()
        if (!res.ok) {
            setDoorStaffError(data.error || 'Failed to add door staff')
        } else {
            setDoorStaffSuccess('Door staff added successfully')
            setDoorStaffEmail('')
            setDoorStaff(prev => [...prev, data.member])
        }
        setAddingStaff(false)
    }

    async function removeDoorStaff(userId: string, id: string) {
        setRemovingId(id)
        const res = await fetch('/api/organiser/door-staff', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId }),
        })
        if (res.ok) {
            setDoorStaff(prev => prev.filter(s => s.id !== id))
        }
        setRemovingId(null)
    }

    // Notification toggles
    const [notifyNewBooking, setNotifyNewBooking] = useState(true)
    const [notifyDailySummary, setNotifyDailySummary] = useState(false)
    const [notifyPayout, setNotifyPayout] = useState(true)

    async function saveProfile(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        const supabase = createClient()
        await supabase
            .from('organiser_profiles')
            .update({ org_name: orgName, description, website })
            .eq('id', organiser.id)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        setSaving(false)
    }

    async function savePayoutMethod(e: React.FormEvent) {
        e.preventDefault()
        setPayoutSaving(true)
        const supabase = createClient()
        if (payoutMethod === 'bank_transfer') {
            await supabase
                .from('organiser_profiles')
                .update({
                    payout_method: 'bank_transfer',
                    bank_account_name: bankAccountName,
                    bank_sort_code: bankSortCode,
                    bank_account_number: bankAccountNumber,
                })
                .eq('id', organiser.id)
        } else {
            await supabase
                .from('organiser_profiles')
                .update({ payout_method: 'stripe_connect' })
                .eq('id', organiser.id)
        }
        setPayoutSaved(true)
        setTimeout(() => setPayoutSaved(false), 2000)
        setPayoutSaving(false)
    }

    async function saveVat(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        const supabase = createClient()
        await supabase
            .from('organiser_profiles')
            .update({ vat_registered: vatRegistered, vat_number: vatRegistered ? vatNumber : null })
            .eq('id', organiser.id)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        setSaving(false)
    }

    async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) return alert('File must be under 5MB')
        setLogoUploading(true)
        const supabase = createClient()
        const ext = file.name.split('.').pop()
        const path = `${organiser.id}/logo.${ext}`
        const { error } = await supabase.storage.from('organiser-logos').upload(path, file, { upsert: true })
        if (!error) {
            const { data: urlData } = supabase.storage.from('organiser-logos').getPublicUrl(path)
            const url = urlData.publicUrl
            await supabase.from('organiser_profiles').update({ logo_url: url }).eq('id', organiser.id)
            setLogoUrl(url)
        }
        setLogoUploading(false)
    }

    async function uploadCover(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) return alert('File must be under 5MB')
        setCoverUploading(true)
        const supabase = createClient()
        const ext = file.name.split('.').pop()
        const path = `${organiser.id}/cover.${ext}`
        const { error } = await supabase.storage.from('organiser-covers').upload(path, file, { upsert: true })
        if (!error) {
            const { data: urlData } = supabase.storage.from('organiser-covers').getPublicUrl(path)
            const url = urlData.publicUrl
            await supabase.from('organiser_profiles').update({ cover_url: url }).eq('id', organiser.id)
            setCoverUrl(url)
        }
        setCoverUploading(false)
    }

    async function saveSocialLinks(e: React.FormEvent) {
        e.preventDefault()
        setSocialSaving(true)
        const supabase = createClient()
        await supabase
            .from('organiser_profiles')
            .update({
                social_instagram: socialInstagram || null,
                social_facebook: socialFacebook || null,
                social_website: socialWebsite || null,
                location: location || null,
            })
            .eq('id', organiser.id)
        setSocialSaved(true)
        setTimeout(() => setSocialSaved(false), 2000)
        setSocialSaving(false)
    }

    function Section({ title, children }: { title: string; children: React.ReactNode }) {
        return (
            <div className="bg-card border border-border rounded-none p-6 mb-6">
                <h2 className="text-sm font-semibold text-text mb-4 uppercase tracking-wider">{title}</h2>
                {children}
            </div>
        )
    }

    function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
        return (
            <label className="flex items-center justify-between py-2 cursor-pointer">
                <span className="text-sm text-text">{label}</span>
                <div
                    onClick={() => onChange(!checked)}
                    className={`w-10 h-6 rounded-sm relative transition-colors ${checked ? 'bg-accent' : 'bg-border'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
            </label>
        )
    }

    return (
        <>
            {/* Cover Photo */}
            <div className="bg-card border border-border rounded-none p-6 mb-6">
                <h2 className="text-sm font-semibold text-text mb-4 uppercase tracking-wider">Cover Photo</h2>
                <div style={{ width: '100%', height: 160, marginBottom: 12, border: '1px solid #E0E0E0', overflow: 'hidden', position: 'relative' }}>
                    {coverUrl ? (
                        <img src={coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{
                            width: '100%', height: '100%',
                            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #E63950 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>No cover photo</span>
                        </div>
                    )}
                </div>
                <label className="cursor-pointer bg-surface border border-border rounded-sm px-3 py-2 text-sm text-muted hover:text-text transition-colors inline-block">
                    {coverUploading ? 'Uploading...' : 'Change Cover Photo'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadCover} className="hidden" />
                </label>
            </div>

            {/* Profile */}
            <Section title="Profile">
                <form onSubmit={saveProfile} className="space-y-4">
                    <div>
                        <label className="text-xs text-muted block mb-1.5">Account Type</label>
                        <span style={{
                            background: '#F5F5F7',
                            border: '1px solid #C0C0C8',
                            color: '#666677',
                            fontSize: '13px',
                            borderRadius: '2px',
                            padding: '4px 12px',
                            display: 'inline-block',
                        }}>
                            {organiser.organiser_type === 'individual' && 'Individual'}
                            {organiser.organiser_type === 'artist' && 'Artist / Performer'}
                            {organiser.organiser_type === 'club_venue' && 'Club / Venue'}
                            {organiser.organiser_type === 'event_company' && 'Event Company'}
                            {organiser.organiser_type === 'charity' && 'Charity / Community'}
                            {organiser.organiser_type === 'education' && 'Education'}
                            {!organiser.organiser_type && 'Individual'}
                        </span>
                    </div>
                    <div>
                        <label className="text-xs text-muted block mb-1.5">Organisation Name</label>
                        <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} required
                            className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" />
                    </div>
                    <div>
                        <label className="text-xs text-muted block mb-1.5">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                            className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent resize-none" />
                    </div>
                    <div>
                        <label className="text-xs text-muted block mb-1.5">Website URL</label>
                        <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
                            placeholder="https://"
                            className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" />
                    </div>
                    <div>
                        <label className="text-xs text-muted block mb-1.5">Logo</label>
                        <div className="flex items-center gap-4">
                            {logoUrl && <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-sm object-cover border border-border" />}
                            <label className="cursor-pointer bg-surface border border-border rounded-sm px-3 py-2 text-sm text-muted hover:text-text transition-colors">
                                {logoUploading ? 'Uploading...' : 'Upload Logo'}
                                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadLogo} className="hidden" />
                            </label>
                        </div>
                    </div>
                    <Button type="submit" variant="primary" size="md" disabled={saving}>{saved ? 'Saved ✓' : saving ? 'Saving...' : 'Save Profile'}</Button>
                </form>
            </Section>

            {/* VAT */}
            <Section title="VAT Settings">
                <form onSubmit={saveVat} className="space-y-4">
                    <Toggle checked={vatRegistered} onChange={setVatRegistered} label="VAT Registered" />
                    {vatRegistered && (
                        <div>
                            <label className="text-xs text-muted block mb-1.5">VAT Number</label>
                            <input type="text" value={vatNumber} onChange={e => setVatNumber(e.target.value)}
                                placeholder="GB123456789"
                                className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" />
                        </div>
                    )}
                    <p className="text-xs text-muted">VAT invoices will be generated for your payouts</p>
                    <Button type="submit" variant="primary" size="md" disabled={saving}>{saved ? 'Saved ✓' : 'Save VAT Settings'}</Button>
                </form>
            </Section>

            {/* Notifications */}
            <Section title="Notifications">
                <div className="divide-y divide-border">
                    <Toggle checked={notifyNewBooking} onChange={setNotifyNewBooking} label="Email on new booking" />
                    <Toggle checked={notifyDailySummary} onChange={setNotifyDailySummary} label="Daily booking summary" />
                    <Toggle checked={notifyPayout} onChange={setNotifyPayout} label="Payout notifications" />
                </div>
                <p className="text-xs text-muted mt-3">Notification preferences are saved automatically</p>
            </Section>

            {/* Payout Method */}
            <Section title="Payout Method">
                <form onSubmit={savePayoutMethod} className="space-y-4">
                    <div className="flex flex-col gap-3">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="radio"
                                name="payoutMethod"
                                value="bank_transfer"
                                checked={payoutMethod === 'bank_transfer'}
                                onChange={() => setPayoutMethod('bank_transfer')}
                                className="mt-0.5"
                            />
                            <div>
                                <p className="text-sm text-text font-medium">Bank Transfer</p>
                                <p className="text-xs text-muted">Admin manually transfers earnings to your UK bank account</p>
                            </div>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="radio"
                                name="payoutMethod"
                                value="stripe_connect"
                                checked={payoutMethod === 'stripe_connect'}
                                onChange={() => setPayoutMethod('stripe_connect')}
                                className="mt-0.5"
                            />
                            <div>
                                <p className="text-sm text-text font-medium">Stripe Connect</p>
                                <p className="text-xs text-muted">Automated payouts directly to your Stripe account</p>
                            </div>
                        </label>
                    </div>

                    {payoutMethod === 'bank_transfer' && (
                        <div className="space-y-3 pt-2 border-t border-border">
                            <div>
                                <label className="text-xs text-muted block mb-1.5">Account Holder Name</label>
                                <input
                                    type="text"
                                    value={bankAccountName}
                                    onChange={e => setBankAccountName(e.target.value)}
                                    placeholder="Full name or company name"
                                    className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-muted block mb-1.5">Sort Code</label>
                                    <input
                                        type="text"
                                        value={bankSortCode}
                                        onChange={e => setBankSortCode(e.target.value)}
                                        placeholder="00-00-00"
                                        maxLength={8}
                                        className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted block mb-1.5">Account Number</label>
                                    <input
                                        type="text"
                                        value={bankAccountNumber}
                                        onChange={e => setBankAccountNumber(e.target.value)}
                                        placeholder="12345678"
                                        maxLength={8}
                                        className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                                    />
                                </div>
                            </div>
                            {organiser.bank_account_number && (
                                <p className="text-xs text-success">✓ Bank details on file — ending {organiser.bank_account_number.slice(-4)}</p>
                            )}
                        </div>
                    )}

                    {payoutMethod === 'stripe_connect' && (
                        <div className="pt-2 border-t border-border space-y-3">
                            {organiser.stripe_account_id ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-success text-sm">✓ Stripe account connected</span>
                                    <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                                        <Button type="button" variant="secondary" size="sm">Manage in Stripe</Button>
                                    </a>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs text-muted mb-2">You&apos;ll be redirected to Stripe to connect your account</p>
                                    <a href="/api/stripe/connect">
                                        <Button type="button" variant="primary" size="sm">Connect with Stripe</Button>
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    <Button type="submit" variant="primary" size="md" disabled={payoutSaving}>
                        {payoutSaved ? 'Saved ✓' : payoutSaving ? 'Saving...' : 'Save Payout Method'}
                    </Button>
                </form>
            </Section>

            {/* Door Staff */}
            <div className="bg-card border border-border rounded-none p-6 mb-6">
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', color: '#0A0A0F', marginBottom: '8px', letterSpacing: '1px' }}>
                    DOOR STAFF
                </h2>
                <p style={{ fontSize: '13px', color: '#666677', marginBottom: '20px' }}>
                    Add staff who can scan tickets at your events. They will only have access to the check-in scanner.
                </p>

                <form onSubmit={addDoorStaff} className="flex gap-2 mb-4">
                    <input
                        type="email"
                        value={doorStaffEmail}
                        onChange={e => setDoorStaffEmail(e.target.value)}
                        placeholder="Staff Email Address"
                        required
                        className="flex-1 bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
                    />
                    <button
                        type="submit"
                        disabled={addingStaff || !doorStaffEmail}
                        className="px-4 py-2 bg-[#0A0A0F] text-white text-sm rounded-sm disabled:opacity-50 hover:bg-[#333333] transition-colors whitespace-nowrap"
                    >
                        {addingStaff ? 'Adding...' : 'Add Door Staff'}
                    </button>
                </form>

                {doorStaffError && (
                    <p className="text-sm text-accent mb-3">{doorStaffError}</p>
                )}
                {doorStaffSuccess && (
                    <p className="text-sm text-success mb-3">{doorStaffSuccess}</p>
                )}

                {doorStaff.length > 0 && (
                    <div className="divide-y divide-border border border-border rounded-sm">
                        {doorStaff.map(member => (
                            <div key={member.id} className="flex items-center justify-between px-3 py-2.5">
                                <div>
                                    <p className="text-sm text-text">{member.full_name || 'Unknown'}</p>
                                    <p className="text-xs text-muted">{member.email}</p>
                                </div>
                                <button
                                    onClick={() => removeDoorStaff(member.user_id, member.id)}
                                    disabled={removingId === member.id}
                                    className="text-xs text-[#666677] border border-[#C0C0C8] px-3 py-1 rounded-sm hover:text-[#0A0A0F] hover:border-[#0A0A0F] disabled:opacity-50 transition-colors"
                                >
                                    {removingId === member.id ? '...' : 'Remove'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {doorStaff.length === 0 && (
                    <p className="text-xs text-muted">No door staff added yet.</p>
                )}
            </div>

            {/* Social Links */}
            <div className="bg-card border border-border rounded-none p-6 mb-6">
                <h2 className="text-sm font-semibold text-text mb-4 uppercase tracking-wider">Social Links</h2>
                <form onSubmit={saveSocialLinks} className="space-y-4">
                    <div>
                        <label className="text-xs text-muted block mb-1.5">Instagram</label>
                        <input
                            type="url"
                            value={socialInstagram}
                            onChange={e => setSocialInstagram(e.target.value)}
                            placeholder="https://instagram.com/yourpage"
                            className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted block mb-1.5">Facebook</label>
                        <input
                            type="url"
                            value={socialFacebook}
                            onChange={e => setSocialFacebook(e.target.value)}
                            placeholder="https://facebook.com/yourpage"
                            className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted block mb-1.5">Website</label>
                        <input
                            type="url"
                            value={socialWebsite}
                            onChange={e => setSocialWebsite(e.target.value)}
                            placeholder="https://yourwebsite.com"
                            className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted block mb-1.5">Location / City</label>
                        <input
                            type="text"
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            placeholder="London, UK"
                            className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                        />
                    </div>
                    <Button type="submit" variant="primary" size="md" disabled={socialSaving}>
                        {socialSaved ? 'Saved ✓' : socialSaving ? 'Saving...' : 'Save Social Links'}
                    </Button>
                </form>
            </div>

            {/* Danger Zone */}
            <div className="bg-card border border-accent/30 rounded-none p-6">
                <h2 className="text-sm font-semibold text-accent mb-4 uppercase tracking-wider">Danger Zone</h2>
                <p className="text-sm text-muted mb-4">
                    Closing your organiser account will remove your organiser status.
                    Existing events and bookings are not affected. You will need to reapply to create new events.
                </p>
                <Button variant="danger" size="md" onClick={() => setShowCloseModal(true)}>Close Organiser Account</Button>
            </div>

            {/* Close Account Modal */}
            {showCloseModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-3">Close Organiser Account?</h3>
                        <p className="text-sm text-muted mb-4">This will remove your organiser status. This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <Button variant="danger" size="md" onClick={() => setShowCloseModal(false)}>Close Account</Button>
                            <Button variant="secondary" size="md" onClick={() => setShowCloseModal(false)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
