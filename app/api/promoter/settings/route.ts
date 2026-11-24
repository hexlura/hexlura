import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolvePromoterId } from '@/lib/promoter-access'
import { validateBankDetails, maskAccountNumber } from '@/lib/bank-details'
import { sendBankDetailsChangedEmail } from '@/lib/email'
import { notifyAdmins } from '@/lib/notify-admins'

const PAYOUT_METHODS = ['bank_transfer', 'stripe_connect']

function blank(v: unknown): boolean {
    return v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
}

function same(a: unknown, b: string | null): boolean {
    return (blank(a) && (b === null || b === '')) || (typeof a === 'string' && a === b)
}

// Promoter updates their own profile. Bank details decide where commission is sent, so a change to them
// is validated, audit-logged (account number masked), emailed to the promoter and flagged to admins, and
// bank-transfer payouts are held for 7 days afterwards (migration 079 stamps bank_details_changed_at).
export async function PATCH(request: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const promoterId = await resolvePromoterId(user.id)
    if (!promoterId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()
    const { data: current, error: currentErr } = await adminClient
        .from('promoter_profiles')
        .select('status, display_name, user_id, payout_method, bank_account_name, bank_sort_code, bank_account_number')
        .eq('id', promoterId)
        .single()
    if (currentErr || !current) return NextResponse.json({ error: 'Could not load your promoter account' }, { status: 500 })
    if (current.status === 'suspended') return NextResponse.json({ error: 'Your account has been suspended' }, { status: 403 })

    const body = await request.json().catch(() => ({})) as {
        display_name?: string
        bio?: string | null
        payout_method?: 'bank_transfer' | 'stripe_connect' | null
        bank_account_name?: string | null
        bank_account_number?: string | null
        bank_sort_code?: string | null
    }

    const update: Record<string, unknown> = {}
    if (typeof body.display_name === 'string') {
        const name = body.display_name.trim()
        if (name.length < 2 || name.length > 50) {
            return NextResponse.json({ error: 'Display name must be 2–50 characters' }, { status: 400 })
        }
        update.display_name = name
    }
    if (body.bio !== undefined) {
        const bio = body.bio?.toString().trim() || null
        if (bio && bio.length > 500) return NextResponse.json({ error: 'Bio must be 500 characters or fewer' }, { status: 400 })
        update.bio = bio
    }
    if (body.payout_method !== undefined) {
        if (body.payout_method !== null && !PAYOUT_METHODS.includes(body.payout_method)) {
            return NextResponse.json({ error: 'Invalid payout method' }, { status: 400 })
        }
        update.payout_method = body.payout_method
    }

    // Bank details: only validated and written when they actually differ from what is stored, so a legacy
    // record that predates validation does not block saving an unrelated field such as the bio.
    let bankChanged = false
    let newBank: { name: string | null; sortCode: string | null; accountNumber: string | null } | null = null
    const bankSent = body.bank_account_name !== undefined || body.bank_account_number !== undefined || body.bank_sort_code !== undefined
    if (bankSent) {
        const unchanged =
            same(body.bank_account_name, current.bank_account_name) &&
            same(body.bank_sort_code, current.bank_sort_code) &&
            same(body.bank_account_number, current.bank_account_number)
        if (!unchanged) {
            if (blank(body.bank_account_name) && blank(body.bank_sort_code) && blank(body.bank_account_number)) {
                update.bank_account_name = null
                update.bank_sort_code = null
                update.bank_account_number = null
                newBank = { name: null, sortCode: null, accountNumber: null }
            } else {
                const checked = validateBankDetails({ name: body.bank_account_name, sortCode: body.bank_sort_code, accountNumber: body.bank_account_number })
                if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 })
                update.bank_account_name = checked.values.bank_account_name
                update.bank_sort_code = checked.values.bank_sort_code
                update.bank_account_number = checked.values.bank_account_number
                newBank = { name: checked.values.bank_account_name, sortCode: checked.values.bank_sort_code, accountNumber: checked.values.bank_account_number }
            }
            bankChanged = true
        }
    }

    if (Object.keys(update).length === 0) return NextResponse.json({ success: true })

    const { error } = await adminClient
        .from('promoter_profiles')
        .update(update)
        .eq('id', promoterId)

    if (error) {
        console.error('Promoter settings save failed:', error.message)
        return NextResponse.json({ error: 'Could not save your settings. Please try again.' }, { status: 500 })
    }

    if (bankChanged && newBank) {
        const { error: auditErr } = await adminClient.from('audit_logs').insert({
            actor_id: user.id,
            action: 'update_bank_details',
            entity_type: 'promoter',
            entity_id: promoterId,
            metadata: {
                by: 'promoter',
                before: { name: current.bank_account_name, account: maskAccountNumber(current.bank_account_number) },
                after: { name: newBank.name, account: maskAccountNumber(newBank.accountNumber) },
            },
        })
        if (auditErr) console.error('Promoter bank details audit log failed:', auditErr.message)

        // Tell the promoter, so a change they did not make is noticed — only when there are details to show.
        if (newBank.name && newBank.sortCode && newBank.accountNumber) {
            const { data: profile } = await adminClient.from('profiles').select('email, full_name').eq('id', user.id).maybeSingle()
            if (profile?.email) {
                await sendBankDetailsChangedEmail({
                    to: profile.email,
                    fullName: profile.full_name || current.display_name,
                    orgName: current.display_name,
                    accountName: newBank.name,
                    sortCode: newBank.sortCode,
                    accountNumber: newBank.accountNumber,
                    changedBy: 'you',
                })
            }
        }

        await notifyAdmins({
            type: 'bank_details_changed',
            title: 'Promoter changed bank details',
            body: `${current.display_name} changed their payout bank details${newBank.accountNumber ? ` (now ending ${newBank.accountNumber.slice(-4)})` : ' (cleared)'}. Bank-transfer payouts are held for 7 days.`,
            link: '/admin/promoters',
        })
    }

    return NextResponse.json({ success: true })
}
