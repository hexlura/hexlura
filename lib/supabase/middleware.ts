import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    // Refresh the session
    const { data: { user } } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // Routes exempt from organiser role check (accessible by any authenticated user)
    const isOrganiserApplyRoute = pathname === '/organiser/apply'
    const isOrganiserPendingRoute = pathname === '/organiser/pending'

    // Protected routes that require authentication
    const isAccountRoute = pathname.startsWith('/account') || pathname.startsWith('/bookings') || pathname.startsWith('/checkout')
    const isOrganiserRoute = pathname.startsWith('/organiser')
    const isAdminRoute = pathname.startsWith('/admin')
    const isProtectedRoute = isAccountRoute || isOrganiserRoute || isAdminRoute

    // If not authenticated and trying to access a protected route, redirect to login
    if (!user && isProtectedRoute) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/auth/login'
        loginUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Role-based access control for authenticated users
    if (user && isProtectedRoute) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const role = profile?.role || 'user'

        // Admin visiting /account/* → redirect to admin panel
        if (isAccountRoute && role === 'admin') {
            const adminUrl = request.nextUrl.clone()
            adminUrl.pathname = '/admin'
            return NextResponse.redirect(adminUrl)
        }

        // /organiser/apply is accessible to any authenticated user
        // /organiser/pending is accessible to organisers (approved or not)
        if (isOrganiserRoute && !isOrganiserApplyRoute && !isOrganiserPendingRoute) {
            if (role !== 'organiser' && role !== 'admin') {
                const homeUrl = request.nextUrl.clone()
                homeUrl.pathname = '/'
                return NextResponse.redirect(homeUrl)
            }
        }

        // Admin routes: must have admin role
        if (isAdminRoute && role !== 'admin') {
            const homeUrl = request.nextUrl.clone()
            homeUrl.pathname = '/'
            return NextResponse.redirect(homeUrl)
        }
    }

    // If authenticated and visiting auth pages, redirect to their dashboard
    if (user && pathname.startsWith('/auth/') && !pathname.startsWith('/auth/callback')) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const role = profile?.role || 'user'
        const redirectUrl = request.nextUrl.clone()

        if (role === 'admin') {
            redirectUrl.pathname = '/admin'
        } else if (role === 'organiser') {
            redirectUrl.pathname = '/organiser'
        } else {
            redirectUrl.pathname = '/account'
        }

        return NextResponse.redirect(redirectUrl)
    }

    return response
}
