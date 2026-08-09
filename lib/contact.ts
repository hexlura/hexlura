// Shared constants + types for the public contact/enquiry form.

export type ContactTopic =
    | 'event_ticketing'
    | 'organizer'
    | 'venue_partnership'
    | 'existing_event'
    | 'corporate_private_event'
    | 'technical_support'
    | 'partnership'
    | 'other'

export const CONTACT_TOPICS: { value: ContactTopic; label: string }[] = [
    { value: 'event_ticketing', label: 'Event ticketing' },
    { value: 'organizer', label: 'Become an organizer' },
    { value: 'venue_partnership', label: 'Venue partnership' },
    { value: 'existing_event', label: 'Existing event support' },
    { value: 'corporate_private_event', label: 'Corporate / private event' },
    { value: 'technical_support', label: 'Technical support' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'other', label: 'Other' },
]

export type ContactEnquiry = {
    name: string
    email: string
    organizationName: string
    phone?: string
    topic: ContactTopic
    eventDetails: string
}

export function topicLabel(topic: string): string {
    return CONTACT_TOPICS.find(t => t.value === topic)?.label ?? topic
}

// --- Admin enquiry management (app/(admin)/admin/support/enquiries) ---

export type EnquiryPriority = 'low' | 'medium' | 'high'

export const ENQUIRY_PRIORITIES: { value: EnquiryPriority; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
]

export function priorityLabel(priority: string | null): string {
    if (!priority) return 'None'
    return ENQUIRY_PRIORITIES.find(p => p.value === priority)?.label ?? priority
}

// Whitelist of columns the enquiries list may sort by — never interpolate
// a raw query-param column name into an ORDER BY.
export const ENQUIRY_SORTABLE_COLUMNS = [
    'created_at', 'topic', 'source', 'is_read', 'is_connected', 'is_converted', 'upcoming_schedule', 'priority',
] as const
export type EnquirySortColumn = typeof ENQUIRY_SORTABLE_COLUMNS[number]

// Dispatched client-side whenever an enquiry's read state changes, so the
// admin sidebar's unread badge can refresh without a full page reload.
export const ENQUIRIES_UPDATED_EVENT = 'enquiries:updated'

export type ContactEnquiryRow = {
    id: string
    name: string
    email: string
    organization_name: string
    phone: string | null
    topic: ContactTopic
    event_details: string
    status: string
    source: string
    page_path: string | null
    created_at: string
    updated_at: string
    is_read: boolean
    is_connected: boolean
    is_converted: boolean
    lead_summary: string | null
    upcoming_schedule: string | null
    priority: EnquiryPriority | null
}
