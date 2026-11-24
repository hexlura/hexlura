import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { maskAccountNumber } from '@/lib/bank-details'
import { bankHold, parseHoldOverrideReason, recordHoldOverride } from '@/lib/bank-change-guard'

// While an organiser's bank details are inside the 7-day hold they are withheld from the payouts screen.
// An admin can reveal them early only by giving a reason; that is audit-logged and alerts every admin.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => ({})) as { reason?: unknown }

    const { data: payout, error } = await adminClient
        .from('payouts')
        .select('id, organiser_id, organiser_profiles(org_name, bank_account_name, bank_sort_code, bank_account_number, bank_details_changed_at)')
        .eq('id', params.id)
        .maybeSingle()
    if (error) return NextResponse.json({ error: 'Could not load the payout' }, { status: 500 })
    if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })

    const org = payout.organiser_profiles as unknown as {
        org_name: string
        bank_account_name: string | null
        bank_sort_code: string | null
        bank_account_number: string | null
        bank_details_changed_at: string | null
    } | null
    if (!org) return NextResponse.json({ error: 'Organiser not found' }, { status: 404 })

    const hold = bankHold(org.bank_details_changed_at)
    if (hold.held) {
        const reason = parseHoldOverrideReason(body.reason)
        if (!reason) return NextResponse.json({ error: 'Enter a reason (10–300 characters) to view details that are on hold.' }, { status: 400 })
        await recordHoldOverride({
            actorId: user.id,
            actorEmail: user.email,
            entityType: 'organiser',
            entityId: payout.organiser_id,
            label: org.org_name,
            reason,
            hold,
            accountMasked: maskAccountNumber(org.bank_account_number),
            via: 'reveal',
        })
    }

    return NextResponse.json({
        name: org.bank_account_name,
        sortCode: org.bank_sort_code,
        accountNumber: org.bank_account_number,
    })
}
