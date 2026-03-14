'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'

export async function signUp(formData: FormData) {
    const supabase = createClient()

    const fullName = formData.get('full_name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (!fullName || !email || !password) {
        return { error: 'All fields are required.' }
    }

    if (password.length < 8) {
        return { error: 'Password must be at least 8 characters.' }
    }

    if (password !== confirmPassword) {
        return { error: 'Passwords do not match.' }
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName },
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
    })

    if (error) {
        return { error: error.message }
    }

    // Insert into profiles table
    if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            role: 'user',
        })
        if (profileError) {
            console.error('Profile creation error:', profileError.message)
        }
    }

    redirect('/auth/verify')
}

export async function signIn(formData: FormData) {
    const supabase = createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Email and password are required.' }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        return { error: error.message }
    }

    // Fetch profile to determine redirect destination
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Authentication failed.' }
    }

    // Service client bypasses RLS so role is always readable
    const serviceClient = createServiceClient()
    const { data: profile } = await serviceClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = profile?.role || 'user'

    // Return the destination so the client can drive the navigation.
    // Calling redirect() inside a server action invoked from a client-side
    // async handler is unreliable — the client must use router.push() instead.
    if (role === 'admin') {
        return { redirectTo: '/admin' }
    } else if (role === 'organiser') {
        const { data: organiserProfile } = await serviceClient
            .from('organiser_profiles')
            .select('is_approved')
            .eq('user_id', user.id)
            .maybeSingle()
        if (organiserProfile?.is_approved) {
            return { redirectTo: '/organiser' }
        }
        return { redirectTo: '/organiser/pending' }
    } else {
        return { redirectTo: '/account' }
    }
}

export async function signInWithGoogle() {
    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
    })

    if (error) {
        return { error: error.message }
    }

    if (data.url) {
        redirect(data.url)
    }
}

export async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    redirect('/')
}

export async function resetPassword(formData: FormData) {
    const supabase = createClient()

    const email = formData.get('email') as string
    if (!email) {
        return { error: 'Email is required.' }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password`,
    })

    if (error) {
        return { error: error.message }
    }

    return { success: 'Check your email for a password reset link.' }
}

export async function updatePassword(formData: FormData) {
    const supabase = createClient()

    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (!password || password.length < 8) {
        return { error: 'Password must be at least 8 characters.' }
    }

    if (password !== confirmPassword) {
        return { error: 'Passwords do not match.' }
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
        return { error: error.message }
    }

    redirect('/auth/login')
}

export async function resendVerificationEmail(email: string) {
    const supabase = createClient()

    const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
    })

    if (error) {
        return { error: error.message }
    }

    return { success: 'Verification email sent.' }
}
