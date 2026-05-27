import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

function getResend() {
    return new Resend(process.env.RESEND_API_KEY || 'placeholder')
}

export async function POST() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const [
        { data: profile },
        { data: bookings },
        { data: reviews },
        { data: likes },
        { data: follows },
        { data: waitlist },
        { data: supportTickets },
        { data: notifications },
    ] = await Promise.all([
        adminClient.from('profiles').select('full_name, email, role, phone, created_at, updated_at').eq('id', user.id).single(),
        adminClient.from('bookings').select('booking_ref, status, total_pence, created_at, booking_items(ticket_type_name, quantity, attendee_name, attendee_email)').eq('user_id', user.id),
        adminClient.from('reviews').select('rating, comment, created_at, event:events(title)').eq('user_id', user.id),
        adminClient.from('likes').select('created_at, event:events(title)').eq('user_id', user.id),
        adminClient.from('follows').select('created_at, organiser:organiser_profiles(org_name)').eq('user_id', user.id),
        adminClient.from('waitlist').select('created_at, event:events(title)').eq('user_id', user.id),
        adminClient.from('support_tickets').select('subject, status, created_at, support_messages(body, is_staff, created_at)').eq('user_id', user.id),
        adminClient.from('notifications').select('type, title, body, is_read, created_at').eq('user_id', user.id),
    ])

    const exportData = {
        exported_at: new Date().toISOString(),
        account: {
            email: user.email,
            ...profile,
        },
        bookings: bookings || [],
        reviews: reviews || [],
        likes: likes || [],
        follows: follows || [],
        waitlist: waitlist || [],
        support_tickets: supportTickets || [],
        notifications: notifications || [],
    }

    const jsonStr = JSON.stringify(exportData, null, 2)
    const filename = `hexlura-data-export-${new Date().toISOString().split('T')[0]}.json`

    try {
        await getResend().emails.send({
            from: 'Hexlura <noreply@hexlura.com>',
            replyTo: 'support@hexlura.com',
            to: user.email,
            subject: 'Your Hexlura data export',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
                    <h2 style="color:#0A0A0F;margin:0 0 16px;">Your data export is ready</h2>
                    <p style="color:#333;margin:0 0 12px;">As requested, your personal data export from Hexlura is attached to this email as a JSON file.</p>
                    <p style="color:#333;margin:0 0 12px;">It contains all data we hold about your account: bookings, reviews, likes, follows, waitlist entries, support tickets, and notifications.</p>
                    <p style="color:#666;font-size:13px;margin:24px 0 0;">If you didn't request this, please contact <a href="mailto:support@hexlura.com" style="color:#E63950;">support@hexlura.com</a> immediately.</p>
                </div>
            `,
            attachments: [{
                filename,
                content: Buffer.from(jsonStr).toString('base64'),
            }],
        })
    } catch (err) {
        console.error('[data-export] email send failed:', err)
        return NextResponse.json({ error: 'Failed to send export email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
