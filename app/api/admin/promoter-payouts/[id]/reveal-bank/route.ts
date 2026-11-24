import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { maskAccountNumber } from '@/lib/bank-details'
import { bankHold, parseHoldOverrideReason, recordHoldOverride } from '@/lib/bank-change-guard'

// Promoter twin of /api/admin/payouts/[id]/reveal-bank: details inside the 7-day hold are withheld
// from the payouts screen and can be revealed early only with an audited, alerted reason.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => ({})) as { reason?: unknown }

    const { data: payout, error } = await adminClient
        .from('promoter_payouts')
        .select('id, promoter_id, promoter_profiles(display_name, bank_account_name, bank_sort_code, bank_account_number, bank_details_changed_at)')
        .eq('id', params.id)
        .maybeSingle()
    if (error) return NextResponse.json({ error: 'Could not load the payout' }, { status: 500 })
    if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })

    const promoter = payout.promoter_profiles as unknown as {
        display_name: string
        bank_account_name: string | null
        bank_sort_code: string | null
        bank_account_number: string | null
        bank_details_changed_at: string | null
    } | null
    if (!promoter) return NextResponse.json({ error: 'Promoter not found' }, { status: 404 })

    const hold = bankHold(promoter.bank_details_changed_at)
    if (hold.held) {
        const reason = parseHoldOverrideReason(body.reason)
        if (!reason) return NextResponse.json({ error: 'Enter a reason (10–300 characters) to view details that are on hold.' }, { status: 400 })
        await recordHoldOverride({
            actorId: user.id,
            actorEmail: user.email,
            entityType: 'promoter',
            entityId: payout.promoter_id,
            label: promoter.display_name,
            reason,
            hold,
            accountMasked: maskAccountNumber(promoter.bank_account_number),
            via: 'reveal',
        })
    }

    return NextResponse.json({
        name: promoter.bank_account_name,
        sortCode: promoter.bank_sort_code,
        accountNumber: promoter.bank_account_number,
    })
}
