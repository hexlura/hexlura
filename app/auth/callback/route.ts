import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendUserWelcomeEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Fetch user profile to determine redirect
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                // Profile row is auto-created by the handle_new_user() Postgres trigger.
                // Detect a brand-new signup via user.created_at being very recent —
                // checking !existingProfile would never fire because the trigger ran first.
                const createdAt = new Date(user.created_at).getTime()
                const isNewSignup = Date.now() - createdAt < 60_000

                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (isNewSignup) {
                    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || null
                    const avatarUrl = user.user_metadata?.avatar_url || null

                    // Trigger already inserted the row; patch in OAuth-provided fields the trigger doesn't set
                    await supabase
                        .from('profiles')
                        .update({ full_name: fullName, avatar_url: avatarUrl })
                        .eq('id', user.id)

                    // Notify admins about new user signup
                    const adminClient = createAdminClient()
                    const { data: admins } = await adminClient
                        .from('profiles')
                        .select('id')
                        .eq('role', 'admin')
                    if (admins?.length) {
                        await adminClient.from('notifications').insert(
                            admins.map(admin => ({
                                user_id: admin.id,
                                type: 'new_user_signup',
                                title: 'New user registered',
                                body: `${fullName || 'A new user'} (${user.email}) just signed up.`,
                                link: '/admin/users',
                            }))
                        )
                    }

                    // Await so serverless runtime doesn't tear down the response before Resend completes
                    if (user.email) {
                        await sendUserWelcomeEmail({ to: user.email, fullName: fullName || 'there' })
                    }

                    const dest = (next && next !== '/' && next !== '/account') ? next : '/'
                    return NextResponse.redirect(`${origin}${dest}`)
                }

                // If a specific next destination was requested (booking flow), honour it
                if (next && next !== '/' && next !== '/account') {
                    return NextResponse.redirect(`${origin}${next}`)
                }

                // Role-based redirect (default to 'user' if profile lookup somehow returned null)
                const role = existingProfile?.role || 'user'
                if (role === 'admin') {
                    return NextResponse.redirect(`${origin}/admin`)
                } else if (role === 'organiser') {
                    return NextResponse.redirect(`${origin}/organiser`)
                } else if (role === 'door_staff') {
                    return NextResponse.redirect(`${origin}/checkin`)
                } else {
                    return NextResponse.redirect(`${origin}/`)
                }
            }

            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // Auth code error — redirect to login with error
    return NextResponse.redirect(`${origin}/auth/login`)
}
