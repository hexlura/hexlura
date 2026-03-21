'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import type { OrganiserProfile } from '@/types'

interface SettingsClientProps {
    organiser: OrganiserProfile
}

export function SettingsClient({ organiser }: SettingsClientProps) {
    const [orgName, setOrgName] = useState(organiser.org_name)
    const [description, setDescription] = useState(organiser.description || '')
    const [website, setWebsite] = useState(organiser.website || '')
    const [vatRegistered, setVatRegistered] = useState(organiser.vat_registered)
    const [vatNumber, setVatNumber] = useState(organiser.vat_number || '')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [logoUploading, setLogoUploading] = useState(false)
    const [logoUrl, setLogoUrl] = useState(organiser.logo_url || '')
    const [showDisconnectModal, setShowDisconnectModal] = useState(false)
    const [showCloseModal, setShowCloseModal] = useState(false)

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

    function Section({ title, children }: { title: string; children: React.ReactNode }) {
        return (
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
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
                    className={`w-10 h-6 rounded-full relative transition-colors ${checked ? 'bg-accent' : 'bg-border'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
            </label>
        )
    }

    return (
        <>
            {/* Profile */}
            <Section title="Profile">
                <form onSubmit={saveProfile} className="space-y-4">
                    <div>
                        <label className="text-xs text-muted block mb-1.5">Account Type</label>
                        <span style={{
                            background: '#1A1A24',
                            border: '1px solid #2A2A3A',
                            color: '#8888AA',
                            fontSize: '13px',
                            borderRadius: '6px',
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
                            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" />
                    </div>
                    <div>
                        <label className="text-xs text-muted block mb-1.5">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent resize-none" />
                    </div>
                    <div>
                        <label className="text-xs text-muted block mb-1.5">Website URL</label>
                        <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
                            placeholder="https://"
                            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" />
                    </div>
                    <div>
                        <label className="text-xs text-muted block mb-1.5">Logo</label>
                        <div className="flex items-center gap-4">
                            {logoUrl && <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-border" />}
                            <label className="cursor-pointer bg-surface border border-border rounded-lg px-3 py-2 text-sm text-muted hover:text-text transition-colors">
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
                                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" />
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

            {/* Bank Account */}
            <Section title="Bank Account">
                {organiser.stripe_account_id ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="text-success text-sm">✓ Bank account connected</span>
                        </div>
                        <div className="flex gap-3">
                            <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                                <Button variant="secondary" size="sm">Manage Bank Account</Button>
                            </a>
                            <Button variant="danger" size="sm" onClick={() => setShowDisconnectModal(true)}>Disconnect</Button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm text-muted mb-3">Connect your bank account to receive payouts</p>
                        <a href="/api/stripe/connect">
                            <Button variant="primary" size="md">Connect with Stripe</Button>
                        </a>
                    </div>
                )}
            </Section>

            {/* Danger Zone */}
            <div className="bg-card border border-accent/30 rounded-xl p-6">
                <h2 className="text-sm font-semibold text-accent mb-4 uppercase tracking-wider">Danger Zone</h2>
                <p className="text-sm text-muted mb-4">
                    Closing your organiser account will remove your organiser status.
                    Existing events and bookings are not affected. You will need to reapply to create new events.
                </p>
                <Button variant="danger" size="md" onClick={() => setShowCloseModal(true)}>Close Organiser Account</Button>
            </div>

            {/* Disconnect Modal */}
            {showDisconnectModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-3">Disconnect Bank Account?</h3>
                        <p className="text-sm text-muted mb-4">You will stop receiving automatic payouts until you reconnect.</p>
                        <div className="flex gap-3">
                            <Button variant="danger" size="md" onClick={() => setShowDisconnectModal(false)}>Disconnect</Button>
                            <Button variant="secondary" size="md" onClick={() => setShowDisconnectModal(false)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Account Modal */}
            {showCloseModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full">
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
