'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const inputClass = "w-full h-11 border border-[#E0E0E0] bg-white px-4 text-sm text-[#0A0A0F] placeholder:text-[#C0C0C8] focus:outline-none focus:ring-2 focus:ring-[#0A0A0F] disabled:opacity-50 disabled:cursor-not-allowed"
const labelClass = "block text-sm font-medium text-[#0A0A0F] mb-1.5"
const cardStyle: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #E0E0E0', padding: 24, marginBottom: 24 }

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
        <p style={{
            fontSize: 13,
            color: msg.type === 'success' ? '#00C48A' : '#E63950',
        }}>
            {msg.text}
        </p>
    )
}

const saveButtonClass = "flex items-center justify-center gap-2 w-full h-11 bg-[#0A0A0F] text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"

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

    const today = new Date().toISOString().split('T')[0]

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/auth/login'); return }
            setUserId(user.id)
            setEmail(user.email || '')

            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, phone, avatar_url, date_of_birth, gender, address_line1, city, postcode')
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

        if (file.size > 2 * 1024 * 1024) {
            setAvatarError('File exceeds 2MB limit.')
            return
        }

        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `${userId}/avatar.${ext}`

        setAvatarUploading(true)
        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(path, file, { upsert: true })

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
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 36, color: '#0A0A0F', letterSpacing: '0.05em', marginBottom: 32 }}>
                ACCOUNT SETTINGS
            </h1>

            {/* Section 1 — Profile Photo */}
            <div style={cardStyle}>
                <h2 style={{ fontSize: 16, color: '#0A0A0F', fontWeight: 600, marginBottom: 20 }}>Profile Photo</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    {/* Avatar */}
                    <div style={{ width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                        {avatarUrl ? (
                            <Image
                                src={avatarUrl}
                                alt="Profile photo"
                                width={96}
                                height={96}
                                style={{ width: 96, height: 96, objectFit: 'cover' }}
                                unoptimized
                            />
                        ) : (
                            <div style={{
                                width: 96, height: 96, borderRadius: '50%',
                                background: '#E63950', color: '#FFFFFF',
                                fontSize: 32, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {initials}
                            </div>
                        )}
                    </div>

                    <div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={avatarUploading}
                            style={{
                                border: '1px solid #C0C0C8', padding: '8px 20px',
                                fontSize: 13, color: '#0A0A0F', cursor: 'pointer',
                                background: 'white', display: 'inline-flex', alignItems: 'center', gap: 6,
                            }}
                        >
                            {avatarUploading && <Spinner />}
                            {avatarUploading ? 'Uploading...' : 'Change Photo'}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            style={{ display: 'none' }}
                            onChange={handleAvatarChange}
                        />
                        <p style={{ fontSize: 11, color: '#8888AA', marginTop: 6 }}>JPG, PNG or WebP. Max 2MB.</p>
                        {avatarError && <p style={{ fontSize: 12, color: '#E63950', marginTop: 4 }}>{avatarError}</p>}
                    </div>
                </div>
            </div>

            {/* Section 2 — Personal Information */}
            <div style={cardStyle}>
                <h2 style={{ fontSize: 16, color: '#0A0A0F', fontWeight: 600, marginBottom: 20 }}>Personal Information</h2>
                <form onSubmit={handleSavePersonal} className="space-y-4">
                    <div>
                        <label className={labelClass}>Full Name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            className={inputClass}
                            placeholder="Your full name"
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Email</label>
                        <input
                            type="email"
                            value={email}
                            className={inputClass}
                            disabled
                            readOnly
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Phone Number</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            className={inputClass}
                            placeholder="+44 7700 900000"
                        />
                        <p style={{ fontSize: 11, color: '#8888AA', marginTop: 4 }}>Used for booking notifications only</p>
                    </div>
                    <div>
                        <label className={labelClass}>Date of Birth</label>
                        <input
                            type="date"
                            value={dateOfBirth}
                            onChange={e => setDateOfBirth(e.target.value)}
                            className={inputClass}
                            max={today}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Gender</label>
                        <select
                            value={gender}
                            onChange={e => setGender(e.target.value)}
                            className={inputClass}
                            style={{ appearance: 'auto' }}
                        >
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Non-binary">Non-binary</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                    </div>

                    {personalMsg && <StatusMsg msg={personalMsg} />}

                    <button
                        type="submit"
                        disabled={personalLoading}
                        className={saveButtonClass}
                        style={{ marginTop: 20 }}
                    >
                        {personalLoading && <Spinner />}
                        {personalLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>

            {/* Section 3 — Address */}
            <div style={cardStyle}>
                <h2 style={{ fontSize: 16, color: '#0A0A0F', fontWeight: 600, marginBottom: 20 }}>Address</h2>
                <form onSubmit={handleSaveAddress} className="space-y-4">
                    <div>
                        <label className={labelClass}>Address</label>
                        <input
                            type="text"
                            value={addressLine1}
                            onChange={e => setAddressLine1(e.target.value)}
                            className={inputClass}
                            placeholder="123 High Street"
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Postcode</label>
                        <input
                            type="text"
                            value={postcode}
                            onChange={e => { setPostcode(e.target.value); setPostcodeMsg(null) }}
                            onBlur={handlePostcodeBlur}
                            className={inputClass}
                            placeholder="NN1 1AA"
                        />
                        {postcodeMsg && (
                            <p style={{ fontSize: 12, color: '#00C48A', marginTop: 4 }}>{postcodeMsg}</p>
                        )}
                    </div>
                    <div>
                        <label className={labelClass}>City</label>
                        <input
                            type="text"
                            value={city}
                            onChange={e => setCity(e.target.value)}
                            className={inputClass}
                            placeholder="Northampton"
                        />
                    </div>

                    {addressMsg && <StatusMsg msg={addressMsg} />}

                    <button
                        type="submit"
                        disabled={addressLoading}
                        className={saveButtonClass}
                        style={{ marginTop: 20 }}
                    >
                        {addressLoading && <Spinner />}
                        {addressLoading ? 'Saving...' : 'Save Address'}
                    </button>
                </form>
            </div>

            {/* Section 4 — Password */}
            <div style={cardStyle}>
                <h2 style={{ fontSize: 16, color: '#0A0A0F', fontWeight: 600, marginBottom: 20 }}>Change Password</h2>
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label className={labelClass}>Current Password</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            className={inputClass}
                            placeholder="Current password"
                        />
                    </div>
                    <div>
                        <label className={labelClass}>New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className={inputClass}
                            placeholder="Min 8 characters"
                            minLength={8}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className={inputClass}
                            placeholder="Repeat new password"
                        />
                    </div>

                    {passwordMsg && <StatusMsg msg={passwordMsg} />}

                    <button
                        type="submit"
                        disabled={passwordLoading}
                        className={saveButtonClass}
                        style={{ marginTop: 20 }}
                    >
                        {passwordLoading && <Spinner />}
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>

            {/* Section 5 — Danger Zone */}
            <div style={{ border: '1px solid #E63950', padding: 24 }}>
                <h2 style={{ fontSize: 16, color: '#E63950', fontWeight: 600, marginBottom: 12 }}>Danger Zone</h2>
                <p style={{ fontSize: 13, color: '#8888AA', marginBottom: 16 }}>
                    Deleting your account is permanent and cannot be undone. All your bookings and data will be removed.
                </p>
                <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ border: '1px solid #E63950', color: '#E63950', background: 'transparent', padding: '10px 24px', fontSize: 13 }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#E63950'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#E63950' }}
                >
                    {deleteLoading && <Spinner />}
                    {deleteLoading ? 'Deleting...' : 'Delete Account'}
                </button>
            </div>
        </div>
    )
}
