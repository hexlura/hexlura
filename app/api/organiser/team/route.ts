import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import TeamInvite from '@/emails/team-invite'

function getResend() {
    return new Resend(process.env.RESEND_API_KEY || 'placeholder')
}

async function getOrganiserProfile(userId: string) {
    const adminClient = createAdminClient()
    const { data } = await adminClient
        .from('organiser_profiles')
        .select('id, org_name')
        .eq('user_id', userId)
        .single()
    return data
}

async function sendInviteEmail(to: string, orgName: string, inviteToken: string) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.hexlura.com'
    const acceptUrl = `${appUrl}/team/accept?token=${inviteToken}`

    try {
        const html = await render(TeamInvite({ orgName, acceptUrl }))
        await getResend().emails.send({
            from: 'Hexlura <noreply@hexlura.com>',
            to,
            subject: `You've been invited to join ${orgName} on Hexlura`,
            html,
        })
    } catch (err) {
        console.error('Failed to send team invite email:', err)
    }
}

export async function GET() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiserProfile(user.id)
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()
    const { data: members } = await adminClient
        .from('organiser_team')
        .select('id, invited_email, privilege, status, created_at, accepted_at, profile:profiles!user_id(full_name, avatar_url)')
        .eq('organiser_id', organiser.id)
        .neq('status', 'removed')
        .order('created_at', { ascending: false })

    return NextResponse.json({ members: members || [] })
}

export async function POST(req: Request) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiserProfile(user.id)
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { email, privilege } = await req.json()
    if (!email || !privilege) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    if (privilege !== 'door_staff') return NextResponse.json({ error: 'Invalid privilege.' }, { status: 400 })

    // Prevent organiser from inviting themselves
    if (email.toLowerCase() === user.email?.toLowerCase()) {
        return NextResponse.json({ error: 'You cannot invite yourself.' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Prevent inviting someone who is already an active member of another organiser's team
    const { data: activeElsewhere } = await adminClient
        .from('organiser_team')
        .select('id')
        .eq('invited_email', email)
        .eq('status', 'active')
        .neq('organiser_id', organiser.id)
        .maybeSingle()

    if (activeElsewhere) {
        return NextResponse.json({ error: 'This person is already an active team member of another organiser.' }, { status: 409 })
    }

    // Check if already in team
    const { data: existing } = await adminClient
        .from('organiser_team')
        .select('id, status, invite_token')
        .eq('organiser_id', organiser.id)
        .eq('invited_email', email)
        .maybeSingle()

    if (existing && existing.status !== 'removed') {
        return NextResponse.json({ error: 'This person is already in your team.' }, { status: 409 })
    }

    // Look up user by email in profiles table (avoids listUsers pagination limits)
    let invitedUserId: string | null = null
    const { data: profileMatch } = await adminClient
        .from('profiles')
        .select('id, role')
        .eq('email', email)
        .maybeSingle()
    if (profileMatch) {
        if (profileMatch.role === 'organiser') {
            return NextResponse.json({ error: 'Organisers cannot be added as team members.' }, { status: 400 })
        }
        invitedUserId = profileMatch.id
    }

    let inviteToken: string

    if (existing && existing.status === 'removed') {
        // Re-invite: reset the existing removed row instead of inserting a duplicate
        const { data: updated, error } = await adminClient
            .from('organiser_team')
            .update({
                user_id: invitedUserId,
                privilege,
                status: 'pending',
                invited_by: user.id,
                accepted_at: null,
                invite_token: crypto.randomUUID(),
            })
            .eq('id', existing.id)
            .select('invite_token')
            .single()

        if (error || !updated) return NextResponse.json({ error: 'Failed to add member.' }, { status: 500 })
        inviteToken = updated.invite_token
    } else {
        const { data: inserted, error } = await adminClient
            .from('organiser_team')
            .insert({
                organiser_id: organiser.id,
                user_id: invitedUserId,
                privilege,
                status: 'pending',
                invited_by: user.id,
                invited_email: email,
            })
            .select('invite_token')
            .single()

        if (error || !inserted) return NextResponse.json({ error: 'Failed to add member.' }, { status: 500 })
        inviteToken = inserted.invite_token
    }

    await sendInviteEmail(email, organiser.org_name, inviteToken)

    return NextResponse.json({ success: true })
}

export async function PATCH(req: Request) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiserProfile(user.id)
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { member_id, privilege, resend } = body

    if (!member_id) return NextResponse.json({ error: 'Missing member_id' }, { status: 400 })

    const adminClient = createAdminClient()

    // Verify membership belongs to this organiser
    const { data: member } = await adminClient
        .from('organiser_team')
        .select('id, invited_email, privilege, invite_token')
        .eq('id', member_id)
        .eq('organiser_id', organiser.id)
        .single()

    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    if (resend) {
        await sendInviteEmail(member.invited_email, organiser.org_name, member.invite_token)
        return NextResponse.json({ success: true })
    }

    if (!privilege) return NextResponse.json({ error: 'Missing privilege' }, { status: 400 })

    const { error } = await adminClient
        .from('organiser_team')
        .update({ privilege })
        .eq('id', member_id)

    if (error) return NextResponse.json({ error: 'Failed to update role.' }, { status: 500 })
    return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiserProfile(user.id)
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { member_id } = await req.json()
    if (!member_id) return NextResponse.json({ error: 'Missing member_id' }, { status: 400 })

    const adminClient = createAdminClient()
    const { error } = await adminClient
        .from('organiser_team')
        .update({ status: 'removed' })
        .eq('id', member_id)
        .eq('organiser_id', organiser.id)

    if (error) return NextResponse.json({ error: 'Failed to remove member.' }, { status: 500 })
    return NextResponse.json({ success: true })
}
