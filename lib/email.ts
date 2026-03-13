import { Resend } from 'resend'

function getResend() {
    return new Resend(process.env.RESEND_API_KEY || 'placeholder')
}

interface BookingEmailData {
    to: string
    bookingRef: string
    eventName: string
    eventDate: string
    eventTime: string
    venueName: string
    venueAddress: string
    ticketSummary: { name: string; quantity: number; subtotalPence: number }[]
    bookingFeePence: number
    discountPence: number
    totalPence: number
}

export async function sendBookingConfirmationEmail(data: BookingEmailData) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hexlura.com'

    const ticketRows = data.ticketSummary
        .map(
            (t) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;">${t.name} × ${t.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;text-align:right;">£${(t.subtotalPence / 100).toFixed(2)}</td>
      </tr>`
        )
        .join('')

    const discountRow =
        data.discountPence > 0
            ? `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#22c55e;">Promo discount</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;text-align:right;color:#22c55e;">-£${(data.discountPence / 100).toFixed(2)}</td>
      </tr>`
            : ''

    const html = `
    <div style="background:#f5f5f5;padding:32px 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      <div style="max-width:560px;margin:0 auto;">
        <div style="background:#E63950;padding:20px;text-align:center;border-radius:12px 12px 0 0;">
          <span style="font-size:28px;font-weight:bold;color:#fff;letter-spacing:4px;">HEXLURA</span>
        </div>
        <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;">
          <h1 style="font-size:24px;margin:0 0 8px;color:#111;">Booking Confirmed!</h1>
          <p style="font-size:16px;color:#555;margin:0 0 24px;">Your tickets are ready.</p>

          <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="margin:0 0 4px;font-size:18px;font-weight:bold;color:#111;">${data.eventName}</p>
            <p style="margin:0;font-size:14px;color:#666;">${data.eventDate} · ${data.eventTime}</p>
            <p style="margin:4px 0 0;font-size:14px;color:#666;">${data.venueName}, ${data.venueAddress}</p>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <thead>
              <tr>
                <th style="padding:8px 12px;border-bottom:2px solid #ddd;text-align:left;font-size:12px;text-transform:uppercase;color:#888;">Item</th>
                <th style="padding:8px 12px;border-bottom:2px solid #ddd;text-align:right;font-size:12px;text-transform:uppercase;color:#888;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${ticketRows}
              ${discountRow}
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#888;">Hexlura booking fee</td>
                <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;text-align:right;color:#888;">£${(data.bookingFeePence / 100).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding:12px;font-size:16px;font-weight:bold;">Total paid</td>
                <td style="padding:12px;font-size:16px;font-weight:bold;text-align:right;">£${(data.totalPence / 100).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div style="text-align:center;margin:24px 0;">
            <p style="font-size:12px;color:#888;margin:0 0 8px;">BOOKING REF</p>
            <p style="font-size:28px;font-weight:bold;color:#E63950;font-family:'Courier New',monospace;margin:0;">${data.bookingRef}</p>
          </div>

          <div style="text-align:center;margin:24px 0;">
            <a href="${appUrl}/bookings/${data.bookingRef}" style="display:inline-block;background:#E63950;color:#fff;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;">View & Download Ticket</a>
          </div>
        </div>
        <p style="text-align:center;font-size:12px;color:#999;margin:16px 0 0;">
          hexlura.com · support@hexlura.com<br/>
          You received this because you made a booking on Hexlura.
        </p>
      </div>
    </div>`

    try {
        await getResend().emails.send({
            from: 'Hexlura Tickets <tickets@hexlura.com>',
            replyTo: 'support@hexlura.com',
            to: data.to,
            subject: `Your tickets for ${data.eventName} are confirmed — ${data.bookingRef}`,
            html,
        })
    } catch (err) {
        console.error('Failed to send confirmation email:', err)
    }
}
