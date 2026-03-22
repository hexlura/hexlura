import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import QRCode from 'qrcode'

export async function GET(
    _request: Request,
    { params }: { params: { ref: string } }
) {
    const ref = params.ref
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: booking } = await supabase
        .from('bookings')
        .select('*, event:events(title, start_at, end_at, venue_name, venue_address), items:booking_items(*, ticket_type:ticket_types(name, is_group, group_size))')
        .eq('booking_ref', ref)
        .eq('user_id', user.id)
        .single()

    if (!booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const eventDate = booking.event
        ? new Intl.DateTimeFormat('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }).format(new Date(booking.event.start_at))
        : 'TBC'

    const eventTime = booking.event
        ? new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
        }).format(new Date(booking.event.start_at))
        : 'TBC'

    type BookingItem = {
        qr_code: string | null
        quantity: number
        unit_price_pence: number
        ticket_type?: { name: string; is_group?: boolean; group_size?: number } | null
    }
    const allItems: BookingItem[] = booking.items || []
    const hasGroupItems = allItems.some(item => item.ticket_type?.is_group)

    const sharedStyles = `
  @page { size: A4; margin: 0; }
  body { margin: 0; padding: 0; background: #0A0A0F; color: #F0F0F8; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
  .header { background: #E63950; padding: 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 32px; letter-spacing: 6px; color: white; }
  .content { padding: 40px; }
  .event-name { font-size: 28px; font-weight: bold; margin-bottom: 8px; }
  .info { color: #8888AA; font-size: 14px; margin-bottom: 4px; }
  .info span { color: #F0F0F8; }
  .divider { border-top: 2px dashed #2A2A3A; margin: 24px 0; }
  .tickets { font-size: 14px; white-space: pre-line; line-height: 1.8; }
  .ref-section { text-align: center; margin: 32px 0; }
  .ref-label { font-size: 11px; color: #8888AA; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
  .ref { font-size: 36px; font-weight: bold; color: #E63950; font-family: 'Courier New', monospace; }
  .qr { text-align: center; margin: 24px 0; }
  .qr img { border-radius: 8px; }
  .footer { text-align: center; color: #8888AA; font-size: 11px; padding: 16px; }
  .ticket-label { text-align: center; font-size: 13px; color: #8888AA; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
  .page-break { page-break-after: always; border-top: 2px dashed #2A2A3A; margin: 40px 0; }`

    let html: string

    if (hasGroupItems) {
        // One section per booking_item for group tickets
        const groupItems = allItems.filter(item => item.ticket_type?.is_group)
        const nonGroupItems = allItems.filter(item => !item.ticket_type?.is_group)
        const totalGroupMembers = groupItems.length

        const sections: string[] = []

        for (let idx = 0; idx < groupItems.length; idx++) {
            const item = groupItems[idx]
            const qrToken = item.qr_code || booking.booking_ref
            const qrDataUrl = await QRCode.toDataURL(qrToken, { width: 200, margin: 1 })
            const ticketName = item.ticket_type?.name || 'Group Ticket'
            const isLast = idx === groupItems.length - 1 && nonGroupItems.length === 0

            sections.push(`
  <div class="content">
    <div class="event-name">${booking.event?.title || 'Event'}</div>
    <div class="info">Date: <span>${eventDate}</span></div>
    <div class="info">Time: <span>${eventTime}</span></div>
    <div class="info">Venue: <span>${booking.event?.venue_name || 'TBC'}, ${booking.event?.venue_address || ''}</span></div>
    <div class="divider"></div>
    <div class="ticket-label">${ticketName}</div>
    <div class="ref-section">
      <div class="ref-label">Ticket ${idx + 1} of ${totalGroupMembers}</div>
      <div class="ref">${qrToken}</div>
    </div>
    <div class="qr"><img src="${qrDataUrl}" width="200" height="200" alt="QR Code"/></div>
  </div>
  ${isLast ? '' : '<div class="page-break"></div>'}`)
        }

        // Append non-group items as a combined section if any
        if (nonGroupItems.length > 0) {
            const firstNonGroup = nonGroupItems[0]
            const qrToken = firstNonGroup.qr_code || booking.booking_ref
            const qrDataUrl = await QRCode.toDataURL(qrToken, { width: 200, margin: 1 })
            const ticketLines = nonGroupItems
                .map(item => {
                    const name = item.ticket_type?.name || 'Ticket'
                    return `${name} × ${item.quantity} — £${((item.unit_price_pence * item.quantity) / 100).toFixed(2)}`
                })
                .join('\n')
            sections.push(`
  <div class="content">
    <div class="event-name">${booking.event?.title || 'Event'}</div>
    <div class="info">Date: <span>${eventDate}</span></div>
    <div class="info">Time: <span>${eventTime}</span></div>
    <div class="info">Venue: <span>${booking.event?.venue_name || 'TBC'}, ${booking.event?.venue_address || ''}</span></div>
    <div class="divider"></div>
    <div class="tickets">${ticketLines}</div>
    <div class="ref-section">
      <div class="ref-label">Booking Ref</div>
      <div class="ref">${booking.booking_ref}</div>
    </div>
    <div class="qr"><img src="${qrDataUrl}" width="200" height="200" alt="QR Code"/></div>
  </div>`)
        }

        html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Hexlura Ticket - ${booking.booking_ref}</title>
<style>${sharedStyles}
</style>
</head>
<body>
  <div class="header"><h1>HEXLURA</h1></div>
  ${sections.join('\n')}
  <div class="footer">Powered by Hexlura.com · Booked ${new Date(booking.created_at).toLocaleDateString('en-GB')}</div>
</body>
</html>`
    } else {
        // Standard single-QR layout
        const qrToken = allItems[0]?.qr_code || booking.booking_ref
        const qrDataUrl = await QRCode.toDataURL(qrToken, { width: 200, margin: 1 })

        const ticketLines = allItems
            .map(item => {
                const name = item.ticket_type?.name || 'Ticket'
                return `${name} × ${item.quantity} — £${((item.unit_price_pence * item.quantity) / 100).toFixed(2)}`
            })
            .join('\n')

        html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Hexlura Ticket - ${booking.booking_ref}</title>
<style>${sharedStyles}
</style>
</head>
<body>
  <div class="header"><h1>HEXLURA</h1></div>
  <div class="content">
    <div class="event-name">${booking.event?.title || 'Event'}</div>
    <div class="info">Date: <span>${eventDate}</span></div>
    <div class="info">Time: <span>${eventTime}</span></div>
    <div class="info">Venue: <span>${booking.event?.venue_name || 'TBC'}, ${booking.event?.venue_address || ''}</span></div>
    <div class="divider"></div>
    <div class="tickets">${ticketLines}</div>
    <div class="ref-section">
      <div class="ref-label">Booking Ref</div>
      <div class="ref">${booking.booking_ref}</div>
    </div>
    <div class="qr"><img src="${qrDataUrl}" width="200" height="200" alt="QR Code"/></div>
  </div>
  <div class="footer">Powered by Hexlura.com · Booked ${new Date(booking.created_at).toLocaleDateString('en-GB')}</div>
</body>
</html>`
    }

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `inline; filename="hexlura-${booking.booking_ref}.html"`,
        },
    })
}
