import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import QRCode from 'qrcode'

function esc(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

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

    let { data: booking } = await supabase
        .from('bookings')
        .select('*, event:events(title, start_at, end_at, venue_name, venue_address, category), items:booking_items(*, ticket_type:ticket_types(name, is_group, group_size))')
        .eq('booking_ref', ref)
        .eq('user_id', user.id)
        .single()

    // Secondary check: allow organisers to download tickets for their own events
    if (!booking) {
        const adminClient = createAdminClient()
        const { data: organiser } = await adminClient
            .from('organiser_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (organiser) {
            const { data: orgBooking } = await adminClient
                .from('bookings')
                .select('*, event:events(title, start_at, end_at, venue_name, venue_address, category, organiser_id), items:booking_items(*, ticket_type:ticket_types(name, is_group, group_size))')
                .eq('booking_ref', ref)
                .single()

            if (orgBooking && (orgBooking.event as { organiser_id?: string } | null)?.organiser_id === organiser.id) {
                booking = orgBooking
            }
        }
    }

    if (!booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Get buyer name — use booking.user_id (not user.id) so organisers see the correct holder
    const profileAdminClient = createAdminClient()
    const { data: profile } = await profileAdminClient
        .from('profiles')
        .select('full_name')
        .eq('id', booking.user_id)
        .single()
    const holderName = (profile as { full_name?: string } | null)?.full_name || user.email || 'Ticket Holder'

    const eventDate = booking.event
        ? new Intl.DateTimeFormat('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }).format(new Date(booking.event.start_at))
        : 'TBC'

    const eventStartTime = booking.event
        ? new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
        }).format(new Date(booking.event.start_at))
        : 'TBC'

    const eventEndTime = booking.event?.end_at
        ? new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
        }).format(new Date(booking.event.end_at))
        : null

    const timeDisplay = eventEndTime
        ? `${eventStartTime} - ${eventEndTime} (UK Time)`
        : `${eventStartTime} (UK Time)`

    type BookingItem = {
        id: string
        qr_code: string | null
        quantity: number
        unit_price_pence: number
        ticket_type?: { name: string; is_group?: boolean; group_size?: number } | null
    }

    const allItems: BookingItem[] = booking.items || []

    // Build one descriptor per physical ticket.
    // After the migration, each booking_item row has quantity=1 and its own unique qr_code.
    // We use the row's actual qr_code as the QR token — this is what the scanner validates.
    // Group tickets still use the existing ref-G{n} token scheme (already stored per-row).
    interface TicketDescriptor {
        token: string        // qr_code value — used as QR data and shown on ticket
        ticketName: string
        isGroup: boolean
    }
    const descriptors: TicketDescriptor[] = []

    for (const item of allItems) {
        const isGroup = item.ticket_type?.is_group === true
        const ticketName = item.ticket_type?.name ?? 'Ticket'

        if (isGroup) {
            // Group tickets already had one-row-per-member inserted by webhook
            descriptors.push({
                token: item.qr_code || booking.booking_ref,
                ticketName,
                isGroup: true,
            })
        } else {
            // Standard tickets: each row is one physical ticket with its own qr_code
            // quantity should already be 1 after migration, but loop defensively
            const qty = item.quantity || 1
            for (let t = 0; t < qty; t++) {
                descriptors.push({
                    token: item.qr_code || booking.booking_ref,
                    ticketName,
                    isGroup: false,
                })
            }
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

    // --- HTML generation ---
    const css = `
  @page { size: 375px 667px; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 375px;
    background: #FFFFFF;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }
  .bg-pattern {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-image: radial-gradient(circle, #E0E0E0 1px, transparent 1px);
    background-size: 20px 20px;
    opacity: 0.4;
    z-index: 0;
  }
  .content { position: relative; z-index: 1; }
  .top-bar { height: 6px; background: #E63950; width: 100%; }
  .header {
    padding: 16px 24px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #F0F0F0;
  }
  .logo { font-size: 22px; font-weight: 900; color: #E63950; letter-spacing: 4px; }
  .ticket-label { font-size: 10px; color: #8888AA; letter-spacing: 2px; text-transform: uppercase; text-align: right; }
  .event-section {
    padding: 20px 24px 16px;
    background: #FAFAFA;
    border-bottom: 1px solid #EEEEEE;
  }
  .event-category { font-size: 10px; color: #E63950; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
  .event-name { font-size: 26px; font-weight: 900; color: #0A0A0F; line-height: 1.1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }
  .event-detail { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
  .event-detail-icon { font-size: 13px; width: 16px; flex-shrink: 0; margin-top: 1px; }
  .event-detail-text { font-size: 13px; color: #333333; line-height: 1.4; }
  .event-detail-label { font-size: 10px; color: #8888AA; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
  .qr-section { padding: 20px 24px; text-align: center; background: #FFFFFF; }
  .qr-wrapper { display: inline-block; padding: 12px; border: 2px solid #F0F0F0; background: #FFFFFF; margin-bottom: 10px; }
  .qr-wrapper img { display: block; }
  .qr-ref { font-size: 13px; font-family: 'Courier New', monospace; color: #0A0A0F; font-weight: 700; letter-spacing: 2px; margin-bottom: 4px; }
  .qr-hint { font-size: 10px; color: #8888AA; letter-spacing: 0.5px; }
  .tear-line { position: relative; margin: 0 -2px; display: flex; align-items: center; }
  .tear-circle-left { width: 20px; height: 20px; background: #FFFFFF; border-radius: 50%; flex-shrink: 0; border: 1px solid #E0E0E0; margin-left: -10px; }
  .tear-circle-right { width: 20px; height: 20px; background: #FFFFFF; border-radius: 50%; flex-shrink: 0; border: 1px solid #E0E0E0; margin-right: -10px; }
  .tear-dashes { flex: 1; border-top: 2px dashed #E0E0E0; margin: 0 4px; }
  .stub { padding: 14px 24px 16px; background: #FAFAFA; }
  .stub-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .stub-label { font-size: 10px; color: #8888AA; text-transform: uppercase; letter-spacing: 1px; }
  .stub-value { font-size: 13px; color: #0A0A0F; font-weight: 700; }
  .valid-badge { display: inline-block; background: #E8FFF5; color: #00A86B; font-size: 10px; font-weight: 700; padding: 3px 10px; letter-spacing: 1px; text-transform: uppercase; border: 1px solid #00C48A; }
  .cancelled-badge { display: inline-block; background: #FFF0F0; color: #E63950; font-size: 10px; font-weight: 700; padding: 3px 10px; letter-spacing: 1px; text-transform: uppercase; border: 1px solid #E63950; }
  .cancelled-watermark { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 10; }
  .cancelled-watermark-text { font-size: 72px; font-weight: 900; color: #E63950; opacity: 0.18; letter-spacing: 8px; text-transform: uppercase; transform: rotate(-35deg); white-space: nowrap; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
  .footer { padding: 10px 24px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #F0F0F0; }
  .footer-text { font-size: 9px; color: #C0C0C8; letter-spacing: 1px; text-transform: uppercase; }
  .footer-logo { font-size: 11px; font-weight: 900; color: #E63950; letter-spacing: 3px; }
  .page-break { page-break-after: always; }`

    const isCancelled = booking.status === 'refunded' || booking.status === 'cancelled'

    const sections: string[] = []

    for (let i = 0; i < toRender.length; i++) {
        const { descriptor, globalIndex } = toRender[i]
        const isLast = i === toRender.length - 1

        const ticketLabelLine = total > 1
            ? `<br>Ticket ${globalIndex} of ${total}${descriptor.isGroup ? ' (Group)' : ''}`
            : ''

        const qrDataUrl = await QRCode.toDataURL(descriptor.token, { width: 180, margin: 1 })

        const eventTitle = esc(booking.event?.title || 'Event')
        const category = esc((booking.event as { category?: string } | null)?.category || '')
        const venueName = esc(booking.event?.venue_name || 'TBC')
        const venueAddress = esc(booking.event?.venue_address || '')
        const ticketTypeName = esc(descriptor.ticketName)
        const holder = esc(holderName)
        const bookingRef = esc(booking.booking_ref)
        const token = esc(descriptor.token)

        sections.push(`<div style="position: relative; display: block; width: 375px; min-height: 667px; background: #FFFFFF; overflow: hidden; page-break-after: ${isLast ? 'auto' : 'always'}; break-after: ${isLast ? 'auto' : 'page'}">
  <div class="bg-pattern"></div>
  ${isCancelled ? '<div class="cancelled-watermark"><div class="cancelled-watermark-text">CANCELLED</div></div>' : ''}
  <div class="content">

    <div class="top-bar"></div>

    <div class="header">
      <div class="logo">HEXLURA</div>
      <div class="ticket-label">E-TICKET${ticketLabelLine}</div>
    </div>

    <div class="event-section">
      ${category ? `<div class="event-category">${category}</div>` : ''}
      <div class="event-name">${eventTitle}</div>

      <div class="event-detail">
        <span class="event-detail-icon">📅</span>
        <div>
          <div class="event-detail-label">Date</div>
          <div class="event-detail-text">${esc(eventDate)}</div>
        </div>
      </div>

      <div class="event-detail">
        <span class="event-detail-icon">🕐</span>
        <div>
          <div class="event-detail-label">Time</div>
          <div class="event-detail-text">${esc(timeDisplay)}</div>
        </div>
      </div>

      <div class="event-detail">
        <span class="event-detail-icon">📍</span>
        <div>
          <div class="event-detail-label">Venue</div>
          <div class="event-detail-text">${venueName}<br>${venueAddress}</div>
        </div>
      </div>
    </div>

    <div class="qr-section">
      <div class="qr-wrapper">
        <img src="${qrDataUrl}" width="180" height="180" alt="QR Code">
      </div>
      <div class="qr-ref">${token}</div>
      <div class="qr-hint">Scan at entry · One scan per ticket</div>
    </div>

    <div class="tear-line">
      <div class="tear-circle-left"></div>
      <div class="tear-dashes"></div>
      <div class="tear-circle-right"></div>
    </div>

    <div class="stub">
      <div class="stub-row">
        <div>
          <div class="stub-label">Ticket Type</div>
          <div class="stub-value">${ticketTypeName}</div>
        </div>
        ${isCancelled ? '<div class="cancelled-badge">&#10007; Cancelled</div>' : '<div class="valid-badge">&#10003; Valid</div>'}
      </div>
      <div class="stub-row">
        <div>
          <div class="stub-label">Ticket Holder</div>
          <div class="stub-value">${holder}</div>
        </div>
      </div>
      <div class="stub-row">
        <div>
          <div class="stub-label">Booking Ref</div>
          <div class="stub-value" style="font-family: monospace; color: #E63950;">${bookingRef}</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-text">Valid for 1 person · Non-transferable</div>
      <div class="footer-logo">HEXLURA</div>
    </div>

  </div>
</div>`)
    }

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hexlura Ticket - ${esc(booking.booking_ref)}</title>
<style>${css}
</style>
</head>
<body>
${sections.join('\n<div style="height:24px;background:#F0F0F0;"></div>\n')}
</body>
</html>`

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `inline; filename="hexlura-${booking.booking_ref}.html"`,
        },
    })
}
