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

    // Use the user client only for auth — all DB queries use adminClient to bypass RLS
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Extended event select — banner images, organiser join
    const eventSelect = 'title, start_at, end_at, venue_name, venue_address, category, organiser_id, banner_images, banner_url, image_url, organiser:organiser_profiles(org_name)'

    // Fetch booking without RLS restriction — auth is enforced below in code
    const { data: bookingRaw } = await adminClient
        .from('bookings')
        .select(`*, event:events(${eventSelect}), items:booking_items(*, ticket_type:ticket_types(name, is_group, group_size))`)
        .eq('booking_ref', ref)
        .single()

    let booking: typeof bookingRaw = null

    if (bookingRaw) {
        // Check 1: buyer
        if ((bookingRaw as { user_id?: string | null }).user_id === user.id) {
            booking = bookingRaw
        } else {
            // Check 2: organiser owns the event
            const { data: organiser } = await adminClient
                .from('organiser_profiles')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (organiser && (bookingRaw.event as { organiser_id?: string } | null)?.organiser_id === organiser.id) {
                booking = bookingRaw
            }
        }
    }

    if (!booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const buyerUserId = (booking as { user_id?: string | null }).user_id || ''
    const { data: buyerProfile } = await adminClient
        .from('profiles')
        .select('full_name')
        .eq('id', buyerUserId)
        .single()
    const holderName = (buyerProfile as { full_name?: string } | null)?.full_name || 'Ticket Holder'

    // PART 2 — Organiser name
    type OrgProfile = { org_name?: string | null } | null
    const orgProfile = (booking.event as { organiser?: OrgProfile } | null)?.organiser as OrgProfile
    const organiserName = orgProfile?.org_name || ''

    // PART 3 — Banner image (priority: banner_images[0] > banner_url > image_url > null)
    type EventRow = {
        title?: string
        start_at?: string
        end_at?: string | null
        venue_name?: string | null
        venue_address?: string | null
        category?: string | null
        banner_images?: string[] | null
        banner_url?: string | null
        image_url?: string | null
    }
    const ev = booking.event as EventRow | null
    const bannerImages = ev?.banner_images
    const bannerUrl: string | null =
        (Array.isArray(bannerImages) && bannerImages.length > 0 ? bannerImages[0] : null) ||
        ev?.banner_url ||
        ev?.image_url ||
        null

    const eventDate = ev?.start_at
        ? new Intl.DateTimeFormat('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }).format(new Date(ev.start_at))
        : 'TBC'

    const eventStartTime = ev?.start_at
        ? new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
        }).format(new Date(ev.start_at))
        : 'TBC'

    const eventEndTime = ev?.end_at
        ? new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
        }).format(new Date(ev.end_at))
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
    interface TicketDescriptor {
        token: string
        ticketName: string
        isGroup: boolean
    }
    const descriptors: TicketDescriptor[] = []

    for (const item of allItems) {
        const isGroup = item.ticket_type?.is_group === true
        const ticketName = item.ticket_type?.name ?? 'Ticket'

        if (isGroup) {
            descriptors.push({
                token: item.qr_code || booking.booking_ref,
                ticketName,
                isGroup: true,
            })
        } else {
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

    const isCancelled = booking.status === 'refunded' || booking.status === 'cancelled'

    // --- PART 4 — Portrait HTML template ---
    const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    margin: 0; padding: 0;
    background: #FFFFFF;
    font-family: system-ui, -apple-system, sans-serif;
  }
  @page { size: 400px auto; margin: 0; }
  @media print {
    .ticket-wrapper { page-break-after: always; break-after: page; }
    .ticket-wrapper:last-child { page-break-after: auto; break-after: auto; }
  }`

    const sections: string[] = []

    for (let i = 0; i < toRender.length; i++) {
        const { descriptor, globalIndex } = toRender[i]
        const isLast = i === toRender.length - 1
        const isFirst = i === 0

        const qrDataUrl = await QRCode.toDataURL(descriptor.token, { width: 180, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } })

        const eventTitle = esc(ev?.title || 'Event')
        const venueName = esc(ev?.venue_name || 'TBC')
        const venueAddress = esc(ev?.venue_address || '')
        const ticketTypeName = esc(descriptor.ticketName)
        const holder = esc(holderName)
        const bookingRef = esc(booking.booking_ref)
        const tokenDisplay = descriptor.token.length > 20 ? esc(descriptor.token.slice(0, 20)) + '...' : esc(descriptor.token)
        const organiserDisplay = organiserName ? `ORGANISED BY ${esc(organiserName)}` : ''
        const xOfY = `${globalIndex} OF ${total}`
        const validBadge = isCancelled
            ? `<span style="background:#E63950;color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;">✕ CANCELLED</span>`
            : `<span style="background:#00E5A0;color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;">✓ VALID</span>`

        const bannerSection = bannerUrl
            ? `<div style="width:100%;height:220px;overflow:hidden;margin:0;padding:0;background:#E63950;">
    <img src="${esc(bannerUrl)}" width="100%" style="width:100%;height:220px;object-fit:cover;object-position:center top;display:block;" alt="Event Banner" onerror="this.style.display='none'">
  </div>`
            : `<div style="width:100%;height:220px;background:#E63950;"></div>`

        sections.push(`<div class="ticket-wrapper" style="
  position: relative;
  display: block;
  width: 400px;
  background: #FFFFFF;
  ${isFirst ? '' : 'border-top: 3px solid #E63950;'}
  page-break-after: ${isLast ? 'auto' : 'always'};
  break-after: ${isLast ? 'auto' : 'page'};
">

  ${bannerSection}

  <!-- SECTION 2: HEADER BAR -->
  <div style="background:#FFFFFF;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #E63950;">
    <span style="font-size:16px;font-weight:700;color:#E63950;letter-spacing:2px;">HEXLURA</span>
    ${validBadge}
  </div>

  <!-- SECTION 3: EVENT DETAILS -->
  <div style="background:#FFFFFF;padding:16px;border-bottom:1px solid #EEEEEE;">
    <div style="font-size:22px;font-weight:900;color:#0A0A0F;margin-bottom:4px;line-height:1.2;">${eventTitle}</div>
    ${organiserDisplay ? `<div style="font-size:11px;color:#8888AA;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">${organiserDisplay}</div>` : '<div style="margin-bottom:12px;"></div>'}
    <div style="font-size:13px;color:#0A0A0F;margin-bottom:6px;">📅 ${esc(eventDate)}</div>
    <div style="font-size:13px;color:#0A0A0F;margin-bottom:6px;">🕐 ${esc(timeDisplay)}</div>
    <div style="font-size:13px;font-weight:700;color:#0A0A0F;margin-bottom:2px;">📍 ${venueName}</div>
    ${venueAddress ? `<div style="font-size:12px;color:#8888AA;padding-left:22px;">${venueAddress}</div>` : ''}
  </div>

  <!-- SECTION 4: TICKET INFO -->
  <div style="background:#F8F8FC;padding:16px;border-bottom:1px solid #EEEEEE;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="font-size:10px;color:#8888AA;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Ticket Type</div>
        <div style="font-size:14px;font-weight:700;color:#0A0A0F;">${ticketTypeName}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;color:#8888AA;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Ticket</div>
        <div style="font-size:14px;font-weight:700;color:#E63950;">${xOfY}</div>
      </div>
    </div>
    <div style="margin-top:12px;">
      <div style="font-size:10px;color:#8888AA;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Ticket Holder</div>
      <div style="font-size:14px;font-weight:700;color:#0A0A0F;">${holder}</div>
    </div>
  </div>

  <!-- SECTION 5: BOOKING REF -->
  <div style="background:#FFFFFF;padding:12px 16px;border-bottom:1px solid #EEEEEE;">
    <div style="font-size:10px;color:#8888AA;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Booking Ref</div>
    <div style="font-size:15px;font-weight:700;color:#E63950;font-family:monospace;">${bookingRef}</div>
  </div>

  <!-- SECTION 6: QR CODE -->
  <div style="background:#0A0A0F;padding:32px 16px;text-align:center;">
    <img src="${qrDataUrl}" width="180" height="180" style="display:block;margin:0 auto;background:#FFFFFF;padding:12px;border-radius:8px;" alt="QR Code">
    <div style="font-size:11px;color:#8888AA;text-align:center;font-family:monospace;margin-top:12px;">${tokenDisplay}</div>
    <div style="font-size:11px;color:#666688;text-align:center;margin-top:6px;">Scan at entry · One scan per ticket</div>
  </div>

  <!-- SECTION 7: FOOTER -->
  <div style="background:#0A0A0F;border-top:1px solid #2A2A3A;padding:12px 16px;text-align:center;">
    <span style="font-size:11px;color:#8888AA;">Powered by Hexlura · hexlura.com</span>
  </div>

</div>`)
    }

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hexlura Ticket - ${esc(booking.booking_ref)}</title>
<style>${css}</style>
</head>
<body>
${sections.join('\n')}
</body>
</html>`

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `inline; filename="hexlura-${booking.booking_ref}.html"`,
        },
    })
}
