'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')

        const supabase = createClient()
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

        if (authError) {
            setError(authError.message)
            setLoading(false)
            return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setError('Login failed. Please try again.')
            setLoading(false)
            return
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const role = profile?.role

        if (role === 'door_staff') {
            router.push('/checkin')
        } else if (role === 'organiser' || role === 'admin') {
            router.push('/organiser')
        } else {
            await supabase.auth.signOut()
            setError('This account does not have door staff access.')
            setLoading(false)
        }
    }

    return (
        <div style={{
            background: '#0A0A0F',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
        }}>
            <div style={{
                background: '#13131A',
                border: '1px solid #2A2A3A',
                padding: '40px',
                width: '100%',
                maxWidth: '400px',
                borderRadius: '0',
            }}>
                <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px', color: '#E63950', textAlign: 'center', marginBottom: '4px', letterSpacing: '2px' }}>
                    HEXLURA™
                </p>
                <p style={{ fontSize: '13px', color: '#8888AA', textAlign: 'center', marginBottom: '32px' }}>
                    Door Staff Check-in
                </p>
                <div style={{ borderTop: '1px solid #2A2A3A', marginBottom: '24px' }} />

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#8888AA', marginBottom: '6px' }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            style={{
                                width: '100%',
                                background: '#0A0A0F',
                                border: '1px solid #2A2A3A',
                                color: '#F0F0F8',
                                padding: '10px 12px',
                                fontSize: '14px',
                                borderRadius: '2px',
                                outline: 'none',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#8888AA', marginBottom: '6px' }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            style={{
                                width: '100%',
                                background: '#0A0A0F',
                                border: '1px solid #2A2A3A',
                                color: '#F0F0F8',
                                padding: '10px 12px',
                                fontSize: '14px',
                                borderRadius: '2px',
                                outline: 'none',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    {error && (
                        <p style={{ fontSize: '13px', color: '#E63950', margin: '0' }}>{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            background: loading ? '#7a1a26' : '#E63950',
                            color: 'white',
                            padding: '12px',
                            borderRadius: '2px',
                            fontSize: '14px',
                            fontWeight: '600',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            marginTop: '4px',
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#8888AA' }}>
                    Organiser?{' '}
                    <Link href="/auth/login" style={{ color: '#E63950', textDecoration: 'none' }}>
                        Sign in here →
                    </Link>
                </p>
            </div>
        </div>
    )
}
