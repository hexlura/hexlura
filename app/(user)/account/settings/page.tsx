'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const inputClass = "w-full h-11 rounded-sm border border-[#2A2A3A] bg-[#0F0F18] px-4 text-sm text-[#F0F0F8] placeholder:text-[#8888AA] focus:outline-none focus:ring-2 focus:ring-[#E63950] disabled:opacity-50 disabled:cursor-not-allowed"
const cardClass = "bg-[#1A1A24] border border-[#2A2A3A] p-6"
const labelClass = "block text-sm font-medium text-[#8888AA] mb-1.5"

function Spinner() {
    return (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    )
}

export default function AccountSettingsPage() {
    const router = useRouter()
    const supabase = createClient()

    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [profileLoading, setProfileLoading] = useState(false)
    const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordLoading, setPasswordLoading] = useState(false)
    const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const [deleteLoading, setDeleteLoading] = useState(false)

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/auth/login'); return }
            setEmail(user.email || '')
            setFullName(user.user_metadata?.full_name || '')
        }
        load()
    }, [])

    async function handleSaveProfile(e: React.FormEvent) {
        e.preventDefault()
        setProfileLoading(true)
        setProfileMsg(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error: authError } = await supabase.auth.updateUser({ data: { full_name: fullName } })
            if (authError) throw authError

            const { error: dbError } = await supabase
                .from('profiles')
                .update({ full_name: fullName })
                .eq('id', user.id)
            if (dbError) throw dbError

            setProfileMsg({ type: 'success', text: 'Profile updated successfully.' })
        } catch (err: unknown) {
            setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update profile.' })
        } finally {
            setProfileLoading(false)
        }
    }

    async function handleChangePassword(e: React.FormEvent) {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: 'error', text: 'New passwords do not match.' })
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
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 36, color: '#F0F0F8', letterSpacing: '0.05em', marginBottom: 32 }}>
                ACCOUNT SETTINGS
            </h1>

            {/* Profile Section */}
            <div className={cardClass}>
                <h2 style={{ fontSize: 16, color: '#F0F0F8', fontWeight: 600, marginBottom: 20 }}>Profile Information</h2>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                        <label className={labelClass}>Full Name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            className={inputClass}
                            placeholder="Your full name"
                            required
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
                        <p style={{ fontSize: 12, color: '#8888AA', marginTop: 6 }}>Email cannot be changed</p>
                    </div>

                    {profileMsg && (
                        <p style={{
                            fontSize: 13,
                            padding: '8px 12px',
                            background: profileMsg.type === 'success' ? 'rgba(0,229,160,0.08)' : 'rgba(230,57,80,0.08)',
                            border: `1px solid ${profileMsg.type === 'success' ? 'rgba(0,229,160,0.2)' : 'rgba(230,57,80,0.2)'}`,
                            color: profileMsg.type === 'success' ? '#00E5A0' : '#E63950',
                        }}>
                            {profileMsg.text}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={profileLoading}
                        className="flex items-center gap-2 h-10 px-5 rounded-sm bg-[#E63950] text-white text-sm font-semibold hover:bg-[#E63950]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {profileLoading && <Spinner />}
                        {profileLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>

            {/* Password Section */}
            <div className={cardClass} style={{ marginTop: 24 }}>
                <h2 style={{ fontSize: 16, color: '#F0F0F8', fontWeight: 600, marginBottom: 20 }}>Change Password</h2>
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
                            required
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
                            required
                        />
                    </div>

                    {passwordMsg && (
                        <p style={{
                            fontSize: 13,
                            padding: '8px 12px',
                            background: passwordMsg.type === 'success' ? 'rgba(0,229,160,0.08)' : 'rgba(230,57,80,0.08)',
                            border: `1px solid ${passwordMsg.type === 'success' ? 'rgba(0,229,160,0.2)' : 'rgba(230,57,80,0.2)'}`,
                            color: passwordMsg.type === 'success' ? '#00E5A0' : '#E63950',
                        }}>
                            {passwordMsg.text}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={passwordLoading}
                        className="flex items-center gap-2 h-10 px-5 rounded-sm bg-[#E63950] text-white text-sm font-semibold hover:bg-[#E63950]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {passwordLoading && <Spinner />}
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>

            {/* Danger Zone */}
            <div style={{ marginTop: 24, background: '#1A1A24', border: '1px solid #E63950', padding: 24 }}>
                <h2 style={{ fontSize: 16, color: '#E63950', fontWeight: 600, marginBottom: 12 }}>Danger Zone</h2>
                <p style={{ fontSize: 13, color: '#8888AA', marginBottom: 16 }}>
                    Deleting your account is permanent and cannot be undone.
                </p>
                <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    className="flex items-center gap-2 h-10 px-5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ border: '1px solid #E63950', color: '#E63950', background: 'transparent', borderRadius: 2 }}
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
