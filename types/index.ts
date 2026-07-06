export interface Profile {
    id: string;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    role: 'user' | 'organiser' | 'promoter' | 'admin';
    is_verified: boolean;
    is_suspended: boolean;
    email_marketing_opt_out: boolean;
    unsubscribe_token: string | null;
    referral_code: string | null;
    referred_by: string | null;
    credit_balance: number;
    created_at: string;
}

export interface OrganiserProfile {
    id: string;
    user_id: string;
    org_name: string;
    slug: string;
    description: string | null;
    website: string | null;
    logo_url: string | null;
    vat_number: string | null;
    vat_registered: boolean;
    stripe_account_id: string | null;
    stripe_connect_allowed: boolean;
    stripe_charges_enabled: boolean;
    stripe_payouts_enabled: boolean;
    fee_exempt: boolean;
    organiser_type: 'individual' | 'artist' | 'club_venue' | 'event_company' | 'charity' | 'education';
    payout_method: 'stripe_connect' | 'bank_transfer';
    bank_account_name: string | null;
    bank_sort_code: string | null;
    bank_account_number: string | null;
    is_approved: boolean;
    is_suspended: boolean;
    approved_at: string | null;
    approved_by: string | null;
    identity_status: 'processing' | 'verified' | 'requires_input' | 'canceled' | null;
    identity_session_id: string | null;
    identity_verified_at: string | null;
    identity_last_attempt_at: string | null;
    identity_failure_reason: string | null;
    meta_pixel_id: string | null;
    created_at: string;
}

export interface Event {
    id: string;
    organiser_id: string;
    title: string;
    slug: string;
    description: string | null;
    category: 'Club Nights' | 'Gigs & Live Music' | 'Comedy' | 'Theatre & Arts' | 'Festivals' | 'Food & Drink' | 'Sports & Fitness' | 'Business & Networking' | 'Family & Kids' | 'Classes & Workshops' | 'Dating & Social' | 'Culture & Heritage';
    tags: string[] | null;
    venue_name: string | null;
    venue_address: string | null;
    venue_city: string | null;
    venue_postcode: string | null;
    lat: number | null;
    lng: number | null;
    start_at: string;
    end_at: string | null;
    banner_url: string | null;
    banner_images: string[] | null;
    youtube_url: string | null;
    status: 'draft' | 'published' | 'cancelled' | 'archived';
    ticket_availability: 'on_sale' | 'coming_soon';
    is_featured: boolean;
    featured_order: number;
    min_age: number;
    max_tickets_per_order: number;
    refund_policy: string | null;
    total_capacity: number | null;
    created_at: string;
    organiser?: OrganiserProfile;
    ticket_types?: TicketType[];
}

export interface TicketType {
    id: string;
    event_id: string;
    name: string;
    description: string | null;
    price_pence: number;
    quantity_total: number;
    quantity_sold: number;
    sale_starts_at: string | null;
    sale_ends_at: string | null;
    max_per_order: number;
    sort_order: number;
    is_visible: boolean;
}

export interface PromoCode {
    id: string;
    event_id: string | null;
    code: string;
    organiser_id: string | null;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    min_order_pence: number;
    max_uses: number | null;
    uses_count: number;
    valid_from: string | null;
    valid_to: string | null;
    created_at: string;
}

export interface Booking {
    id: string;
    user_id: string | null;
    event_id: string;
    booking_ref: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
    ticket_subtotal_pence: number | null;
    booking_fee_pence: number | null;
    total_pence: number | null;
    promo_code_id: string | null;
    discount_pence: number;
    order_processing_fee_pence: number;
    stripe_payment_intent_id: string | null;
    stripe_charge_id: string | null;
    payment_method: string | null;
    needs_manual_payout: boolean;
    promoter_id: string | null;
    promoter_commission_percent: number | null;
    promoter_commission_pence: number | null;
    created_at: string;
    confirmed_at: string | null;
    event?: Event;
    items?: BookingItem[];
}

export interface RefundRequest {
    id: string;
    booking_id: string;
    user_id: string;
    reason: string;
    message: string | null;
    status: 'pending' | 'approved' | 'rejected';
    admin_note: string | null;
    created_at: string;
    resolved_at: string | null;
}

export interface BookingItem {
    id: string;
    booking_id: string;
    ticket_type_id: string | null;
    quantity: number;
    unit_price_pence: number;
    attendee_name: string | null;
    attendee_email: string | null;
    qr_code: string | null;
    ticket_type?: TicketType;
}

export interface Payout {
    id: string;
    organiser_id: string;
    event_id: string | null;
    gross_pence: number | null;
    fee_pence: number | null;
    net_pence: number | null;
    status: 'pending' | 'requested' | 'processing' | 'paid' | 'failed';
    stripe_transfer_id: string | null;
    scheduled_at: string | null;
    requested_at: string | null;
    paid_at: string | null;
    created_at: string;
}

export interface Checkin {
    id: string;
    booking_item_id: string;
    qr_token: string;
    checked_in_at: string;
    checked_in_by: string | null;
}

export interface Waitlist {
    id: string;
    event_id: string;
    ticket_type_id: string;
    user_id: string;
    email: string;
    notified_at: string | null;
    created_at: string;
}

export interface Review {
    id: string;
    event_id: string;
    user_id: string;
    rating: number | null;
    comment: string | null;
    is_visible: boolean;
    created_at: string;
    user?: Profile;
}

export interface Notification {
    id: string;
    user_id: string;
    type: string | null;
    title: string | null;
    body: string | null;
    is_read: boolean;
    link: string | null;
    created_at: string;
}

export interface AuditLog {
    id: string;
    actor_id: string | null;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

export interface SeoMetadata {
    page_path: string;
    title: string | null;
    description: string | null;
    og_title: string | null;
    og_description: string | null;
    og_image_url: string | null;
    twitter_card: 'summary' | 'summary_large_image' | null;
    keywords: string | null;
    canonical_url: string | null;
    robots: string | null;
    json_ld: Record<string, unknown> | null;
    updated_at: string;
    updated_by: string | null;
    created_at: string;
}

export interface SeoGlobalDefaults {
    site_name: string;
    default_og_image: string;
    twitter_handle: string;
    default_description: string;
}

export interface PromoterProfile {
    id: string;
    user_id: string;
    display_name: string;
    referral_code: string;
    bio: string | null;
    avatar_url: string | null;
    payout_method: 'bank_transfer' | 'stripe_connect' | null;
    bank_account_name: string | null;
    bank_account_number: string | null;
    bank_sort_code: string | null;
    stripe_account_id: string | null;
    status: 'active' | 'suspended';
    created_at: string;
}

export interface PromoterEventAssignment {
    id: string;
    promoter_id: string | null;
    event_id: string;
    organiser_id: string;
    commission_percent: number;
    status: 'invited' | 'active' | 'removed';
    invite_token: string | null;
    invited_email: string | null;
    invited_by: string | null;
    created_at: string;
    accepted_at: string | null;
    event?: Event;
    promoter?: PromoterProfile;
}

export interface PromoterLinkClick {
    id: string;
    promoter_id: string;
    event_id: string | null;
    ip_hash: string | null;
    user_agent: string | null;
    referrer: string | null;
    is_unique: boolean;
    created_at: string;
}

export interface PromoterEarning {
    id: string;
    promoter_id: string;
    booking_id: string;
    event_id: string;
    organiser_id: string;
    ticket_subtotal_pence: number;
    commission_percent: number;
    commission_pence: number;
    status: 'pending' | 'available' | 'paid' | 'reversed';
    payout_id: string | null;
    created_at: string;
    available_at: string | null;
    reversed_at: string | null;
}

export interface PromoterPayout {
    id: string;
    promoter_id: string;
    gross_pence: number;
    fee_pence: number;
    net_pence: number;
    status: 'pending' | 'requested' | 'processing' | 'paid' | 'failed';
    requested_at: string | null;
    processed_at: string | null;
    paid_at: string | null;
    failure_reason: string | null;
    payout_method: string | null;
    reference: string | null;
    created_at: string;
}
