'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compress-image'
import { Button } from '@/components/ui/Button'
import type { OrganiserProfile } from '@/types'

const PLATFORMS = [
    { key: 'instagram', label: 'Instagram', icon: '📷', placeholder: 'https://instagram.com/yourpage', color: '#E1306C' },
    { key: 'facebook', label: 'Facebook', icon: '👥', placeholder: 'https://facebook.com/yourpage', color: '#1877F2' },
    { key: 'tiktok', label: 'TikTok', icon: '🎵', placeholder: 'https://tiktok.com/@yourpage', color: '#000000' },
    { key: 'youtube', label: 'YouTube', icon: '▶️', placeholder: 'https://youtube.com/@yourchannel', color: '#FF0000' },
    { key: 'twitter', label: 'X (Twitter)', icon: '𝕏', placeholder: 'https://x.com/yourhandle', color: '#000000' },
    { key: 'linkedin', label: 'LinkedIn', icon: '💼', placeholder: 'https://linkedin.com/in/yourprofile', color: '#0A66C2' },
    { key: 'spotify', label: 'Spotify', icon: '🎧', placeholder: 'https://open.spotify.com/artist/...', color: '#1DB954' },
    { key: 'soundcloud', label: 'SoundCloud', icon: '☁️', placeholder: 'https://soundcloud.com/yourpage', color: '#FF5500' },
    { key: 'website', label: 'Website', icon: '🌐', placeholder: 'https://yourwebsite.com', color: '#0A0A0F' },
]

type OrganiserWithExtras = OrganiserProfile & {
    cover_url?: string | null
    social_instagram?: string | null
    social_facebook?: string | null
    social_website?: string | null
    location?: string | null
    social_links?: Record<string, string> | null
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className="bg-card border border-border rounded-none mb-6">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-6 cursor-pointer"
            >
                <h2 className="text-sm font-semibold text-text uppercase tracking-wider m-0">{title}</h2>
                <svg
                    width="16" height="16" viewBox="0 0 16 16" fill="none"
                    className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`}
                >
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {open && <div className="px-6 pb-6">{children}</div>}
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

interface SettingsClientProps {
    organiser: OrganiserProfile
    stripeConnectEnabled?: boolean
}

export function SettingsClient({ organiser: organiserProp, stripeConnectEnabled = false }: SettingsClientProps) {
    const organiser = organiserProp as OrganiserWithExtras
    const router = useRouter()
    const searchParams = useSearchParams()

    // Identity verification state
    const [identityStatus, setIdentityStatus] = useState(organiser.identity_status ?? null)
    const [identityVerifiedAt] = useState(organiser.identity_verified_at)
    const [identityFailureReason] = useState(organiser.identity_failure_reason)
    const [identityStarting, setIdentityStarting] = useState(false)
    const [identityToast, setIdentityToast] = useState<string | null>(null)

    useEffect(() => {
        if (searchParams.get('identity') === 'done') {
            setIdentityToast('We’re processing your verification — this usually completes in a few seconds.')
            // Clear the query param without triggering a server roundtrip
            const newParams = new URLSearchParams(searchParams.toString())
            newParams.delete('identity')
            router.replace(`/organiser/settings${newParams.toString() ? `?${newParams.toString()}` : ''}#identity`)
            const t = setTimeout(() => setIdentityToast(null), 6000)
            return () => clearTimeout(t)
        }
    }, [searchParams, router])

    async function handleStartIdentity() {
        setIdentityStarting(true)
        try {
            const res = await fetch('/api/organiser/identity/start', { method: 'POST' })
            const json = await res.json()
            if (!res.ok || !json.url) {
                setIdentityToast(json.error || 'Could not start verification. Try again.')
                setIdentityStarting(false)
                return
            }
            setIdentityStatus('processing')
            window.location.href = json.url
        } catch {
            setIdentityToast('Network error — try again.')
            setIdentityStarting(false)
        }
    }

    const [identityRefreshing, setIdentityRefreshing] = useState(false)
    async function handleRefreshIdentity() {
        setIdentityRefreshing(true)
        try {
            const res = await fetch('/api/organiser/identity/refresh', { method: 'POST' })
            const json = await res.json()
            if (!res.ok) {
                setIdentityToast(json.error || 'Could not refresh status.')
                setIdentityRefreshing(false)
                return
            }
            // Status changed — reload the page so the section re-renders with fresh data
            if (json.status && json.status !== identityStatus) {
                router.refresh()
            } else {
                setIdentityToast('Still processing — give it another moment.')
            }
            setIdentityRefreshing(false)
        } catch {
            setIdentityToast('Network error — try again.')
            setIdentityRefreshing(false)
        }
    }

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
    const [closingAccount, setClosingAccount] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deletingAccount, setDeletingAccount] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    async function handleCloseAccount() {
        setClosingAccount(true)
        const res = await fetch('/api/organiser/close-account', { method: 'POST' })
        if (res.ok) {
            window.location.href = '/'
        } else {
            setClosingAccount(false)
            alert('Something went wrong. Please try again.')
        }
    }

    async function handleDeleteAccount() {
        setDeletingAccount(true)
        setDeleteError(null)
        const res = await fetch('/api/organiser/delete-account', { method: 'POST' })
        if (res.ok) {
            window.location.href = '/'
        } else {
            const json = await res.json()
            setDeleteError(json.error || 'Something went wrong. Please try again.')
            setDeletingAccount(false)
        }
    }

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

    // Dynamic social links (JSONB)
    const [socialLinksData, setSocialLinksData] = useState<Record<string, string>>({})
    const [activeLinksKeys, setActiveLinksKeys] = useState<string[]>([])
    const [showPlatformDropdown, setShowPlatformDropdown] = useState(false)
    const [newSocialSaving, setNewSocialSaving] = useState(false)
    const [newSocialSaved, setNewSocialSaved] = useState(false)
    const [metaPixelId, setMetaPixelId] = useState(organiser.meta_pixel_id || '')
    const [analyticsSaving, setAnalyticsSaving] = useState(false)
    const [analyticsSaved, setAnalyticsSaved] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const existing = organiser.social_links || {}
        setSocialLinksData(existing)
        setActiveLinksKeys(Object.keys(existing).filter(k => existing[k]))
    }, [organiser.social_links])

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowPlatformDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    async function saveAnalytics(e: React.FormEvent) {
        e.preventDefault()
        setAnalyticsSaving(true)
        const supabase = createClient()
        await supabase
            .from('organiser_profiles')
            .update({ meta_pixel_id: metaPixelId.trim() || null })
            .eq('id', organiser.id)
        setAnalyticsSaved(true)
        setTimeout(() => setAnalyticsSaved(false), 2000)
        setAnalyticsSaving(false)
    }

    async function saveNewSocialLinks() {
        setNewSocialSaving(true)
        const supabase = createClient()
        const linksToSave: Record<string, string> = {}
        for (const key of activeLinksKeys) {
            if (socialLinksData[key]) linksToSave[key] = socialLinksData[key]
        }
        await supabase.from('organiser_profiles').update({ social_links: linksToSave }).eq('id', organiser.id)
        setNewSocialSaved(true)
        setTimeout(() => setNewSocialSaved(false), 2000)
        setNewSocialSaving(false)
    }

    // Notification toggles
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
        setLogoUploading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLogoUploading(false); return }
        let blob: Blob
        try { blob = await compressImage(file, 400) } catch { blob = file }
        const path = `${user.id}/logo.webp`
        const { error } = await supabase.storage.from('organiser-logos').upload(path, blob, { upsert: true, contentType: 'image/webp' })
        if (error) { alert('Upload failed. Please try again.'); setLogoUploading(false); return }
        const { data: urlData } = supabase.storage.from('organiser-logos').getPublicUrl(path)
        const url = urlData.publicUrl
        await supabase.from('organiser_profiles').update({ logo_url: url }).eq('id', organiser.id)
        await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
        setLogoUrl(url)
        setLogoUploading(false)
    }

    async function uploadCover(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setCoverUploading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setCoverUploading(false); return }
        let blob: Blob
        try { blob = await compressImage(file, 1600) } catch { blob = file }
        const path = `${user.id}/cover.webp`
        const { error } = await supabase.storage.from('organiser-covers').upload(path, blob, { upsert: true, contentType: 'image/webp' })
        if (error) { alert('Upload failed. Please try again.'); setCoverUploading(false); return }
        const { data: urlData } = supabase.storage.from('organiser-covers').getPublicUrl(path)
        const url = urlData.publicUrl
        await supabase.from('organiser_profiles').update({ cover_url: url }).eq('id', organiser.id)
        setCoverUrl(url)
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

    return (
        <>
            {/* Cover Photo */}
            <Section title="Cover Photo">
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
                <div className="flex items-center gap-3">
                    <label className="cursor-pointer bg-surface border border-border rounded-sm px-3 py-2 text-sm text-muted hover:text-text transition-colors inline-block">
                        {coverUploading ? 'Uploading...' : 'Change Cover Photo'}
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadCover} className="hidden" />
                    </label>
                    <span style={{ fontSize: 11, color: '#8888AA' }}>Recommended: 1200 x 400px (3:1 ratio). Max 5MB. JPG, PNG or WebP.</span>
                </div>
            </Section>

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
                        <label className="text-xs text-muted block mb-1.5">Bio</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} maxLength={300}
                            placeholder="Tell people about yourself or your organisation..."
                            className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent resize-none" />
                        <p className="text-xs text-muted mt-1 text-right">{description.length}/300</p>
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
                    <Toggle checked={notifyDailySummary} onChange={setNotifyDailySummary} label="Daily booking summary" />
                    <Toggle checked={notifyPayout} onChange={setNotifyPayout} label="Payout notifications" />
                </div>
                <p className="text-xs text-muted mt-3">Notification preferences are saved automatically</p>
            </Section>

            {/* Identity Verification */}
            <div id="identity" />
            <Section title="Identity Verification" defaultOpen={identityStatus !== 'verified'}>
                {identityToast && (
                    <div className="mb-4 bg-blue-500/10 border border-blue-500/30 text-blue-600 px-3 py-2 rounded-sm text-sm">
                        {identityToast}
                    </div>
                )}

                {identityStatus === 'verified' && identityVerifiedAt && (
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 bg-success/10 border border-success/30 text-success px-3 py-2 rounded-sm text-sm">
                            <span>✓</span>
                            <span>Verified on {new Date(identityVerifiedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <p className="text-xs text-muted">Your identity is on file. You can request payouts whenever your balance is available.</p>
                    </div>
                )}

                {identityStatus === 'processing' && (
                    <div className="space-y-3">
                        <p className="text-sm text-text">Verification in progress — Stripe is reviewing your submission.</p>
                        <p className="text-xs text-muted">This usually takes a few seconds. Click below to pull the latest status from Stripe.</p>
                        <Button type="button" variant="secondary" size="md" onClick={handleRefreshIdentity} disabled={identityRefreshing}>
                            {identityRefreshing ? 'Checking…' : 'Refresh status'}
                        </Button>
                    </div>
                )}

                {identityStatus === 'requires_input' && (
                    <div className="space-y-3">
                        <p className="text-sm text-text">Verification couldn&apos;t be completed.</p>
                        {identityFailureReason && (
                            <p className="text-xs text-muted">Reason: <span className="font-mono">{identityFailureReason}</span></p>
                        )}
                        <Button type="button" variant="primary" size="md" onClick={handleStartIdentity} disabled={identityStarting}>
                            {identityStarting ? 'Starting…' : 'Try again'}
                        </Button>
                    </div>
                )}

                {identityStatus === 'canceled' && (
                    <div className="space-y-3">
                        <p className="text-sm text-text">Verification was canceled.</p>
                        <Button type="button" variant="primary" size="md" onClick={handleStartIdentity} disabled={identityStarting}>
                            {identityStarting ? 'Starting…' : 'Verify Identity'}
                        </Button>
                    </div>
                )}

                {(identityStatus === null || identityStatus === undefined) && (
                    <div className="space-y-3">
                        <p className="text-sm text-text">Before you can request a payout, we need to verify your identity. This is a one-time check powered by Stripe Identity — selfie + a photo of a government ID.</p>
                        <p className="text-xs text-muted">Your data goes directly to Stripe. We only receive a verified / not-verified result.</p>
                        <Button type="button" variant="primary" size="md" onClick={handleStartIdentity} disabled={identityStarting}>
                            {identityStarting ? 'Starting…' : 'Verify Identity'}
                        </Button>
                    </div>
                )}
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
                        {stripeConnectEnabled && (
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
                        )}
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

                    {stripeConnectEnabled && payoutMethod === 'stripe_connect' && (
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

            {/* Social Links */}
            <Section title="Social Links">
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
            </Section>

            {/* Social Links */}
            <Section title="Social Links">
                <p style={{ fontSize: 13, color: '#8888AA', marginBottom: 20 }}>
                    Add your social media profiles. Only platforms you add will be shown on your public profile.
                </p>

                {activeLinksKeys.map(key => {
                    const platform = PLATFORMS.find(p => p.key === key)
                    if (!platform) return null
                    return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <div style={{ width: 140, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                <span style={{ fontSize: 20 }}>{platform.icon}</span>
                                <span style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0F' }}>{platform.label}</span>
                            </div>
                            <input
                                type="url"
                                value={socialLinksData[key] || ''}
                                onChange={e => setSocialLinksData(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder={platform.placeholder}
                                style={{
                                    flex: 1,
                                    border: '1px solid #C0C0C8',
                                    padding: '8px 12px',
                                    fontSize: 13,
                                    outline: 'none',
                                }}
                            />
                            <button
                                onClick={() => {
                                    setActiveLinksKeys(prev => prev.filter(k => k !== key))
                                    setSocialLinksData(prev => { const next = { ...prev }; delete next[key]; return next })
                                }}
                                style={{ background: 'none', border: 'none', color: '#E63950', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}
                                title="Remove"
                            >×</button>
                        </div>
                    )
                })}

                {/* Add platform */}
                {PLATFORMS.filter(p => !activeLinksKeys.includes(p.key)).length > 0 && (
                    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                        <button
                            onClick={() => setShowPlatformDropdown(v => !v)}
                            style={{
                                padding: '8px 16px',
                                fontSize: 13,
                                fontWeight: 600,
                                background: 'transparent',
                                border: '1px solid #C0C0C8',
                                cursor: 'pointer',
                                color: '#0A0A0F',
                            }}
                        >
                            + Add Social Link
                        </button>
                        {showPlatformDropdown && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                background: '#FFFFFF',
                                border: '1px solid #E0E0E0',
                                zIndex: 10,
                                minWidth: 200,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            }}>
                                {PLATFORMS.filter(p => !activeLinksKeys.includes(p.key)).map(platform => (
                                    <button
                                        key={platform.key}
                                        onClick={() => {
                                            setActiveLinksKeys(prev => [...prev, platform.key])
                                            setShowPlatformDropdown(false)
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            width: '100%',
                                            padding: '10px 14px',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: 13,
                                            textAlign: 'left',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F7')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                    >
                                        <span style={{ fontSize: 18 }}>{platform.icon}</span>
                                        <span style={{ fontWeight: 600, color: '#0A0A0F' }}>{platform.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <button
                        onClick={saveNewSocialLinks}
                        disabled={newSocialSaving}
                        style={{
                            background: '#0A0A0F',
                            color: '#FFFFFF',
                            padding: '10px 24px',
                            fontSize: 13,
                            fontWeight: 600,
                            border: 'none',
                            cursor: newSocialSaving ? 'not-allowed' : 'pointer',
                            opacity: newSocialSaving ? 0.7 : 1,
                        }}
                    >
                        {newSocialSaved ? 'Saved ✓' : newSocialSaving ? 'Saving...' : 'Save Social Links'}
                    </button>
                </div>
            </Section>

            {/* Analytics & Tracking */}
            <Section title="Analytics & Tracking">
                <form onSubmit={saveAnalytics} className="space-y-4">
                    <div>
                        <label className="text-xs text-muted block mb-1.5">Meta (Facebook) Pixel ID</label>
                        <input
                            type="text"
                            value={metaPixelId}
                            onChange={e => setMetaPixelId(e.target.value.replace(/\D/g, ''))}
                            placeholder="e.g. 1234567890"
                            maxLength={20}
                            className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                        />
                        <p className="text-xs text-muted mt-1.5">Your Meta Pixel ID tracks conversions from your Facebook and Instagram ads. It fires on your event pages and at checkout.</p>
                    </div>
                    <Button type="submit" variant="primary" size="md" disabled={analyticsSaving}>
                        {analyticsSaved ? 'Saved ✓' : analyticsSaving ? 'Saving...' : 'Save'}
                    </Button>
                </form>
            </Section>

            {/* Danger Zone */}
            <Section title="Danger Zone">
                <div className="space-y-6">
                    <div>
                        <p className="text-sm text-text font-medium mb-1">Close Organiser Account</p>
                        <p className="text-sm text-muted mb-3">
                            Removes your organiser status. Your account remains active. You can reapply to create events in future.
                        </p>
                        <Button variant="danger" size="md" onClick={() => setShowCloseModal(true)}>Close Organiser Account</Button>
                    </div>
                    <div className="border-t border-border pt-6">
                        <p className="text-sm text-text font-medium mb-1">Delete Account Permanently</p>
                        <p className="text-sm text-muted mb-3">
                            Permanently deletes your account and all associated data. This cannot be undone.
                            Not available if you have upcoming events with confirmed bookings.
                        </p>
                        <Button variant="danger" size="md" onClick={() => { setShowDeleteModal(true); setDeleteError(null) }}>
                            Delete Account Permanently
                        </Button>
                    </div>
                </div>
            </Section>

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-3">Delete Account Permanently?</h3>
                        <p className="text-sm text-muted mb-2">
                            This will permanently delete your account, organiser profile, and all your events. This cannot be undone.
                        </p>
                        <p className="text-sm text-muted mb-4">
                            Confirmed bookings made by attendees will be preserved for financial records.
                        </p>
                        {deleteError && (
                            <p className="text-sm text-accent mb-4 bg-accent/10 border border-accent/30 px-3 py-2">{deleteError}</p>
                        )}
                        <div className="flex gap-3">
                            <Button variant="danger" size="md" onClick={handleDeleteAccount} disabled={deletingAccount}>
                                {deletingAccount ? 'Deleting...' : 'Yes, Delete Everything'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => setShowDeleteModal(false)} disabled={deletingAccount}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Account Modal */}
            {showCloseModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 max-w-sm w-full">
                        <h3 className="font-heading text-xl text-text mb-3">Close Organiser Account?</h3>
                        <p className="text-sm text-muted mb-4">This will remove your organiser status. This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <Button variant="danger" size="md" onClick={handleCloseAccount} disabled={closingAccount}>
                                {closingAccount ? 'Closing...' : 'Close Account'}
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => setShowCloseModal(false)} disabled={closingAccount}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
