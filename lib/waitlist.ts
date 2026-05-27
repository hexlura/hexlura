import { createServiceClient } from '@/lib/supabase/service'
import { sendWaitlistNotificationEmails } from '@/lib/email'

export async function notifyWaitlistForEvent(
    eventId: string,
    eventTitle: string,
    eventSlug: string
): Promise<void> {
    try {
        const supabase = createServiceClient()
        const { data: waitlisted } = await supabase
            .from('waitlist')
            .select('email')
            .eq('event_id', eventId)

        if (!waitlisted?.length) return

        const emails = Array.from(
            new Set(waitlisted.map(w => w.email).filter(Boolean))
        ) as string[]

        if (!emails.length) return

        await sendWaitlistNotificationEmails({ emails, eventTitle, eventSlug })
    } catch (err) {
        console.error('[notifyWaitlistForEvent] error:', err)
    }
}
