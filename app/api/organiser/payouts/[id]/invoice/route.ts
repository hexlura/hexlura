import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveOrganiserId } from '@/lib/organiser-access'

function pence(amount: number) {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount / 100)
}

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) return NextResponse.json({ error: 'Not an organiser' }, { status: 403 })

    const serviceClient = createServiceClient()

    const { data: payout, error } = await serviceClient
        .from('payouts')
        .select('id, net_pence, status, requested_at, paid_at, reference, created_at, organiser_id, event:events(title, start_at, venue_name, venue_address)')
        .eq('id', params.id)
        .single()

    if (error || !payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
    if (payout.organiser_id !== organiserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: organiser } = await serviceClient
        .from('organiser_profiles')
        .select('display_name, business_name, contact_email')
        .eq('id', organiserId)
        .single()

    const event = payout.event as { title?: string; start_at?: string; venue_name?: string; venue_address?: string } | null

    const invoiceDate = new Date(payout.paid_at || payout.requested_at || payout.created_at)
        .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    const eventDate = event?.start_at
        ? new Date(event.start_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : '—'

    const invoiceNumber = `HXL-INV-${payout.id.split('-')[0].toUpperCase()}`
    const netAmount = pence(payout.net_pence || 0)

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', Arial, sans-serif; color: #0A0A0F; background: #fff; padding: 48px; font-size: 14px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
    .brand { font-size: 32px; font-weight: 900; letter-spacing: 2px; color: #0A0A0F; }
    .brand span { color: #E63950; }
    .invoice-meta { text-align: right; }
    .invoice-meta h2 { font-size: 28px; font-weight: 700; letter-spacing: 1px; color: #0A0A0F; margin-bottom: 4px; }
    .invoice-meta p { font-size: 13px; color: #666; }
    .divider { border: none; border-top: 2px solid #0A0A0F; margin: 32px 0; }
    .section { margin-bottom: 32px; }
    .section h3 { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #888; margin-bottom: 8px; }
    .section p { font-size: 14px; color: #0A0A0F; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    thead th { background: #0A0A0F; color: #fff; padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; }
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0F0F0; font-size: 14px; }
    .amount { text-align: right; font-weight: 600; }
    .total-row { background: #F8F8F8; }
    .total-row td { font-weight: 700; font-size: 16px; border-bottom: none; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status-paid { background: #e6f7ec; color: #1a7a44; }
    .status-pending { background: #fff8e1; color: #b7860a; }
    .status-requested { background: #e3f0ff; color: #1a5fa8; }
    .footer { margin-top: 64px; border-top: 1px solid #E0E0E0; padding-top: 24px; font-size: 12px; color: #888; text-align: center; }
    @media print {
      body { padding: 32px; }
      @page { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">HEX<span>LURA</span></div>
    <div class="invoice-meta">
      <h2>INVOICE</h2>
      <p>${invoiceNumber}</p>
      <p>${invoiceDate}</p>
    </div>
  </div>

  <hr class="divider" />

  <div class="two-col section">
    <div>
      <h3>From</h3>
      <p><strong>Hexlura Ltd</strong></p>
      <p>hello@hexlura.com</p>
      <p>hexlura.com</p>
    </div>
    <div>
      <h3>To</h3>
      <p><strong>${organiser?.business_name || organiser?.display_name || '—'}</strong></p>
      ${organiser?.contact_email ? `<p>${organiser.contact_email}</p>` : ''}
    </div>
  </div>

  <div class="section">
    <h3>Event</h3>
    <p><strong>${event?.title || '—'}</strong></p>
    <p>${eventDate}${event?.venue_name ? ' · ' + event.venue_name : ''}</p>
    ${event?.venue_address ? `<p>${event.venue_address}</p>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Reference</th>
        <th>Status</th>
        <th class="amount">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Ticket sales net payout</td>
        <td>${payout.reference || invoiceNumber}</td>
        <td>
          <span class="status-badge status-${payout.status}">${payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}</span>
        </td>
        <td class="amount">${netAmount}</td>
      </tr>
      <tr class="total-row">
        <td colspan="3"><strong>Total Payable</strong></td>
        <td class="amount">${netAmount}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>This invoice is generated automatically by Hexlura. Questions? Contact hello@hexlura.com</p>
    <p style="margin-top:4px">Invoice ${invoiceNumber} · Generated ${new Date().toLocaleDateString('en-GB')}</p>
  </div>

  <script>window.onload = () => window.print()</script>
</body>
</html>`

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': `inline; filename="${invoiceNumber}.pdf"`,
        },
    })
}
