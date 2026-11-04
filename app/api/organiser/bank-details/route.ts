import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateBankDetails, maskAccountNumber } from '@/lib/bank-details'
import { sendBankDetailsChangedEmail } from '@/lib/email'
import { notifyAdmins } from '@/lib/notify-admins'

// Organiser updates their own payout bank details.
// Only the account OWNER may do this (not team members) — it decides where money is sent.
// Every change is validated, audit-logged, emailed to the organiser, and flagged to admins, and the
// payouts screen warns an admin for 7 days afterwards. Full account numbers are never logged.
export async function POST(request: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null) as { name?: unknown; sortCode?: unknown; accountNumber?: unknown; useForPayouts?: unknown } | null
    if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const checked = validateBankDetails(body)
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 })

    const adminClient = createAdminClient()
    const { data: organiser, error: orgErr } = await adminClient
        .from('organiser_profiles')
        .select('id, org_name, user_id, stripe_account_id, payout_method, bank_account_name, bank_sort_code, bank_account_number, is_suspended')
        .eq('user_id', user.id)
        .maybeSingle()
    if (orgErr) return NextResponse.json({ error: 'Could not load your organiser account' }, { status: 500 })
    if (!organiser) return NextResponse.json({ error: 'Only the organiser account owner can change bank details' }, { status: 403 })
    if (organiser.is_suspended) return NextResponse.json({ error: 'Your account is suspended' }, { status: 403 })

    const unchanged =
        organiser.bank_account_name === checked.values.bank_account_name &&
        organiser.bank_sort_code === checked.values.bank_sort_code &&
        organiser.bank_account_number === checked.values.bank_account_number

    const update: Record<string, string> = { ...checked.values }
    // Only switch the payout method to bank for organisers with no connected Stripe account.
    // A connected organiser keeps being paid via Stripe; these details are what an admin uses if a bank payout is needed.
    if (body.useForPayouts === true && !organiser.stripe_account_id) update.payout_method = 'bank_transfer'

    const { error: saveErr } = await adminClient.from('organiser_profiles').update(update).eq('id', organiser.id)
    if (saveErr) {
        console.error('Organiser bank details save failed:', saveErr)
        return NextResponse.json({ error: 'Could not save your bank details. Please try again.' }, { status: 500 })
    }

    if (unchanged) return NextResponse.json({ success: true, changed: false })

    // Audit — account number masked. A failed audit write is logged but must not undo a saved change.
    const { error: auditErr } = await adminClient.from('audit_logs').insert({
        actor_id: user.id,
        action: 'update_bank_details',
        entity_type: 'organiser',
        entity_id: organiser.id,
        metadata: {
            by: 'organiser',
            before: { name: organiser.bank_account_name, account: maskAccountNumber(organiser.bank_account_number) },
            after: { name: checked.values.bank_account_name, account: maskAccountNumber(checked.values.bank_account_number) },
        },
    })
    if (auditErr) console.error('Bank details audit log failed:', auditErr.message)

    const { data: profile } = await adminClient.from('profiles').select('email, full_name').eq('id', user.id).maybeSingle()
    if (profile?.email) {
        await sendBankDetailsChangedEmail({
            to: profile.email,
            fullName: profile.full_name || organiser.org_name,
            orgName: organiser.org_name,
            accountName: checked.values.bank_account_name,
            sortCode: checked.values.bank_sort_code,
            accountNumber: checked.values.bank_account_number,
            changedBy: 'you',
        })
    }

    await notifyAdmins({
        type: 'bank_details_changed',
        title: 'Organiser changed bank details',
        body: `${organiser.org_name} changed their payout bank details (now ending ${checked.values.bank_account_number.slice(-4)}). Check before processing their next payout.`,
        link: `/admin/organisers/${organiser.id}`,
    })

    return NextResponse.json({ success: true, changed: true })
}
