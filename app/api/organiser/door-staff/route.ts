import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServiceClient } from '@/lib/supabase/service'

async function getOrganiser(userId: string) {
    const serviceClient = createServiceClient()
    const { data } = await serviceClient
        .from('organiser_profiles')
        .select('id')
        .eq('user_id', userId)
        .single()
    return data
}

// GET — list door staff for the authenticated organiser
export async function GET() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiser(user.id)
    if (!organiser) return NextResponse.json({ error: 'Not an organiser' }, { status: 403 })

    const adminClient = createAdminClient()

    const { data: doorStaffRows } = await adminClient
        .from('door_staff')
        .select('id, user_id')
        .eq('organiser_id', organiser.id)

    if (!doorStaffRows || doorStaffRows.length === 0) {
        return NextResponse.json({ staff: [] })
    }

    const userIds = doorStaffRows.map((r: { user_id: string }) => r.user_id)
    const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

    const profileMap = new Map(
        (profiles ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => [p.id, p])
    )

    const staff = doorStaffRows.map((r: { id: string; user_id: string }) => {
        const p = profileMap.get(r.user_id) as { id: string; full_name: string | null; email: string | null } | undefined
        return {
            id: r.id,
            user_id: r.user_id,
            full_name: p?.full_name ?? null,
            email: p?.email ?? null,
        }
    })

    return NextResponse.json({ staff })
}

// POST — add door staff by email
export async function POST(req: Request) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiser(user.id)
    if (!organiser) return NextResponse.json({ error: 'Not an organiser' }, { status: 403 })

    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const adminClient = createAdminClient()

    // Find user by email in profiles
    const { data: targetProfile } = await adminClient
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', email)
        .single()

    if (!targetProfile) {
        return NextResponse.json(
            { error: 'No account found with this email. Ask them to register at hexlura.com first.' },
            { status: 404 }
        )
    }

    // Insert into door_staff
    const { data: inserted, error: insertError } = await adminClient
        .from('door_staff')
        .insert({ organiser_id: organiser.id, user_id: targetProfile.id })
        .select('id, user_id')
        .single()

    if (insertError) {
        if (insertError.code === '23505') {
            return NextResponse.json({ error: 'This user is already a door staff member.' }, { status: 409 })
        }
        return NextResponse.json({ error: 'Failed to add door staff' }, { status: 500 })
    }

    // Update role to door_staff
    await adminClient
        .from('profiles')
        .update({ role: 'door_staff' })
        .eq('id', targetProfile.id)

    return NextResponse.json({
        member: {
            id: inserted.id,
            user_id: inserted.user_id,
            full_name: targetProfile.full_name,
            email: targetProfile.email,
        },
    })
}

// DELETE — remove door staff
export async function DELETE(req: Request) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiser(user.id)
    if (!organiser) return NextResponse.json({ error: 'Not an organiser' }, { status: 403 })

    const { user_id } = await req.json()
    if (!user_id) return NextResponse.json({ error: 'user_id is required' }, { status: 400 })

    const adminClient = createAdminClient()

    // Delete from door_staff
    const { error: deleteError } = await adminClient
        .from('door_staff')
        .delete()
        .eq('organiser_id', organiser.id)
        .eq('user_id', user_id)

    if (deleteError) {
        return NextResponse.json({ error: 'Failed to remove door staff' }, { status: 500 })
    }

    // Reset role to user
    await adminClient
        .from('profiles')
        .update({ role: 'user' })
        .eq('id', user_id)

    return NextResponse.json({ success: true })
}
