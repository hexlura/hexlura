import { Resend } from 'resend'
import { render } from '@react-email/components'
import BookingConfirmation from '@/emails/booking-confirmation'
import UserWelcome from '@/emails/user-welcome'
import OrganiserWelcome from '@/emails/organiser-welcome'
import PromoterWelcome from '@/emails/promoter-welcome'
import PromoterInvite from '@/emails/promoter-invite'
import PayoutPaidOrganiser from '@/emails/payout-paid-organiser'
import PayoutPaidPromoter from '@/emails/payout-paid-promoter'
import OrganiserIdentityVerified from '@/emails/organiser-identity-verified'
import EventPublished from '@/emails/event-published'
import Announcement from '@/emails/announcement'
import EventCancelled from '@/emails/event-cancelled'
import EventReminder from '@/emails/event-reminder'
import WaitlistAvailable from '@/emails/waitlist-available'

function getResend() {
    return new Resend(process.env.RESEND_API_KEY || 'placeholder')
}

function getAppUrl() {
    return process.env.NEXT_PUBLIC_APP_URL || 'https://hexlura.com'
}

interface BookingEmailData {
    to: string
    bookingRef: string
    buyerName?: string
    eventName: string
    eventDate: string
    eventTime: string
    venueName: string
    venueAddress: string
    ticketSummary: { name: string; quantity: number; unitPricePence: number }[]
    bookingFeePence: number
    discountPence: number
    totalPence: number
}

// Delegates to the canonical <BookingConfirmation /> React Email template
// so checkout, complimentary tickets, the Stripe webhook fallback, and admin
// resends all produce the same design.
export async function sendBookingConfirmationEmail(data: BookingEmailData) {
    const appUrl = getAppUrl()

    const ticketItems = data.ticketSummary.map(t => ({
        name: t.name,
        quantity: t.quantity,
        price: `£${((t.unitPricePence * t.quantity) / 100).toFixed(2)}`,
    }))

    const totalPaid = `£${(data.totalPence / 100).toFixed(2)}`

    try {
        const html = await render(BookingConfirmation({
            buyerName: data.buyerName || 'Valued Customer',
            eventName: data.eventName,
            eventDate: data.eventDate,
            eventTime: data.eventTime,
            venueName: data.venueName || 'TBC',
            venueAddress: data.venueAddress || '',
            bookingRef: data.bookingRef,
            ticketItems,
            totalPaid,
            downloadUrl: `${appUrl}/api/tickets/${data.bookingRef}/pdf`,
        }))

        await getResend().emails.send({
            from: 'Hexlura <noreply@hexlura.com>',
            replyTo: 'support@hexlura.com',
            to: data.to,
            subject: `Your tickets for ${data.eventName} are confirmed! 🎉`,
            html,
        })
    } catch (err) {
        console.error('Failed to send confirmation email:', err)
    }
}

export async function sendUserWelcomeEmail(data: { to: string; fullName: string }): Promise<void> {
    try {
        const appUrl = getAppUrl()
        const html = await render(UserWelcome({ fullName: data.fullName, appUrl }))
        await getResend().emails.send({
            from: 'Hexlura <noreply@hexlura.com>',
            replyTo: 'support@hexlura.com',
            to: data.to,
            subject: 'Welcome to Hexlura 🎟️',
            html,
        })
    } catch (err) {
        console.error('Failed to send user welcome email:', err)
    }
}

export async function sendAdminPayoutRequestEmail(data: {
    orgName: string
    organiserEmail: string
    totalRequestedPence: number
    payoutCount: number
}): Promise<void> {
    try {
        const appUrl = getAppUrl()
        const amount = `£${(data.totalRequestedPence / 100).toFixed(2)}`
        const html = `
            <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
                <h2 style="margin:0 0 16px;color:#111;">New Payout Request</h2>
                <p style="margin:0 0 8px;"><strong>Organiser:</strong> ${data.orgName}</p>
                <p style="margin:0 0 8px;"><strong>Contact:</strong> ${data.organiserEmail}</p>
                <p style="margin:0 0 8px;"><strong>Amount requested:</strong> ${amount}</p>
                <p style="margin:0 0 16px;"><strong>Payouts in batch:</strong> ${data.payoutCount}</p>
                <p style="margin:24px 0 0;">
                    <a href="${appUrl}/admin/payouts" style="display:inline-block;background:#E63950;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">Review in Admin Panel</a>
                </p>
            </div>`
        await getResend().emails.send({
            from: 'Hexlura <noreply@hexlura.com>',
            replyTo: data.organiserEmail,
            to: 'support@hexlura.com',
            subject: `Payout request: ${data.orgName} — ${amount}`,
            html,
        })
    } catch (err) {
        console.error('Failed to send admin payout request email:', err)
    }
}

export async function sendEventPublishedEmail(data: {
    to: string
    fullName: string
    eventTitle: string
    eventStart: Date
    venueName: string | null
    eventSlug: string
    eventId: string
}): Promise<void> {
    try {
        const appUrl = getAppUrl()
        const eventDate = data.eventStart.toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })
        const html = await render(EventPublished({
            fullName: data.fullName,
            eventTitle: data.eventTitle,
            eventDate,
            venueName: data.venueName,
            eventUrl: `${appUrl}/events/${data.eventSlug}`,
            manageUrl: `${appUrl}/organiser/events/${data.eventId}`,
        }))
        await getResend().emails.send({
            from: 'Hexlura <noreply@hexlura.com>',
            replyTo: 'support@hexlura.com',
            to: data.to,
            subject: `🎟️ ${data.eventTitle} is live on Hexlura`,
            html,
        })
    } catch (err) {
        console.error('Failed to send event published email:', err)
    }
}

export async function sendOrganiserIdentityVerifiedEmail(data: {
    to: string
    fullName: string
    orgName: string
    verifiedAt: Date
}): Promise<void> {
    try {
        const appUrl = getAppUrl()
        const verifiedAtFormatted = data.verifiedAt.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        const html = await render(OrganiserIdentityVerified({
            fullName: data.fullName,
            orgName: data.orgName,
            verifiedAt: verifiedAtFormatted,
            appUrl,
        }))
        await getResend().emails.send({
            from: 'Hexlura <noreply@hexlura.com>',
            replyTo: 'support@hexlura.com',
            to: data.to,
            subject: `Identity verified — payouts enabled for ${data.orgName}`,
            html,
        })
    } catch (err) {
        console.error('Failed to send identity verified email:', err)
    }
}

export async function sendOrganiserWelcomeEmail(data: { to: string; fullName: string; orgName: string }): Promise<void> {
    try {
        const appUrl = getAppUrl()
        const html = await render(OrganiserWelcome({ fullName: data.fullName, orgName: data.orgName, appUrl }))
        await getResend().emails.send({
            from: 'Hexlura <noreply@hexlura.com>',
            replyTo: 'support@hexlura.com',
            to: data.to,
            subject: `${data.orgName} is live on Hexlura — let's sell some tickets`,
            html,
        })
    } catch (err) {
        console.error('Failed to send organiser welcome email:', err)
    }
}

export async function sendPromoterWelcomeEmail(data: { to: string; displayName: string; referralCode: string }): Promise<void> {
    try {
        const appUrl = getAppUrl()
        const html = await render(PromoterWelcome({ displayName: data.displayName, referralCode: data.referralCode, appUrl }))
        await getResend().emails.send({
            from: 'Hexlura <noreply@hexlura.com>',
            replyTo: 'support@hexlura.com',
            to: data.to,
            subject: `Welcome to Hexlura Promoters — your code is ${data.referralCode}`,
            html,
        })
    } catch (err) {
        console.error('Failed to send promoter welcome email:', err)
    }
}

export async function sendPromoterInviteEmail(data: {
    to: string
    orgName: string
    eventName: string
    eventDate: string
    commissionPercent: number
    acceptUrl: string
    isPromoter: boolean
}): Promise<void> {
    try {
        const html = await render(PromoterInvite({
            orgName: data.orgName,
            eventName: data.eventName,
            eventDate: data.eventDate,
            commissionPercent: data.commissionPercent,
            acceptUrl: data.acceptUrl,
            isPromoter: data.isPromoter,
        }))
        await getResend().emails.send({
            from: 'Hexlura <noreply@hexlura.com>',
            replyTo: 'support@hexlura.com',
            to: data.to,
            subject: `${data.orgName} invited you to promote ${data.eventName}`,
            html,
        })
    } catch (err) {
        console.error('Failed to send promoter invite email:', err)
    }
}

function payoutReference(payoutId: string): string {
    return `HXL-PAY-${payoutId.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

function promoterPayoutReference(payoutId: string): string {
    return `HXL-PRM-${payoutId.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

export async function sendOrganiserPayoutPaidEmail(data: {
    to: string
    fullName: string
    orgName: string
    netPence: number
    paidAt: Date
    payoutId: string
    reference?: string | null
    eventName?: string
}): Promise<void> {
    try {
        const appUrl = getAppUrl()
        const paidAtFormatted = data.paidAt.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        const reference = (data.reference && data.reference.trim()) || payoutReference(data.payoutId)
        const html = await render(PayoutPaidOrganiser({
            fullName: data.fullName,
            orgName: data.orgName,
            netPence: data.netPence,
            paidAt: paidAtFormatted,
            reference,
            eventName: data.eventName,
            appUrl,
        }))
        const amount = new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            minimumFractionDigits: 2,
        }).format(data.netPence / 100)
        await getResend().emails.send({
            from: 'Hexlura Payouts <payouts@hexlura.com>',
            replyTo: 'support@hexlura.com',
            to: data.to,
            subject: `Your payout of ${amount} is on its way`,
            html,
        })
    } catch (err) {
        console.error('Failed to send organiser payout paid email:', err)
    }
}

export async function sendPromoterPayoutPaidEmail(data: {
    to: string
    fullName: string
    displayName: string
    referralCode: string
    netPence: number
    paidAt: Date
    payoutId: string
    reference?: string | null
}): Promise<void> {
    try {
        const appUrl = getAppUrl()
        const paidAtFormatted = data.paidAt.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        const reference = (data.reference && data.reference.trim()) || promoterPayoutReference(data.payoutId)
        const html = await render(PayoutPaidPromoter({
            fullName: data.fullName,
            displayName: data.displayName,
            referralCode: data.referralCode,
            netPence: data.netPence,
            paidAt: paidAtFormatted,
            reference,
            appUrl,
        }))
        const amount = new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            minimumFractionDigits: 2,
        }).format(data.netPence / 100)
        await getResend().emails.send({
            from: 'Hexlura Payouts <payouts@hexlura.com>',
            replyTo: 'support@hexlura.com',
            to: data.to,
            subject: `Your commission of ${amount} is on its way`,
            html,
        })
    } catch (err) {
        console.error('Failed to send promoter payout paid email:', err)
    }
}

export async function sendAnnouncementEmail(data: {
    emails: string[]
    eventTitle: string
    eventSlug: string
    subject: string
    message: string
    replyTo: string
}): Promise<number> {
    try {
        const appUrl = getAppUrl()
        const eventUrl = `${appUrl}/events/${data.eventSlug}`
        const html = await render(Announcement({
            eventTitle: data.eventTitle,
            subject: data.subject,
            message: data.message,
            eventUrl,
        }))

        const batches = data.emails.map(email => ({
            from: 'Hexlura <noreply@hexlura.com>' as const,
            replyTo: data.replyTo,
            to: [email],
            subject: `[${data.eventTitle}] ${data.subject}`,
            html,
        }))

        await getResend().batch.send(batches)
        return data.emails.length
    } catch (err) {
        console.error('Failed to send announcement emails:', err)
        return 0
    }
}

export async function sendEventCancelledEmail(data: {
    emails: string[]
    eventTitle: string
    eventDate: string
    hasPaidTickets: boolean
}): Promise<void> {
    try {
        const refundNote = data.hasPaidTickets
            ? 'A full refund will be returned to your original payment method within 5–10 business days.'
            : 'As your tickets were free, no refund is required.'

        const html = await render(EventCancelled({
            eventTitle: data.eventTitle,
            eventDate: data.eventDate,
            refundNote,
        }))

        await getResend().batch.send(
            data.emails.map(email => ({
                from: 'Hexlura <noreply@hexlura.com>' as const,
                replyTo: 'support@hexlura.com',
                to: [email],
                subject: `Cancelled: ${data.eventTitle}`,
                html,
            }))
        )
    } catch (err) {
        console.error('Failed to send event cancelled emails:', err)
    }
}

export async function sendEventReminderEmails(data: {
    emails: string[]
    eventTitle: string
    eventSlug: string
    eventDate: string
    eventTime: string
    venueName: string
    venueAddress: string
}): Promise<number> {
    try {
        const appUrl = getAppUrl()
        const eventUrl = `${appUrl}/events/${data.eventSlug}`
        const html = await render(EventReminder({
            eventTitle: data.eventTitle,
            eventDate: data.eventDate,
            eventTime: data.eventTime,
            venueName: data.venueName,
            venueAddress: data.venueAddress,
            eventUrl,
            downloadUrl: `${appUrl}/bookings`,
        }))

        await getResend().batch.send(
            data.emails.map(email => ({
                from: 'Hexlura <noreply@hexlura.com>' as const,
                replyTo: 'support@hexlura.com',
                to: [email],
                subject: `Reminder: ${data.eventTitle} is tomorrow! 🎟️`,
                html,
            }))
        )
        return data.emails.length
    } catch (err) {
        console.error('Failed to send event reminder emails:', err)
        return 0
    }
}

export async function sendWaitlistNotificationEmails(data: {
    emails: string[]
    eventTitle: string
    eventSlug: string
}): Promise<void> {
    try {
        const appUrl = getAppUrl()
        const eventUrl = `${appUrl}/events/${data.eventSlug}`
        const html = await render(WaitlistAvailable({
            eventTitle: data.eventTitle,
            eventUrl,
        }))

        await getResend().batch.send(
            data.emails.map(email => ({
                from: 'Hexlura <noreply@hexlura.com>' as const,
                replyTo: 'support@hexlura.com',
                to: [email],
                subject: `Tickets available now: ${data.eventTitle}`,
                html,
            }))
        )
    } catch (err) {
        console.error('Failed to send waitlist notification emails:', err)
    }
}

export async function sendStripeConnectedEmail(data: {
    to: string
    fullName: string
    orgName: string
}): Promise<void> {
    try {
        const appUrl = getAppUrl()
        const html = `
            <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
                <h2 style="margin:0 0 16px;color:#111;">Stripe account connected</h2>
                <p style="margin:0 0 8px;">Hi ${data.fullName},</p>
                <p style="margin:0 0 16px;">Your Stripe account is now connected to <strong>${data.orgName}</strong> on Hexlura. Payouts from ticket sales will be transferred directly to your Stripe account once your Connect onboarding is complete.</p>
                <p style="margin:0 0 16px;">You can manage your payout settings from your organiser dashboard at any time.</p>
                <p style="margin:24px 0 0;">
                    <a href="${appUrl}/organiser/settings" style="display:inline-block;background:#E63950;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">View Settings</a>
                </p>
            </div>`
        await getResend().emails.send({
            from: 'Hexlura <noreply@hexlura.com>',
            replyTo: 'support@hexlura.com',
            to: data.to,
            subject: 'Stripe account connected — payouts enabled',
            html,
        })
    } catch (err) {
        console.error('Failed to send stripe connected email:', err)
    }
}

export async function sendAdminPromoterPayoutRequestEmail(data: {
    promoterName: string
    promoterEmail: string
    referralCode: string
    totalRequestedPence: number
    payoutCount: number
}): Promise<void> {
    try {
        const appUrl = getAppUrl()
        const amount = `£${(data.totalRequestedPence / 100).toFixed(2)}`
        const html = `
            <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
                <h2 style="margin:0 0 16px;color:#111;">New Promoter Payout Request</h2>
                <p style="margin:0 0 8px;"><strong>Promoter:</strong> ${data.promoterName} (${data.referralCode})</p>
                <p style="margin:0 0 8px;"><strong>Contact:</strong> ${data.promoterEmail}</p>
                <p style="margin:0 0 8px;"><strong>Amount requested:</strong> ${amount}</p>
                <p style="margin:0 0 16px;"><strong>Payouts in batch:</strong> ${data.payoutCount}</p>
                <p style="margin:24px 0 0;">
                    <a href="${appUrl}/admin/payouts" style="display:inline-block;background:#E63950;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">Review in Admin Panel</a>
                </p>
            </div>`
        await getResend().emails.send({
            from: 'Hexlura <noreply@hexlura.com>',
            replyTo: data.promoterEmail,
            to: 'support@hexlura.com',
            subject: `Promoter payout request: ${data.promoterName} — ${amount}`,
            html,
        })
    } catch (err) {
        console.error('Failed to send admin promoter payout request email:', err)
    }
}
