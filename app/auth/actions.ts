'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendUserWelcomeEmail } from '@/lib/email'
import { redirect } from 'next/navigation'

export async function signUp(formData: FormData) {
    const supabase = createClient()

    const fullName = formData.get('full_name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm_password') as string
    const next = (formData.get('next') as string | null) || ''

    if (!fullName || !email || !password) {
        return { error: 'All fields are required.' }
    }

    if (password.length < 8) {
        return { error: 'Password must be at least 8 characters.' }
    }

    if (password !== confirmPassword) {
        return { error: 'Passwords do not match.' }
    }

    // Safe relative-path check to prevent open redirect
    const safeNext = next.startsWith('/') ? next : ''

    const callbackUrl = safeNext
        ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(safeNext)}`
        : `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName },
            emailRedirectTo: callbackUrl,
        },
    })

    if (error) {
        return { error: error.message }
    }

    if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            role: 'user',
        })
        if (profileError) {
            console.error('Profile creation error:', profileError.message)
        }

        // Notify admins about new user signup
        const adminClient = createAdminClient()
        const { data: admins } = await adminClient
            .from('profiles')
            .select('id')
            .eq('role', 'admin')
        if (admins?.length) {
            void adminClient.from('notifications').insert(
                admins.map(admin => ({
                    user_id: admin.id,
                    type: 'new_user_signup',
                    title: 'New user registered',
                    body: `${fullName} (${email}) just signed up.`,
                    link: '/admin/users',
                }))
            )
        }

        // Send welcome email (best-effort, runs alongside Supabase verification email)
        void sendUserWelcomeEmail({ to: email, fullName })
    }

    const verifyUrl = safeNext
        ? `/auth/verify?next=${encodeURIComponent(safeNext)}&email=${encodeURIComponent(email)}`
        : `/auth/verify?email=${encodeURIComponent(email)}`

    redirect(verifyUrl)
}

export async function signIn(formData: FormData) {
    const supabase = createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const next = (formData.get('next') as string | null) || ''

    if (!email || !password) {
        return { error: 'Email and password are required.' }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        return { error: error.message }
    }

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Authentication failed.' }
    }

    // If a safe next param was supplied, honour it
    const safeNext = next.startsWith('/') ? next : ''
    if (safeNext) {
        return { redirectTo: safeNext }
    }

    // Service client bypasses RLS for reliable role lookup
    const serviceClient = createServiceClient()
    const { data: profile } = await serviceClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = profile?.role || 'user'

    // Return redirectTo — client uses router.push(), never call redirect() here
    if (role === 'admin') return { redirectTo: '/admin' }
    if (role === 'organiser') return { redirectTo: '/organiser' }

    // Door staff (legacy profile role, or an active door_staff seat on an organiser team)
    // go straight to the scanner — same rule the middleware applies to signed-in visitors.
    if (role === 'door_staff') return { redirectTo: '/checkin' }
    const { data: teamRows, error: teamError } = await serviceClient
        .from('organiser_team')
        .select('id')
        .eq('user_id', user.id)
        .eq('privilege', 'door_staff')
        .eq('status', 'active')
        .limit(1)
    if (teamError) {
        console.error('signIn: organiser_team lookup failed — sending to /account:', teamError.message)
    } else if (teamRows && teamRows.length > 0) {
        return { redirectTo: '/checkin' }
    }

    return { redirectTo: '/account' }
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
}

export async function resetPassword(formData: FormData) {
    const supabase = createClient()

    const email = formData.get('email') as string
    if (!email) {
        return { error: 'Email is required.' }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/update-password`,
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

    return { success: 'Password updated successfully.' }
}

export async function resendVerificationEmail(email: string, next?: string) {
    const supabase = createClient()

    // Safe relative-path check to prevent open redirect
    const safeNext = next && next.startsWith('/') ? next : ''
    const callbackUrl = safeNext
        ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(safeNext)}`
        : `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`

    const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
            emailRedirectTo: callbackUrl,
        },
    })

    if (error) {
        return { error: error.message }
    }

    return { success: 'Verification email sent.' }
}
