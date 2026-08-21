import { Resend } from 'resend'
import { render } from '@react-email/components'
import BookingConfirmation from '@/emails/booking-confirmation'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildTicketDescriptors, type BookingItemRow } from '@/lib/tickets/descriptors'
import { generateTicketPdf } from '@/lib/tickets/generateTicketPdf'
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
import PayoutRequestedOrganiser from '@/emails/payout-requested-organiser'
import PayoutRequestAdmin from '@/emails/payout-request-admin'
import PromoterPayoutRequestAdmin from '@/emails/promoter-payout-request-admin'
import StripeConnected from '@/emails/stripe-connected'
import EventPromoCampaign from '@/emails/event-promo-campaign'
import NewEventFollowers from '@/emails/new-event-followers'
import EventDeletionRequestedAdmin from '@/emails/event-deletion-requested-admin'
import AccountDeletionRequestedAdmin from '@/emails/account-deletion-requested-admin'
import AccountDeletionApproved from '@/emails/account-deletion-approved'

function getResend() {
    return new Resend(process.env.RESEND_API_KEY || 'placeholder')
}

function getAppUrl() {
    return process.env.NEXT_PUBLIC_APP_URL || 'https://hexlura.com'
}

interface BookingEmailData {
    to: string
    bookingRef: string
    bookingId: string
    organiserId?: string
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
        const adminClient = createAdminClient()

        const { data: bookingRow } = await adminClient
            .from('bookings')
            .select('ticket_access_token')
            .eq('id', data.bookingId)
            .single()
        const accessToken = (bookingRow as { ticket_access_token?: string } | null)?.ticket_access_token

        const { data: itemRows } = await adminClient
            .from('booking_items')
            .select('id, qr_code, quantity, ticket_type:ticket_types(name, is_group, group_size)')
            .eq('booking_id', data.bookingId)

        let organiserName: string | undefined
        if (data.organiserId) {
            const { data: org } = await adminClient
                .from('organiser_profiles')
                .select('org_name')
                .eq('id', data.organiserId)
                .single()
            organiserName = (org as { org_name?: string } | null)?.org_name
        }

        const descriptors = buildTicketDescriptors((itemRows || []) as unknown as BookingItemRow[], data.bookingRef)

        const attachments = await Promise.all(descriptors.map(async (descriptor, i) => {
            const pdfBuffer = await generateTicketPdf({
                eventName: data.eventName,
                eventDate: data.eventDate,
                eventTime: data.eventTime,
                venueName: data.venueName || 'TBC',
                venueAddress: data.venueAddress || '',
                organiserName,
                bookingRef: data.bookingRef,
                holderName: data.buyerName || 'Ticket Holder',
                ticketName: descriptor.ticketName,
                token: descriptor.token,
                isCancelled: false,
                ticketIndex: i + 1,
                ticketTotal: descriptors.length,
            })
            return {
                filename: `${data.bookingRef}-ticket-${i + 1}-of-${descriptors.length}.pdf`,
                content: pdfBuffer,
            }
        }))

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
            downloadUrl: `${appUrl}/api/tickets/${data.bookingRef}/pdf${accessToken ? `?token=${accessToken}` : ''}`,
        }))

        await getResend().emails.send({
            from: 'Hexlura <noreply@hexlura.com>',
            replyTo: 'support@hexlura.com',
            to: data.to,
            subject: `Your tickets for ${data.eventName} are confirmed! 🎉`,
            html,
            attachments,
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
        const html = await render(PayoutRequestAdmin({
            orgName: data.orgName,
            organiserEmail: data.organiserEmail,
            totalRequestedPence: data.totalRequestedPence,
            payoutCount: data.payoutCount,
            appUrl,
        }))
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

export async function sendPayoutRequestedOrganiserEmail(data: {
    to: string
    fullName: string
    orgName: string
    totalRequestedPence: number
    payoutCount: number
}): Promise<void> {
    try {
        const appUrl = getAppUrl()
        const html = await render(PayoutRequestedOrganiser({
            fullName: data.fullName,
            orgName: data.orgName,
            totalRequestedPence: data.totalRequestedPence,
            payoutCount: data.payoutCount,
            appUrl,
        }))
        await getResend().emails.send({
            from: 'Hexlura <noreply@hexlura.com>',
            replyTo: 'support@hexlura.com',
            to: data.to,
            subject: `Payout request received — £${(data.totalRequestedPence / 100).toFixed(2)}`,
            html,
        })
    } catch (err) {
        console.error('Failed to send organiser payout request email:', err)
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
        const html = await render(StripeConnected({
            fullName: data.fullName,
            orgName: data.orgName,
            appUrl,
        }))
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

// Resend's batch endpoint caps out well under a few thousand recipients per call,
// so campaigns (capped at 2000 recipients) are sent in chunks of 100.
const CAMPAIGN_SEND_CHUNK_SIZE = 100

export async function sendEventPromoCampaignEmails(data: {
    orgName: string
    eventTitle: string
    eventSlug: string
    subject: string
    message: string
    replyTo: string
    recipients: { email: string; unsubscribeToken: string }[]
}): Promise<{ email: string; success: boolean; messageId?: string }[]> {
    const appUrl = getAppUrl()
    const eventUrl = `${appUrl}/events/${data.eventSlug}`
    const results: { email: string; success: boolean; messageId?: string }[] = []

    for (let i = 0; i < data.recipients.length; i += CAMPAIGN_SEND_CHUNK_SIZE) {
        const chunk = data.recipients.slice(i, i + CAMPAIGN_SEND_CHUNK_SIZE)

        const rendered = await Promise.all(chunk.map(async recipient => {
            const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${encodeURIComponent(recipient.unsubscribeToken)}`
            const html = await render(EventPromoCampaign({
                orgName: data.orgName,
                eventTitle: data.eventTitle,
                subject: data.subject,
                message: data.message,
                eventUrl,
                unsubscribeUrl,
            }))
            return { email: recipient.email, html }
        }))

        try {
            const { data: sendResults, error } = await getResend().batch.send(
                rendered.map(r => ({
                    from: 'Hexlura <noreply@hexlura.com>' as const,
                    replyTo: data.replyTo,
                    to: [r.email],
                    subject: `[${data.eventTitle}] ${data.subject}`,
                    html: r.html,
                }))
            )

            if (error || !sendResults) {
                console.error('Campaign batch send error:', error)
                rendered.forEach(r => results.push({ email: r.email, success: false }))
            } else {
                sendResults.data.forEach((r, idx) => {
                    results.push({ email: rendered[idx].email, success: true, messageId: r.id })
                })
            }
        } catch (err) {
            console.error('Campaign batch send threw:', err)
            rendered.forEach(r => results.push({ email: r.email, success: false }))
        }
    }

    return results
}

// Resend's batch endpoint has a real per-call recipient limit, and a popular
// organiser's follower count can exceed it — chunk to keep this working at scale.
const FOLLOWER_EMAIL_CHUNK_SIZE = 100

export async function sendNewEventFollowersEmails(data: {
    emails: string[]
    orgName: string
    eventTitle: string
    eventDate: string
    venueName: string | null
    eventSlug: string
}): Promise<number> {
    const appUrl = getAppUrl()
    const eventUrl = `${appUrl}/events/${data.eventSlug}`
    let sent = 0

    try {
        const html = await render(NewEventFollowers({
            orgName: data.orgName,
            eventTitle: data.eventTitle,
            eventDate: data.eventDate,
            venueName: data.venueName,
            eventUrl,
        }))

        for (let i = 0; i < data.emails.length; i += FOLLOWER_EMAIL_CHUNK_SIZE) {
            const chunk = data.emails.slice(i, i + FOLLOWER_EMAIL_CHUNK_SIZE)
            try {
                await getResend().batch.send(
                    chunk.map(email => ({
                        from: 'Hexlura <noreply@hexlura.com>' as const,
                        replyTo: 'support@hexlura.com',
                        to: [email],
                        subject: `${data.orgName} just announced: ${data.eventTitle}`,
                        html,
                    }))
                )
                sent += chunk.length
            } catch (err) {
                console.error('New event follower email chunk failed:', err)
            }
        }
    } catch (err) {
        console.error('Failed to render new event follower email:', err)
    }

    return sent
}

export async function sendEventDeletionRequestedAdminEmail(data: {
    orgName: string
    organiserEmail: string
    eventTitle: string
    reason: string
    confirmedBookingCount: number
    revenuePence: number
}): Promise<void> {
    try {
        const appUrl = getAppUrl()
        const html = await render(EventDeletionRequestedAdmin({
            orgName: data.orgName,
            organiserEmail: data.organiserEmail,
            eventTitle: data.eventTitle,
            reason: data.reason,
            confirmedBookingCount: data.confirmedBookingCount,
            revenuePence: data.revenuePence,
            appUrl,
        }))
        await getResend().emails.send({
            from: 'Hexlura <noreply@hexlura.com>',
            replyTo: data.organiserEmail,
            to: 'support@hexlura.com',
            subject: `Event deletion requested: ${data.eventTitle} (${data.orgName})`,
            html,
        })
    } catch (err) {
        console.error('Failed to send event deletion requested admin email:', err)
    }
}

export async function sendAccountDeletionRequestedAdminEmail(data: {
    orgName: string
    requesterEmail: string
    reason: string
    eventCount: number
    confirmedBookingCount: number
}): Promise<void> {
    try {
        const appUrl = getAppUrl()
        const html = await render(AccountDeletionRequestedAdmin({
            orgName: data.orgName,
            requesterEmail: data.requesterEmail,
            reason: data.reason,
            eventCount: data.eventCount,
            confirmedBookingCount: data.confirmedBookingCount,
            appUrl,
        }))
        await getResend().emails.send({
            from: 'Hexlura <noreply@hexlura.com>',
            replyTo: data.requesterEmail,
            to: 'support@hexlura.com',
            subject: `Account deletion requested: ${data.orgName}`,
            html,
        })
    } catch (err) {
        console.error('Failed to send account deletion requested admin email:', err)
    }
}

export async function sendAccountDeletionApprovedEmail(data: {
    to: string
    fullName: string
    orgName: string
}): Promise<void> {
    try {
        const html = await render(AccountDeletionApproved({
            fullName: data.fullName,
            orgName: data.orgName,
        }))
        await getResend().emails.send({
            from: 'Hexlura <noreply@hexlura.com>',
            replyTo: 'support@hexlura.com',
            to: data.to,
            subject: 'Your Hexlura account has been deleted',
            html,
        })
    } catch (err) {
        console.error('Failed to send account deletion approved email:', err)
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
        const html = await render(PromoterPayoutRequestAdmin({
            promoterName: data.promoterName,
            promoterEmail: data.promoterEmail,
            referralCode: data.referralCode,
            totalRequestedPence: data.totalRequestedPence,
            payoutCount: data.payoutCount,
            appUrl,
        }))
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
