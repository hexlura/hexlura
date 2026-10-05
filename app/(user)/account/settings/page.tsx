'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compress-image'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ThemedSelect } from '@/components/ui/ThemedSelect'

const inputClass = "w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:bg-border/40 disabled:text-muted disabled:cursor-not-allowed"
const labelClass = "text-xs font-semibold text-muted mb-1.5 block"
const cardClass = "bg-card rounded-2xl border border-border shadow-soft p-6 mb-5"
const cardTitleClass = "font-heading text-lg tracking-wide mb-4"

function Spinner() {
    return (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    )
}

function StatusMsg({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
    if (!msg) return null
    return (
        <p className={`text-sm font-semibold ${msg.type === 'success' ? 'text-success' : 'text-accent'}`}>
            {msg.text}
        </p>
    )
}

const saveButtonClass = "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-text text-white text-sm font-semibold hover:bg-black transition disabled:opacity-50 disabled:cursor-not-allowed"

export default function AccountSettingsPage() {
    const router = useRouter()
    const supabase = createClient()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [userId, setUserId] = useState('')
    const [email, setEmail] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [initials, setInitials] = useState('?')

    // Personal info
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [dateOfBirth, setDateOfBirth] = useState('')
    const [gender, setGender] = useState('')
    const [personalLoading, setPersonalLoading] = useState(false)
    const [personalMsg, setPersonalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Address
    const [addressLine1, setAddressLine1] = useState('')
    const [postcode, setPostcode] = useState('')
    const [city, setCity] = useState('')
    const [postcodeMsg, setPostcodeMsg] = useState<string | null>(null)
    const [addressLoading, setAddressLoading] = useState(false)
    const [addressMsg, setAddressMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Avatar upload
    const [avatarUploading, setAvatarUploading] = useState(false)
    const [avatarError, setAvatarError] = useState<string | null>(null)

    // Password
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordLoading, setPasswordLoading] = useState(false)
    const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const [deleteLoading, setDeleteLoading] = useState(false)

    // Notification preferences
    const [emailMarketingOptOut, setEmailMarketingOptOut] = useState(false)
    const [notifLoading, setNotifLoading] = useState(false)
    const [notifMsg, setNotifMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const today = new Date().toISOString().split('T')[0]

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/auth/login'); return }
            setUserId(user.id)
            setEmail(user.email || '')

            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, phone, avatar_url, date_of_birth, gender, address_line1, city, postcode, email_marketing_opt_out')
                .eq('id', user.id)
                .single()

            if (profile) {
                setFullName(profile.full_name || '')
                setPhone(profile.phone || '')
                setAvatarUrl(profile.avatar_url || null)
                setDateOfBirth(profile.date_of_birth || '')
                setGender(profile.gender || '')
                setAddressLine1(profile.address_line1 || '')
                setCity(profile.city || '')
                setPostcode(profile.postcode || '')
                setEmailMarketingOptOut(!!profile.email_marketing_opt_out)

                const name = profile.full_name || user.email || '?'
                setInitials(
                    name.includes(' ')
                        ? (name.split(' ')[0][0] + name.split(' ').slice(-1)[0][0]).toUpperCase()
                        : name[0].toUpperCase()
                )
            }
        }
        load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file || !userId) return

        setAvatarError(null)
        const path = `${userId}/avatar.webp`

        setAvatarUploading(true)
        try {
            let blob: Blob
            try { blob = await compressImage(file, 400) } catch { blob = file }

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(path, blob, { upsert: true, contentType: 'image/webp' })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(path)

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId)

            if (updateError) throw updateError

            // Sync to organiser_profiles.logo_url if the user is an organiser
            const { data: organiserProfile } = await supabase
                .from('organiser_profiles')
                .select('id')
                .eq('user_id', userId)
                .single()

            if (organiserProfile) {
                await supabase
                    .from('organiser_profiles')
                    .update({ logo_url: publicUrl })
                    .eq('id', organiserProfile.id)
            }

            setAvatarUrl(publicUrl)
        } catch (err: unknown) {
            setAvatarError(err instanceof Error ? err.message : 'Upload failed.')
        } finally {
            setAvatarUploading(false)
        }
    }

    async function handleSavePersonal(e: React.FormEvent) {
        e.preventDefault()
        setPersonalLoading(true)
        setPersonalMsg(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    phone,
                    date_of_birth: dateOfBirth || null,
                    gender: gender || null,
                })
                .eq('id', user.id)

            if (error) throw error
            setPersonalMsg({ type: 'success', text: 'Profile updated successfully' })
        } catch {
            setPersonalMsg({ type: 'error', text: 'Something went wrong. Please try again.' })
        } finally {
            setPersonalLoading(false)
        }
    }

    async function handlePostcodeBlur() {
        const clean = postcode.trim().replace(/\s+/g, '')
        if (!clean) return
        setPostcodeMsg(null)
        try {
            const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`)
            if (!res.ok) return
            const json = await res.json()
            if (json.result?.admin_district) {
                const found = json.result.admin_district
                setCity(found)
                setPostcodeMsg(`✓ ${found} found`)
            }
        } catch {
            // silently ignore
        }
    }

    async function handleSaveAddress(e: React.FormEvent) {
        e.preventDefault()
        setAddressLoading(true)
        setAddressMsg(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('profiles')
                .update({
                    address_line1: addressLine1 || null,
                    city: city || null,
                    postcode: postcode || null,
                })
                .eq('id', user.id)

            if (error) throw error
            setAddressMsg({ type: 'success', text: 'Profile updated successfully' })
        } catch {
            setAddressMsg({ type: 'error', text: 'Something went wrong. Please try again.' })
        } finally {
            setAddressLoading(false)
        }
    }

    async function handleChangePassword(e: React.FormEvent) {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: 'error', text: 'Passwords do not match.' })
            return
        }
        if (newPassword.length < 8) {
            setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters.' })
            return
        }
        setPasswordLoading(true)
        setPasswordMsg(null)
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword })
            if (error) throw error
            setPasswordMsg({ type: 'success', text: 'Password updated successfully.' })
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (err: unknown) {
            setPasswordMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update password.' })
        } finally {
            setPasswordLoading(false)
        }
    }

    async function handleToggleEmailMarketing() {
        const next = !emailMarketingOptOut
        setEmailMarketingOptOut(next)
        setNotifLoading(true)
        setNotifMsg(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('profiles')
                .update({ email_marketing_opt_out: next })
                .eq('id', user.id)

            if (error) throw error
            setNotifMsg({ type: 'success', text: 'Preference saved.' })
        } catch {
            setEmailMarketingOptOut(!next)
            setNotifMsg({ type: 'error', text: 'Something went wrong. Please try again.' })
        } finally {
            setNotifLoading(false)
        }
    }

    async function handleDeleteAccount() {
        if (!window.confirm('Are you sure? This will permanently delete your account and cannot be undone.')) return
        setDeleteLoading(true)
        try {
            await supabase.auth.signOut()
            router.push('/')
        } catch {
            setDeleteLoading(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto">
            <Link href="/account" className="text-sm text-muted hover:text-accent mb-2 inline-block">← Back to Account</Link>
            <h1 className="font-heading text-3xl tracking-wide mb-6">ACCOUNT SETTINGS</h1>

            {/* Profile Photo */}
            <section className={cardClass}>
                <h2 className={cardTitleClass}>PROFILE PHOTO</h2>
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="w-20 h-20 rounded-full overflow-hidden shrink-0">
                        {avatarUrl ? (
                            <Image
                                src={avatarUrl}
                                alt="Profile photo"
                                width={80}
                                height={80}
                                className="w-20 h-20 object-cover"
                                unoptimized
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-warm-orange flex items-center justify-center text-white text-3xl font-bold">
                                {initials}
                            </div>
                        )}
                    </div>
                    <div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={avatarUploading}
                            className="px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-background transition inline-flex items-center gap-2"
                        >
                            {avatarUploading && <Spinner />}
                            {avatarUploading ? 'Uploading...' : 'Upload New'}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                        <p className="text-xs text-muted mt-2">JPG, PNG or WebP. Max 2MB.</p>
                        {avatarError && <p className="text-xs font-semibold text-accent mt-1">{avatarError}</p>}
                    </div>
                </div>
            </section>

            {/* Personal Information */}
            <section className={cardClass}>
                <h2 className={cardTitleClass}>PERSONAL INFORMATION</h2>
                <form onSubmit={handleSavePersonal}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Full Name</label>
                            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} placeholder="Your full name" />
                        </div>
                        <div>
                            <label className={labelClass}>Email</label>
                            <input type="email" value={email} className={inputClass} disabled readOnly />
                        </div>
                        <div>
                            <label className={labelClass}>Phone</label>
                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="+44 7700 900000" />
                            <p className="text-xs text-muted mt-1">Used for booking notifications only</p>
                        </div>
                        <div>
                            <label className={labelClass}>Date of Birth</label>
                            <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className={inputClass} max={today} />
                        </div>
                        <div>
                            <label className={labelClass}>Gender</label>
                            <ThemedSelect value={gender} onChange={e => setGender(e.target.value)} className="w-full">
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Non-binary">Non-binary</option>
                                <option value="Prefer not to say">Prefer not to say</option>
                            </ThemedSelect>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-4 flex-wrap">
                        <button type="submit" disabled={personalLoading} className={saveButtonClass}>
                            {personalLoading && <Spinner />}
                            {personalLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <StatusMsg msg={personalMsg} />
                    </div>
                </form>
            </section>

            {/* Address */}
            <section className={cardClass}>
                <h2 className={cardTitleClass}>ADDRESS</h2>
                <form onSubmit={handleSaveAddress}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className={labelClass}>Address Line 1</label>
                            <input type="text" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} className={inputClass} placeholder="123 High Street" />
                        </div>
                        <div>
                            <label className={labelClass}>Postcode</label>
                            <input
                                type="text"
                                value={postcode}
                                onChange={e => { setPostcode(e.target.value); setPostcodeMsg(null) }}
                                onBlur={handlePostcodeBlur}
                                className={inputClass}
                                placeholder="SW1A 1AA"
                            />
                            {postcodeMsg && <p className="text-xs font-semibold text-success mt-1">{postcodeMsg}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>City <span className="font-normal">(auto-filled from postcode)</span></label>
                            <input type="text" value={city} onChange={e => setCity(e.target.value)} className={inputClass} placeholder="London" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-4 flex-wrap">
                        <button type="submit" disabled={addressLoading} className={saveButtonClass}>
                            {addressLoading && <Spinner />}
                            {addressLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <StatusMsg msg={addressMsg} />
                    </div>
                </form>
            </section>

            {/* Change Password */}
            <section className={cardClass}>
                <h2 className={cardTitleClass}>CHANGE PASSWORD</h2>
                <form onSubmit={handleChangePassword}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className={labelClass}>Current Password</label>
                            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputClass} placeholder="Current password" />
                        </div>
                        <div>
                            <label className={labelClass}>New Password</label>
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} placeholder="Min 8 characters" minLength={8} />
                        </div>
                        <div>
                            <label className={labelClass}>Confirm New Password</label>
                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Repeat new password" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-4 flex-wrap">
                        <button type="submit" disabled={passwordLoading} className={saveButtonClass}>
                            {passwordLoading && <Spinner />}
                            {passwordLoading ? 'Updating...' : 'Update Password'}
                        </button>
                        <StatusMsg msg={passwordMsg} />
                    </div>
                </form>
            </section>

            {/* Notification Preferences */}
            <section className={cardClass}>
                <h2 className={cardTitleClass}>NOTIFICATION PREFERENCES</h2>
                <div className="flex items-center justify-between gap-4 py-2">
                    <div>
                        <p className="text-sm font-semibold">New event emails</p>
                        <p className="text-xs text-muted">Email me when an organiser I follow announces a new event. You&apos;ll still see these as notifications on Hexlura either way.</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={!emailMarketingOptOut}
                        onClick={handleToggleEmailMarketing}
                        disabled={notifLoading}
                        className={`w-11 h-6 rounded-full relative shrink-0 transition-colors ${emailMarketingOptOut ? 'bg-border' : 'bg-accent'}`}
                    >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${emailMarketingOptOut ? 'left-0.5' : 'left-[22px]'}`} />
                    </button>
                </div>
                {notifMsg && <div className="mt-2"><StatusMsg msg={notifMsg} /></div>}
            </section>

            {/* Danger Zone */}
            <section className="bg-card rounded-2xl border border-accent/30 shadow-soft p-6">
                <h2 className={`${cardTitleClass} text-accent`}>DANGER ZONE</h2>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <p className="text-sm font-semibold">Delete Account</p>
                        <p className="text-xs text-muted">Permanently delete your account and all associated data</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={deleteLoading}
                        className="px-5 py-2 rounded-full border border-accent text-accent text-sm font-semibold hover:bg-accent/10 transition inline-flex items-center gap-2"
                    >
                        {deleteLoading && <Spinner />}
                        {deleteLoading ? 'Deleting...' : 'Delete Account'}
                    </button>
                </div>
            </section>
        </div>
    )
}
