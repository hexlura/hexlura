import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import QRCode from 'qrcode'

export async function GET(
    request: Request,
    { params }: { params: { ref: string } }
) {
    const ref = params.ref
    const { searchParams } = new URL(request.url)
    const indexParam = searchParams.get('index')
    const requestedIndex = indexParam ? parseInt(indexParam, 10) : null

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

    // Build one descriptor per individual person/ticket
    interface TicketDescriptor {
        token: string
        ticketName: string
        isGroup: boolean
    }
    const descriptors: TicketDescriptor[] = []
    let groupCounter = 0
    let ticketCounter = 0

    for (const item of allItems) {
        const isGroup = item.ticket_type?.is_group === true
        const groupSize = item.ticket_type?.group_size ?? 1
        const qty = item.quantity
        const ticketName = item.ticket_type?.name ?? 'Ticket'

        if (isGroup) {
            for (let i = 0; i < groupSize; i++) {
                groupCounter++
                descriptors.push({ token: `${booking.booking_ref}-G${groupCounter}`, ticketName, isGroup: true })
            }
        } else if (qty > 1) {
            for (let i = 0; i < qty; i++) {
                ticketCounter++
                descriptors.push({ token: `${booking.booking_ref}-T${ticketCounter}`, ticketName, isGroup: false })
            }
        } else {
            descriptors.push({ token: booking.booking_ref, ticketName, isGroup: false })
        }
    }

    const total = descriptors.length

    if (requestedIndex !== null && (requestedIndex < 1 || requestedIndex > total)) {
        return NextResponse.json({ error: 'Ticket index out of range' }, { status: 404 })
    }

    const toRender: { descriptor: TicketDescriptor; globalIndex: number }[] =
        requestedIndex !== null
            ? [{ descriptor: descriptors[requestedIndex - 1], globalIndex: requestedIndex }]
            : descriptors.map((d, i) => ({ descriptor: d, globalIndex: i + 1 }))

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
  .ref-section { text-align: center; margin: 32px 0; }
  .ref-label { font-size: 11px; color: #8888AA; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
  .ref { font-size: 36px; font-weight: bold; color: #E63950; font-family: 'Courier New', monospace; }
  .qr { text-align: center; margin: 24px 0; }
  .qr img { border-radius: 8px; }
  .footer { text-align: center; color: #8888AA; font-size: 11px; padding: 16px; }
  .ticket-label { text-align: center; font-size: 13px; color: #8888AA; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
  .page-break { page-break-after: always; border-top: 2px dashed #2A2A3A; margin: 40px 0; }`

    const sections: string[] = []

    for (let i = 0; i < toRender.length; i++) {
        const { descriptor, globalIndex } = toRender[i]
        const label =
            total === 1
                ? 'Your Ticket'
                : descriptor.isGroup
                    ? `Ticket ${globalIndex} of ${total} (Group)`
                    : `Ticket ${globalIndex} of ${total}`
        const qrDataUrl = await QRCode.toDataURL(descriptor.token, { width: 200, margin: 1 })
        const isLast = i === toRender.length - 1

        sections.push(`
  <div class="content">
    <div class="event-name">${booking.event?.title || 'Event'}</div>
    <div class="info">Date: <span>${eventDate}</span></div>
    <div class="info">Time: <span>${eventTime}</span></div>
    <div class="info">Venue: <span>${booking.event?.venue_name || 'TBC'}, ${booking.event?.venue_address || ''}</span></div>
    <div class="divider"></div>
    <div class="ticket-label">${descriptor.ticketName}</div>
    <div class="ref-section">
      <div class="ref-label">${label}</div>
      <div class="ref">${descriptor.token}</div>
    </div>
    <div class="qr"><img src="${qrDataUrl}" width="200" height="200" alt="QR Code"/></div>
  </div>
  ${isLast ? '' : '<div class="page-break"></div>'}`)
    }

    const html = `<!DOCTYPE html>
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

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `inline; filename="hexlura-${booking.booking_ref}.html"`,
        },
    })
}
