import { createClient } from '@/lib/supabase/server'
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
                // Upsert profile for OAuth users (e.g. Google sign-in)
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (!existingProfile) {
                    await supabase.from('profiles').insert({
                        id: user.id,
                        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
                        avatar_url: user.user_metadata?.avatar_url || null,
                        role: 'user',
                    })
                    return NextResponse.redirect(`${origin}/account`)
                }

                // Role-based redirect
                const role = existingProfile.role
                if (role === 'admin') {
                    return NextResponse.redirect(`${origin}/admin`)
                } else if (role === 'organiser') {
                    return NextResponse.redirect(`${origin}/organiser`)
                } else {
                    return NextResponse.redirect(`${origin}/account`)
                }
            }

            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // Auth code error — redirect to login with error
    return NextResponse.redirect(`${origin}/auth/login`)
}
