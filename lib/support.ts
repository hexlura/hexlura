// Shared constants + label/colour helpers for the support ticket system.

export type SupportCategory = 'general' | 'payment' | 'event' | 'account' | 'bug' | 'other'
export type SupportStatus = 'open' | 'pending_user' | 'in_progress' | 'resolved' | 'closed'
export type SupportPriority = 'low' | 'normal' | 'high' | 'urgent'

export const SUPPORT_CATEGORIES: { value: SupportCategory; label: string }[] = [
    { value: 'general', label: 'General' },
    { value: 'payment', label: 'Payment' },
    { value: 'event', label: 'Event' },
    { value: 'account', label: 'Account' },
    { value: 'bug', label: 'Bug' },
    { value: 'other', label: 'Other' },
]

export const SUPPORT_STATUSES: { value: SupportStatus; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'pending_user', label: 'Awaiting your reply' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
]

export const SUPPORT_PRIORITIES: { value: SupportPriority; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
]

export function statusBadgeClasses(status: SupportStatus): string {
    switch (status) {
        case 'open': return 'text-accent bg-accent/10 border-accent/30'
        case 'pending_user': return 'text-gold bg-gold/10 border-gold/30'
        case 'in_progress': return 'text-blue-500 bg-blue-500/10 border-blue-500/30'
        case 'resolved': return 'text-success bg-success/10 border-success/30'
        case 'closed': return 'text-muted bg-muted/10 border-muted/30'
    }
}

export function statusLabel(status: SupportStatus): string {
    return SUPPORT_STATUSES.find(s => s.value === status)?.label ?? status
}

export function categoryLabel(cat: SupportCategory): string {
    return SUPPORT_CATEGORIES.find(c => c.value === cat)?.label ?? cat
}

export function priorityLabel(p: SupportPriority): string {
    return SUPPORT_PRIORITIES.find(s => s.value === p)?.label ?? p
}
