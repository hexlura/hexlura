import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateBankDetails, maskAccountNumber } from '@/lib/bank-details'
import { sendBankDetailsChangedEmail } from '@/lib/email'
import { notifyAdmins } from '@/lib/notify-admins'

// Admin updates an organiser's payout bank details (e.g. they asked support to change them).
// A reason is required and kept in the audit log; the organiser is emailed so a change they did not
// ask for is noticed. Full account numbers are never logged.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => null) as { name?: unknown; sortCode?: unknown; accountNumber?: unknown; reason?: unknown } | null
    if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (reason.length < 3 || reason.length > 300) {
        return NextResponse.json({ error: 'A reason is required (3–300 characters).' }, { status: 400 })
    }

    const checked = validateBankDetails(body)
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 })

    const { data: organiser, error: orgErr } = await adminClient
        .from('organiser_profiles')
        .select('id, org_name, user_id, bank_account_name, bank_account_number')
        .eq('id', params.id)
        .maybeSingle()
    if (orgErr) return NextResponse.json({ error: 'Could not load the organiser' }, { status: 500 })
    if (!organiser) return NextResponse.json({ error: 'Organiser not found' }, { status: 404 })

    const { error: saveErr } = await adminClient.from('organiser_profiles').update(checked.values).eq('id', organiser.id)
    if (saveErr) {
        console.error('Admin bank details save failed:', saveErr)
        return NextResponse.json({ error: 'Could not save the bank details' }, { status: 500 })
    }

    const { error: auditErr } = await adminClient.from('audit_logs').insert({
        actor_id: user.id,
        action: 'update_bank_details',
        entity_type: 'organiser',
        entity_id: organiser.id,
        metadata: {
            by: 'admin',
            reason,
            before: { name: organiser.bank_account_name, account: maskAccountNumber(organiser.bank_account_number) },
            after: { name: checked.values.bank_account_name, account: maskAccountNumber(checked.values.bank_account_number) },
        },
    })
    if (auditErr) console.error('Bank details audit log failed:', auditErr.message)

    const { data: profile } = await adminClient.from('profiles').select('email, full_name').eq('id', organiser.user_id).maybeSingle()
    if (profile?.email) {
        await sendBankDetailsChangedEmail({
            to: profile.email,
            fullName: profile.full_name || organiser.org_name,
            orgName: organiser.org_name,
            accountName: checked.values.bank_account_name,
            sortCode: checked.values.bank_sort_code,
            accountNumber: checked.values.bank_account_number,
            changedBy: 'Hexlura',
        })
    }

    // Tell every admin (not just the one who did it) — this is the change an intruder with an admin
    // session would make first, and the others are the people who can spot it.
    await notifyAdmins({
        type: 'bank_details_changed',
        title: 'Admin changed an organiser\'s bank details',
        body: `${user.email ?? 'An admin'} changed ${organiser.org_name}'s payout bank details (now ending ${checked.values.bank_account_number.slice(-4)}). Reason: "${reason}". Bank-transfer payouts are held for 7 days.`,
        link: `/admin/organisers/${organiser.id}`,
    })

    return NextResponse.json({ success: true })
}
