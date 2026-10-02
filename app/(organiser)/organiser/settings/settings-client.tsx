'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compress-image'
import type { OrganiserProfile } from '@/types'

// The eight platforms shown in the design. Anything else already stored in social_links (e.g. "website") is preserved.
const PLATFORMS = [
    { key: 'instagram', label: 'Instagram', icon: '📷', placeholder: 'https://instagram.com/yourpage' },
    { key: 'facebook', label: 'Facebook', icon: '👥', placeholder: 'https://facebook.com/yourpage' },
    { key: 'tiktok', label: 'TikTok', icon: '🎵', placeholder: 'https://tiktok.com/@yourpage' },
    { key: 'youtube', label: 'YouTube', icon: '▶️', placeholder: 'https://youtube.com/@yourchannel' },
    { key: 'twitter', label: 'X (Twitter)', icon: '𝕏', placeholder: 'https://x.com/yourhandle' },
    { key: 'linkedin', label: 'LinkedIn', icon: '💼', placeholder: 'https://linkedin.com/in/yourprofile' },
    { key: 'spotify', label: 'Spotify', icon: '🎧', placeholder: 'https://open.spotify.com/artist/...' },
    { key: 'soundcloud', label: 'SoundCloud', icon: '☁️', placeholder: 'https://soundcloud.com/yourpage' },
]

type OrganiserWithExtras = OrganiserProfile & {
    cover_url?: string | null
    social_instagram?: string | null
    social_facebook?: string | null
    social_website?: string | null
    location?: string | null
    social_links?: Record<string, string> | null
}

const ACCOUNT_TYPES: Record<string, string> = {
    individual: 'Individual',
    artist: 'Artist / Performer',
    club_venue: 'Club / Venue',
    event_company: 'Event Company',
    charity: 'Charity / Community',
    education: 'Education',
}

const card = 'bg-card rounded-2xl shadow-card p-6 mb-6'
const cardTitle = 'text-sm font-semibold mb-4'
const labelClass = 'text-xs text-muted uppercase tracking-wider mb-1.5 block'
const inputClass = 'w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25'
const saveBtn = 'bg-accent text-white px-4 py-2.5 rounded-xl text-xs font-semibold mt-4 disabled:opacity-60'
const modalInput = 'w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25'

function Toggle({ checked, onChange, label, padded }: { checked: boolean; onChange: (v: boolean) => void; label: string; padded?: boolean }) {
    return (
        <div className={`flex items-center justify-between ${padded ? 'py-3' : 'py-2'}`}>
            <p className="text-sm">{label}</p>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                onClick={() => onChange(!checked)}
                className={`w-10 h-6 rounded-full relative transition-colors ${checked ? 'bg-accent' : 'bg-border'}`}
            >
                <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${checked ? 'right-1' : 'left-1'}`} />
            </button>
        </div>
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

    // ── Identity verification ──────────────────────────────────────────────
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

    // ── Profile ────────────────────────────────────────────────────────────
    const [orgName, setOrgName] = useState(organiser.org_name)
    const [description, setDescription] = useState(organiser.description || '')
    const [website, setWebsite] = useState(organiser.website || '')
    const [location, setLocation] = useState(organiser.location || '')
    const [logoUrl, setLogoUrl] = useState(organiser.logo_url || '')
    const [logoUploading, setLogoUploading] = useState(false)
    const [coverUrl, setCoverUrl] = useState(organiser.cover_url || '')
    const [coverUploading, setCoverUploading] = useState(false)
    const [profileSaving, setProfileSaving] = useState(false)
    const [profileSaved, setProfileSaved] = useState(false)

    // ── Social links (the eight design platforms; legacy Instagram/Facebook columns kept in sync) ──
    const [socialInputs, setSocialInputs] = useState<Record<string, string>>(() => {
        const existing = organiser.social_links || {}
        const init: Record<string, string> = {}
        for (const p of PLATFORMS) init[p.key] = existing[p.key] || ''
        if (!init.instagram) init.instagram = organiser.social_instagram || ''
        if (!init.facebook) init.facebook = organiser.social_facebook || ''
        return init
    })
    const [socialSaving, setSocialSaving] = useState(false)
    const [socialSaved, setSocialSaved] = useState(false)

    // ── VAT ────────────────────────────────────────────────────────────────
    const [vatRegistered, setVatRegistered] = useState(organiser.vat_registered)
    const [vatNumber, setVatNumber] = useState(organiser.vat_number || '')
    const [vatSaving, setVatSaving] = useState(false)
    const [vatSaved, setVatSaved] = useState(false)

    // ── Notifications (UI only — these toggles are not persisted, as before) ──
    const [notifyDailySummary, setNotifyDailySummary] = useState(false)
    const [notifyPayout, setNotifyPayout] = useState(true)

    // ── Payout method (bank transfer is the legacy route; Connect is the standard one) ──
    const [payoutMethod, setPayoutMethod] = useState<'bank_transfer' | 'stripe_connect'>(organiser.payout_method ?? 'bank_transfer')
    const [bankAccountName, setBankAccountName] = useState(organiser.bank_account_name || '')
    const [bankSortCode, setBankSortCode] = useState(organiser.bank_sort_code || '')
    const [bankAccountNumber, setBankAccountNumber] = useState(organiser.bank_account_number || '')
    const [payoutSaving, setPayoutSaving] = useState(false)
    const [payoutSaved, setPayoutSaved] = useState(false)

    // ── Analytics ──────────────────────────────────────────────────────────
    const [metaPixelId, setMetaPixelId] = useState(organiser.meta_pixel_id || '')
    const [analyticsSaving, setAnalyticsSaving] = useState(false)
    const [analyticsSaved, setAnalyticsSaved] = useState(false)

    // ── Danger zone ────────────────────────────────────────────────────────
    const [showCloseModal, setShowCloseModal] = useState(false)
    const [closingAccount, setClosingAccount] = useState(false)
    const [closeError, setCloseError] = useState<string | null>(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deletingAccount, setDeletingAccount] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [deleteReason, setDeleteReason] = useState('')
    const [deleteRequestSubmitted, setDeleteRequestSubmitted] = useState(false)

    // One error line per section, so a failed save is never reported as "Saved ✓"
    const [errors, setErrors] = useState<Record<string, string>>({})
    const setErr = (key: string, msg: string) => setErrors(prev => ({ ...prev, [key]: msg }))

    // Runs a profile update and reports success/failure
    async function updateProfile(section: string, values: Record<string, unknown>): Promise<boolean> {
        setErr(section, '')
        const supabase = createClient()
        const { error } = await supabase.from('organiser_profiles').update(values).eq('id', organiser.id)
        if (error) {
            console.error(`[Settings] ${section} save failed:`, error)
            setErr(section, 'Could not save. Please try again.')
            return false
        }
        return true
    }

    function flash(setter: (v: boolean) => void) {
        setter(true)
        setTimeout(() => setter(false), 2000)
    }

    async function saveProfile(e: React.FormEvent) {
        e.preventDefault()
        setProfileSaving(true)
        const ok = await updateProfile('profile', { org_name: orgName, description, website, location: location || null })
        if (ok) flash(setProfileSaved)
        setProfileSaving(false)
    }

    async function saveSocialLinks() {
        setSocialSaving(true)
        // Keep anything stored under other keys (e.g. "website"); replace the eight platforms from the form
        const preserved = { ...(organiser.social_links || {}) }
        for (const p of PLATFORMS) delete preserved[p.key]
        const linksToSave: Record<string, string> = { ...preserved }
        for (const p of PLATFORMS) {
            const v = socialInputs[p.key]?.trim()
            if (v) linksToSave[p.key] = v
        }
        const ok = await updateProfile('social', {
            social_links: linksToSave,
            social_instagram: socialInputs.instagram?.trim() || null,
            social_facebook: socialInputs.facebook?.trim() || null,
        })
        if (ok) flash(setSocialSaved)
        setSocialSaving(false)
    }

    async function saveVat() {
        setVatSaving(true)
        const ok = await updateProfile('vat', { vat_registered: vatRegistered, vat_number: vatRegistered ? vatNumber : null })
        if (ok) flash(setVatSaved)
        setVatSaving(false)
    }

    async function savePayoutMethod(e: React.FormEvent) {
        e.preventDefault()
        setPayoutSaving(true)
        const ok = await updateProfile(
            'payout',
            payoutMethod === 'bank_transfer'
                ? { payout_method: 'bank_transfer', bank_account_name: bankAccountName, bank_sort_code: bankSortCode, bank_account_number: bankAccountNumber }
                : { payout_method: 'stripe_connect' }
        )
        if (ok) flash(setPayoutSaved)
        setPayoutSaving(false)
    }

    async function saveAnalytics() {
        setAnalyticsSaving(true)
        const ok = await updateProfile('analytics', { meta_pixel_id: metaPixelId.trim() || null })
        if (ok) flash(setAnalyticsSaved)
        setAnalyticsSaving(false)
    }

    async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setLogoUploading(true)
        setErr('logo', '')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLogoUploading(false); return }
        let blob: Blob
        try { blob = await compressImage(file, 400) } catch { blob = file }
        const path = `${user.id}/logo.webp`
        const { error } = await supabase.storage.from('organiser-logos').upload(path, blob, { upsert: true, contentType: 'image/webp' })
        if (error) { setErr('logo', 'Upload failed. Please try again.'); setLogoUploading(false); return }
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
        setErr('cover', '')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setCoverUploading(false); return }
        let blob: Blob
        try { blob = await compressImage(file, 1600) } catch { blob = file }
        const path = `${user.id}/cover.webp`
        const { error } = await supabase.storage.from('organiser-covers').upload(path, blob, { upsert: true, contentType: 'image/webp' })
        if (error) { setErr('cover', 'Upload failed. Please try again.'); setCoverUploading(false); return }
        const { data: urlData } = supabase.storage.from('organiser-covers').getPublicUrl(path)
        const url = urlData.publicUrl
        await supabase.from('organiser_profiles').update({ cover_url: url }).eq('id', organiser.id)
        setCoverUrl(url)
        setCoverUploading(false)
    }

    async function handleCloseAccount() {
        setClosingAccount(true)
        setCloseError(null)
        const res = await fetch('/api/organiser/close-account', { method: 'POST' })
        if (res.ok) {
            window.location.href = '/'
        } else {
            setClosingAccount(false)
            setCloseError('Something went wrong. Please try again.')
        }
    }

    async function handleDeleteAccount() {
        if (!deleteReason.trim()) {
            setDeleteError('Please tell us why you want to delete your account.')
            return
        }
        setDeletingAccount(true)
        setDeleteError(null)
        const res = await fetch('/api/organiser/delete-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: deleteReason }),
        })
        setDeletingAccount(false)
        if (res.ok) {
            setDeleteRequestSubmitted(true)
        } else {
            const json = await res.json().catch(() => ({}))
            setDeleteError(json.error || 'Something went wrong. Please try again.')
        }
    }

    const initials = (orgName || 'O').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    const showConnectBlock = stripeConnectEnabled || organiser.payout_method === 'stripe_connect'
    const connectVerified = !!organiser.stripe_account_id && organiser.stripe_charges_enabled && organiser.stripe_payouts_enabled

    return (
        <>
            {/* Organisation Profile */}
            <form onSubmit={saveProfile} className={card}>
                <h2 className={cardTitle}>Organisation Profile</h2>

                <div className="flex items-center gap-4 mb-5">
                    {logoUrl ? (
                        <Image src={logoUrl} alt="Logo" width={64} height={64} className="w-16 h-16 rounded-xl object-cover border border-border shrink-0" />
                    ) : (
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-warm-orange to-accent flex items-center justify-center text-white font-heading text-xl shrink-0">{initials}</div>
                    )}
                    <label className="cursor-pointer bg-background border border-border rounded-xl px-4 py-2 text-sm font-medium hover:bg-border transition-colors">
                        {logoUploading ? 'Uploading...' : 'Upload Logo'}
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadLogo} className="hidden" />
                    </label>
                </div>
                {errors.logo && <p className="text-warm-red text-xs mb-3">{errors.logo}</p>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Account Type</label>
                        <input
                            value={ACCOUNT_TYPES[organiser.organiser_type] || 'Individual'}
                            disabled
                            readOnly
                            className="w-full bg-border border border-border rounded-xl px-4 py-2.5 text-sm text-muted"
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Organisation Name</label>
                        <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} required className={inputClass} />
                    </div>
                    <div className="sm:col-span-2">
                        <label className={labelClass}>Website URL</label>
                        <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" className={inputClass} />
                    </div>
                    <div className="sm:col-span-2">
                        <label className={labelClass}>Location / City</label>
                        <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="London, UK" className={inputClass} />
                    </div>
                    <div className="sm:col-span-2">
                        <label className={labelClass}>Bio</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            maxLength={300}
                            placeholder="Tell people about yourself or your organisation..."
                            className={inputClass}
                        />
                        <p className="text-xs text-muted mt-1 text-right">{description.length}/300</p>
                    </div>
                    <div className="sm:col-span-2">
                        <label className={labelClass}>Cover Photo</label>
                        <div className="relative h-32 rounded-xl overflow-hidden border border-border mb-3 bg-gradient-to-br from-warm-orange to-accent">
                            {coverUrl && <Image src={coverUrl} alt="Cover" fill sizes="(min-width: 1024px) 70vw, 100vw" className="object-cover" />}
                            {!coverUrl && <span className="absolute inset-0 flex items-center justify-center text-xs text-white/80">No cover photo</span>}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <label className="cursor-pointer bg-background border border-border rounded-xl px-4 py-2 text-sm font-medium hover:bg-border transition-colors">
                                {coverUploading ? 'Uploading...' : 'Change Cover Photo'}
                                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadCover} className="hidden" />
                            </label>
                            <span className="text-xs text-muted">Recommended: 1200 x 400px (3:1 ratio). Max 5MB. JPG, PNG or WebP.</span>
                        </div>
                        {errors.cover && <p className="text-warm-red text-xs mt-2">{errors.cover}</p>}
                    </div>
                </div>
                {errors.profile && <p className="text-warm-red text-xs mt-3">{errors.profile}</p>}
                <button type="submit" disabled={profileSaving} className={saveBtn}>
                    {profileSaved ? 'Saved ✓' : profileSaving ? 'Saving...' : 'Save Profile'}
                </button>
            </form>

            {/* Social Links */}
            <div className={card}>
                <h2 className={cardTitle}>Social Links</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {PLATFORMS.map(p => (
                        <div key={p.key}>
                            <label className={labelClass}>{p.icon} {p.label}</label>
                            <input
                                type="url"
                                value={socialInputs[p.key] || ''}
                                onChange={e => setSocialInputs(prev => ({ ...prev, [p.key]: e.target.value }))}
                                placeholder={p.placeholder}
                                className={inputClass}
                            />
                        </div>
                    ))}
                </div>
                {errors.social && <p className="text-warm-red text-xs mt-3">{errors.social}</p>}
                <button type="button" onClick={saveSocialLinks} disabled={socialSaving} className={saveBtn}>
                    {socialSaved ? 'Saved ✓' : socialSaving ? 'Saving...' : 'Save Social Links'}
                </button>
            </div>

            {/* VAT Settings */}
            <div className={card}>
                <h2 className={cardTitle}>VAT Settings</h2>
                <Toggle checked={vatRegistered} onChange={setVatRegistered} label="VAT Registered" />
                {vatRegistered && (
                    <div className="mt-3">
                        <label className={labelClass}>VAT Number</label>
                        <input
                            type="text"
                            value={vatNumber}
                            onChange={e => setVatNumber(e.target.value)}
                            placeholder="GB123456789"
                            className="w-full sm:w-64 bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25"
                        />
                    </div>
                )}
                <p className="text-xs text-muted mt-3">VAT invoices will be generated for your payouts</p>
                {errors.vat && <p className="text-warm-red text-xs mt-3">{errors.vat}</p>}
                <button type="button" onClick={saveVat} disabled={vatSaving} className={saveBtn}>
                    {vatSaved ? 'Saved ✓' : vatSaving ? 'Saving...' : 'Save VAT Settings'}
                </button>
            </div>

            {/* Notification Preferences */}
            <div className={card}>
                <h2 className={cardTitle}>Notification Preferences</h2>
                <div className="flex flex-col divide-y divide-border">
                    <Toggle checked={notifyDailySummary} onChange={setNotifyDailySummary} label="Daily booking summary" padded />
                    <Toggle checked={notifyPayout} onChange={setNotifyPayout} label="Payout notifications" padded />
                </div>
            </div>

            {/* Identity Verification */}
            <div id="identity" className={`${card} scroll-mt-28`}>
                <h2 className={cardTitle}>Identity Verification</h2>
                {identityToast && (
                    <div className="mb-4 bg-blue-500/10 text-blue-600 px-4 py-2.5 rounded-xl text-sm">{identityToast}</div>
                )}

                {identityStatus === 'verified' && identityVerifiedAt && (
                    <div className="space-y-2">
                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-warm-green bg-warm-green/10 px-3 py-1.5 rounded-full">
                            ✓ Verified on {new Date(identityVerifiedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <p className="text-xs text-muted">Your identity is on file. You can request payouts whenever your balance is available.</p>
                    </div>
                )}

                {identityStatus === 'processing' && (
                    <div className="space-y-3">
                        <p className="text-sm">Verification in progress — Stripe is reviewing your submission.</p>
                        <p className="text-xs text-muted">This usually takes a few seconds. Click below to pull the latest status from Stripe.</p>
                        <button
                            type="button"
                            onClick={handleRefreshIdentity}
                            disabled={identityRefreshing}
                            className="bg-card border border-border px-4 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-60"
                        >
                            {identityRefreshing ? 'Checking…' : 'Refresh status'}
                        </button>
                    </div>
                )}

                {identityStatus === 'requires_input' && (
                    <div className="space-y-3">
                        <p className="text-sm">Verification couldn&apos;t be completed.</p>
                        {identityFailureReason && (
                            <p className="text-xs text-muted">Reason: <span className="font-mono">{identityFailureReason}</span></p>
                        )}
                        <button type="button" onClick={handleStartIdentity} disabled={identityStarting} className="bg-accent text-white px-4 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-60">
                            {identityStarting ? 'Starting…' : 'Try again'}
                        </button>
                    </div>
                )}

                {identityStatus === 'canceled' && (
                    <div className="space-y-3">
                        <p className="text-sm">Verification was canceled.</p>
                        <button type="button" onClick={handleStartIdentity} disabled={identityStarting} className="bg-accent text-white px-4 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-60">
                            {identityStarting ? 'Starting…' : 'Verify Identity'}
                        </button>
                    </div>
                )}

                {(identityStatus === null || identityStatus === undefined) && (
                    <div className="space-y-3">
                        <p className="text-sm">Before you can request a payout, we need to verify your identity. This is a one-time check powered by Stripe Identity — selfie + a photo of a government ID.</p>
                        <p className="text-xs text-muted">Your data goes directly to Stripe. We only receive a verified / not-verified result.</p>
                        <button type="button" onClick={handleStartIdentity} disabled={identityStarting} className="bg-accent text-white px-4 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-60">
                            {identityStarting ? 'Starting…' : 'Verify Identity'}
                        </button>
                    </div>
                )}
            </div>

            {/* Payout Method */}
            <div className={card}>
                <h2 className={cardTitle}>Payout Method</h2>

                {showConnectBlock && (
                    <>
                        <p className="text-xs text-muted mb-4">
                            Hexlura pays organisers via Stripe Connect. As part of connecting, Stripe verifies your identity and handles
                            transferring your earnings to your UK bank account automatically — no bank or ID details are stored with us.
                        </p>
                        {!organiser.stripe_account_id ? (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-warm-yellow/10 rounded-xl">
                                <div>
                                    <p className="text-sm font-medium">Not connected yet</p>
                                    <p className="text-xs text-muted mt-0.5">You&apos;ll be redirected to Stripe to verify your identity and set up payouts</p>
                                </div>
                                {stripeConnectEnabled && (
                                    <a href="/api/stripe/connect" className="bg-accent text-white px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap text-center">Connect with Stripe</a>
                                )}
                            </div>
                        ) : connectVerified ? (
                            <div className="flex items-center justify-between gap-3 p-4 bg-background rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="w-9 h-9 rounded-lg bg-warm-green/10 flex items-center justify-center text-warm-green shrink-0">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium">Stripe Connect</p>
                                        <p className="text-xs text-muted">Connected &amp; verified · Payouts active</p>
                                    </div>
                                </div>
                                <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-xs text-accent font-semibold hover:underline whitespace-nowrap">Manage in Stripe →</a>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-warm-red/10 rounded-xl">
                                <div>
                                    <p className="text-sm font-medium">Action needed</p>
                                    <p className="text-xs text-muted mt-0.5">Stripe needs more information before payouts can be activated</p>
                                </div>
                                <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="bg-accent text-white px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap text-center">Finish on Stripe</a>
                            </div>
                        )}
                    </>
                )}

                {/* Bank transfer: the only option when Connect isn't available, and kept for organisers who are still
                    paid by bank transfer and haven't connected Stripe yet (they need their details to be paid). */}
                {(!showConnectBlock || (organiser.payout_method === 'bank_transfer' && !organiser.stripe_account_id)) && (
                    <form onSubmit={savePayoutMethod} className={showConnectBlock ? 'space-y-4 mt-6 pt-6 border-t border-border' : 'space-y-4'}>
                        {showConnectBlock && <p className="text-sm font-medium">Bank transfer (current method)</p>}
                        <p className="text-xs text-muted">Admin manually transfers your earnings to your UK bank account.</p>
                        <div className="space-y-3">
                            <div>
                                <label className={labelClass}>Account Holder Name</label>
                                <input
                                    type="text"
                                    value={bankAccountName}
                                    onChange={e => { setBankAccountName(e.target.value); setPayoutMethod('bank_transfer') }}
                                    placeholder="Full name or company name"
                                    className={inputClass}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Sort Code</label>
                                    <input
                                        type="text"
                                        value={bankSortCode}
                                        onChange={e => { setBankSortCode(e.target.value); setPayoutMethod('bank_transfer') }}
                                        placeholder="00-00-00"
                                        maxLength={8}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Account Number</label>
                                    <input
                                        type="text"
                                        value={bankAccountNumber}
                                        onChange={e => { setBankAccountNumber(e.target.value); setPayoutMethod('bank_transfer') }}
                                        placeholder="12345678"
                                        maxLength={8}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                            {organiser.bank_account_number && (
                                <p className="text-xs text-warm-green">✓ Bank details on file — ending {organiser.bank_account_number.slice(-4)}</p>
                            )}
                        </div>
                        {errors.payout && <p className="text-warm-red text-xs">{errors.payout}</p>}
                        <button type="submit" disabled={payoutSaving} className={saveBtn}>
                            {payoutSaved ? 'Saved ✓' : payoutSaving ? 'Saving...' : 'Save Payout Method'}
                        </button>
                    </form>
                )}
            </div>

            {/* Analytics & Tracking */}
            <div className={`${card} mt-6`}>
                <h2 className={cardTitle}>Analytics &amp; Tracking</h2>
                <label className={labelClass}>Meta (Facebook) Pixel ID</label>
                <input
                    type="text"
                    value={metaPixelId}
                    onChange={e => setMetaPixelId(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 1234567890"
                    maxLength={20}
                    className="w-full sm:w-80 bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25"
                />
                <p className="text-xs text-muted mt-2">Your Meta Pixel ID tracks conversions from your Facebook and Instagram ads. It fires on your event pages and at checkout.</p>
                {errors.analytics && <p className="text-warm-red text-xs mt-3">{errors.analytics}</p>}
                <button type="button" onClick={saveAnalytics} disabled={analyticsSaving} className={saveBtn}>
                    {analyticsSaved ? 'Saved ✓' : analyticsSaving ? 'Saving...' : 'Save'}
                </button>
            </div>

            {/* Danger Zone */}
            <div className="bg-card border-2 border-warm-red/20 rounded-2xl shadow-card p-6 mt-6">
                <h2 className="text-sm font-semibold text-accent mb-4">Danger Zone</h2>
                <div className="flex flex-col gap-6">
                    <div>
                        <p className="text-sm font-medium mb-1">Close Organiser Account</p>
                        <p className="text-sm text-muted mb-3">
                            Removes your organiser status. Your account remains active. You can reapply to create events in future.
                        </p>
                        <button type="button" onClick={() => { setShowCloseModal(true); setCloseError(null) }} className="bg-accent text-white px-4 py-2.5 rounded-xl text-xs font-semibold">
                            Close Organiser Account
                        </button>
                    </div>
                    <div className="border-t border-border pt-6">
                        <p className="text-sm font-medium mb-1">Delete Account Permanently</p>
                        <p className="text-sm text-muted mb-3">
                            Requests permanent deletion of your account and all associated data. Goes through
                            admin review — if you have events with confirmed bookings, those are refunded
                            automatically as part of approval.
                        </p>
                        <button
                            type="button"
                            onClick={() => { setShowDeleteModal(true); setDeleteError(null); setDeleteReason(''); setDeleteRequestSubmitted(false) }}
                            className="bg-accent text-white px-4 py-2.5 rounded-xl text-xs font-semibold"
                        >
                            Delete Account Permanently
                        </button>
                    </div>
                </div>
            </div>

            {/* Close Account modal */}
            {showCloseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div onClick={() => { if (!closingAccount) setShowCloseModal(false) }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative bg-card rounded-2xl shadow-hover w-full max-w-sm p-6">
                        <h2 className="font-heading text-xl tracking-wide mb-3 uppercase">Close Organiser Account?</h2>
                        <p className="text-sm text-muted mb-5">This will remove your organiser status. This action cannot be undone.</p>
                        {closeError && <p className="text-warm-red text-xs mb-3">{closeError}</p>}
                        <div className="flex gap-3">
                            <button type="button" onClick={handleCloseAccount} disabled={closingAccount} className="bg-accent text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
                                {closingAccount ? 'Closing...' : 'Close Account'}
                            </button>
                            <button type="button" onClick={() => setShowCloseModal(false)} disabled={closingAccount} className="bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-border transition-colors disabled:opacity-60">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Account modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div onClick={() => { if (!deletingAccount) setShowDeleteModal(false) }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative bg-card rounded-2xl shadow-hover w-full max-w-sm p-6">
                        {deleteRequestSubmitted ? (
                            <>
                                <h2 className="font-heading text-xl tracking-wide mb-3 uppercase">Request Submitted</h2>
                                <p className="text-sm text-muted mb-4">
                                    Your account remains active for now. Our team will review your request —
                                    if approved, any confirmed bookings on your events are refunded automatically
                                    before your account is deleted.
                                </p>
                                <button type="button" onClick={() => setShowDeleteModal(false)} className="bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-border transition-colors">Close</button>
                            </>
                        ) : (
                            <>
                                <h2 className="font-heading text-xl tracking-wide mb-3 uppercase">Request Account Deletion?</h2>
                                <p className="text-sm text-muted mb-4">
                                    This submits a request for admin review — your account is not deleted yet.
                                    If approved, your account, organiser profile, and events are permanently deleted;
                                    any confirmed bookings are refunded first.
                                </p>
                                <label className="text-xs font-semibold block mb-1.5">Why do you want to delete your account?</label>
                                <textarea
                                    value={deleteReason}
                                    onChange={e => setDeleteReason(e.target.value)}
                                    rows={3}
                                    placeholder="Required — this is shown to our review team"
                                    className={`${modalInput} mb-4`}
                                />
                                {deleteError && <p className="text-sm text-warm-red mb-4">{deleteError}</p>}
                                <div className="flex gap-3">
                                    <button type="button" onClick={handleDeleteAccount} disabled={deletingAccount} className="bg-accent text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
                                        {deletingAccount ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                    <button type="button" onClick={() => setShowDeleteModal(false)} disabled={deletingAccount} className="bg-background border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-border transition-colors disabled:opacity-60">
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
