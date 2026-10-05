'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compress-image'
import type { Event, TicketType } from '@/types'
import dynamic from 'next/dynamic'
import { CATEGORIES } from '@/lib/config/categories'
import { DateTimePicker } from '@/components/organiser/DateTimePicker'
import { REFUND_POLICIES } from '@/lib/refund-policy'
import { ThemedSelect } from '@/components/ui/ThemedSelect'

const RichTextEditor = dynamic(
    () => import('@/components/editor/RichTextEditor').then(m => m.RichTextEditor),
    { ssr: false, loading: () => <div className="h-48 bg-background border border-border rounded-xl animate-pulse" /> }
)
const UK_CITIES = ['London', 'Manchester', 'Birmingham', 'Glasgow', 'Edinburgh', 'Leeds', 'Bristol', 'Liverpool', 'Newcastle', 'Cardiff', 'Sheffield', 'Nottingham']

function SectionTitle({ num, title, badge, inline = false }: { num: string; title: string; badge: string; inline?: boolean }) {
    return (
        <div className={`flex items-center gap-3 ${inline ? '' : 'mb-5'}`}>
            <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${badge}`}>{num}</span>
            <h2 className="font-heading text-xl tracking-wide">{title}</h2>
        </div>
    )
}

interface TicketTypeRow {
    id?: string
    name: string
    description: string
    price_pence: number
    quantity_total: number
    max_per_order: number
    is_visible: boolean
    is_group: boolean
    group_size: number
    sort_order: number
    sale_starts_at: string
    sale_ends_at: string
    priceStr: string
    qtyStr: string
}

interface EventFormProps {
    organiserId: string
    event?: Event
    ticketTypes?: TicketType[]
    /** When false, shows the "Connect Stripe first" banner and disables Publish (drafts still save). Defaults to true. */
    stripeReady?: boolean
}

// Convert UTC ISO string → "YYYY-MM-DDTHH:mm" in Europe/London time for datetime-local inputs
function toDatetimeLocal(utcStr: string | null | undefined): string {
    if (!utcStr) return ''
    const d = new Date(utcStr)
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(d)
    const p: Record<string, string> = {}
    parts.forEach(({ type, value }) => { p[type] = value })
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

// Convert datetime-local value (treated as Europe/London time) → UTC ISO string
function ukTimeToUTC(localStr: string): string | null {
    if (!localStr) return null
    const [datePart, timePart] = localStr.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute] = timePart.split(':').map(Number)
    // Check London's UTC offset at noon on this date (noon is safely away from DST transitions)
    const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0))
    const noonLondon = parseInt(new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London', hour: 'numeric', hourCycle: 'h23',
    }).format(noonUtc))
    const londonOffset = noonLondon - 12 // 0 for GMT (winter), 1 for BST (summer)
    return new Date(Date.UTC(year, month - 1, day, hour - londonOffset, minute)).toISOString()
}

function toSlug(title: string) {
    return title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

function priceToPence(str: string) {
    const n = parseFloat(str)
    return isNaN(n) ? 0 : Math.round(n * 100)
}

function randomSlugSuffix() {
    return Math.random().toString(36).slice(2, 6)
}

// RLS blocks reads of other organisers' drafts, so slug availability can't be
// checked up front — collisions are handled by retrying the write with a
// suffixed slug when Postgres reports a unique violation (code 23505).
const PERMISSION_MSG = "Save failed: this account doesn't have permission to change this event. Only the organiser account that owns the event can edit it."

function friendlyDbError(error: { code?: string; message?: string } | null | undefined, action: string): string {
    if (!error) return `${action} failed — please try again`
    if (error.code === '23505') return `${action} failed: this event slug is already taken by another event. Change the Event Slug in section 02 and try again.`
    if (error.code === '42501' || (error.message || '').includes('row-level security')) return PERMISSION_MSG
    return `${action} failed: ${error.message || 'unexpected error'}. Your changes have NOT been saved.`
}

export function EventForm({ organiserId, event, ticketTypes: initTickets, stripeReady = true }: EventFormProps) {
    const router = useRouter()
    const isEdit = !!event
    // Once an event has left draft, its slug may already be shared publicly
    // (social posts, flyers). Lock it so a save can't silently break those
    // links — old links are also caught by a slug-history redirect as a
    // second line of defence, but preventing the change at the source is better.
    const slugLocked = isEdit && event?.status !== 'draft'

    // Section 01
    const [title, setTitle] = useState(event?.title || '')
    const [category, setCategory] = useState(event?.category || '')
    const [tags, setTags] = useState((event?.tags || []).join(', '))
    const [description, setDescription] = useState(event?.description || '')
    const [bannerImages, setBannerImages] = useState<string[]>(
        event?.banner_images?.length ? event.banner_images : event?.banner_url ? [event.banner_url] : []
    )
    const [bannerUploading, setBannerUploading] = useState(false)
    const [bannerError, setBannerError] = useState('')
    const [youtubeUrl, setYoutubeUrl] = useState(event?.youtube_url || '')

    // Section 02
    const [slug, setSlug] = useState(event?.slug || '')
    const [startAt, setStartAt] = useState(toDatetimeLocal(event?.start_at))
    const [endAt, setEndAt] = useState(toDatetimeLocal(event?.end_at))
    const [checkinStartAt, setCheckinStartAt] = useState(toDatetimeLocal((event as (typeof event & { checkin_start_at?: string }))?.checkin_start_at))
    const [checkinEndAt, setCheckinEndAt] = useState(toDatetimeLocal((event as (typeof event & { checkin_end_at?: string }))?.checkin_end_at))
    const [venueName, setVenueName] = useState(event?.venue_name || '')
    const [venueAddress, setVenueAddress] = useState(event?.venue_address?.replace(/,\s*[^,]+$/, '').trim() || '')
    const [venueCity, setVenueCity] = useState((event as (typeof event & { venue_city?: string | null }))?.venue_city || '')
    const [venuePostcode, setVenuePostcode] = useState(event?.venue_postcode || '')
    const [venueLat, setVenueLat] = useState<number | null>((event as { venue_lat?: number | null })?.venue_lat ?? null)
    const [venueLng, setVenueLng] = useState<number | null>((event as { venue_lng?: number | null })?.venue_lng ?? null)
    const [postcodeStatus, setPostcodeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [postcodeMsg, setPostcodeMsg] = useState('')

    // Section 03 — Ticket Types
    const defaultTicket: TicketTypeRow = {
        name: 'General Admission', description: '', price_pence: 0, priceStr: '',
        quantity_total: 100, qtyStr: '100', max_per_order: 10, is_visible: true, sort_order: 0,
        sale_starts_at: '', sale_ends_at: '', is_group: false, group_size: 1,
    }
    const [tickets, setTickets] = useState<TicketTypeRow[]>(
        initTickets?.map(tt => ({
            id: tt.id,
            name: tt.name,
            description: tt.description || '',
            price_pence: tt.price_pence,
            priceStr: (tt.price_pence / 100).toFixed(2),
            quantity_total: tt.quantity_total,
            qtyStr: String(tt.quantity_total || ''),
            max_per_order: tt.max_per_order,
            is_visible: tt.is_visible,
            sort_order: tt.sort_order,
            sale_starts_at: tt.sale_starts_at || '',
            sale_ends_at: tt.sale_ends_at || '',
            is_group: (tt as TicketType & { is_group?: boolean }).is_group ?? false,
            group_size: (tt as TicketType & { group_size?: number }).group_size ?? 1,
        })) || [defaultTicket]
    )

    // Section 04
    const [maxTicketsPerOrder] = useState(event?.max_tickets_per_order || 10)
    const [minAge, setMinAge] = useState(event?.min_age || 0)
    const [refundPolicy, setRefundPolicy] = useState(event?.refund_policy || REFUND_POLICIES[2])
    const [ticketAvailability, setTicketAvailability] = useState<'on_sale' | 'coming_soon'>(event?.ticket_availability || 'on_sale')

    const [showTicketPresetModal, setShowTicketPresetModal] = useState(false)

    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [errors, setErrors] = useState<string[]>([])
    const [publishing, setPublishing] = useState(false)
    const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)
    // Remembers an event created mid-session so a failed save can be retried
    // without inserting a duplicate event (the `event` prop only updates after
    // navigation to the edit page).
    const createdEventIdRef = useRef<string | null>(null)

    // Auto-generate slug from title (only if not editing)
    useEffect(() => {
        if (!isEdit && title) setSlug(toSlug(title))
    }, [title, isEdit])

    // If editing and no tickets were passed (e.g. not yet saved to DB), fetch them client-side
    useEffect(() => {
        if (!event?.id || tickets.length > 0) return
        const supabase = createClient()
        supabase.from('ticket_types').select('*').eq('event_id', event.id).order('sort_order').then(({ data }) => {
            if (data && data.length > 0) {
                setTickets(data.map(tt => ({
                    id: tt.id,
                    name: tt.name,
                    description: tt.description || '',
                    price_pence: tt.price_pence,
                    priceStr: (tt.price_pence / 100).toFixed(2),
                    quantity_total: tt.quantity_total,
                    qtyStr: String(tt.quantity_total || ''),
                    max_per_order: tt.max_per_order,
                    is_visible: tt.is_visible,
                    sort_order: tt.sort_order,
                    sale_starts_at: tt.sale_starts_at || '',
                    sale_ends_at: tt.sale_ends_at || '',
                    is_group: (tt as Record<string, unknown>).is_group as boolean ?? false,
                    group_size: (tt as Record<string, unknown>).group_size as number ?? 1,
                })))
            }
        })
    }, [event?.id, tickets.length])

    // Auto-save every 30 seconds
    useEffect(() => {
        autoSaveRef.current = setInterval(() => {
            if (title) saveDraft()
        }, 30000)
        return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current) }
    }, [title, description, tickets, saveDraft])

    function buildEventPayload(slugValue: string) {
        return {
            title,
            slug: slugValue,
            description,
            category: category || 'Other',
            tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            venue_name: venueName,
            venue_address: [venueAddress, venueCity].filter(Boolean).join(', '),
            venue_city: venueCity || null,
            venue_postcode: venuePostcode,
            venue_lat: venueLat,
            venue_lng: venueLng,
            start_at: startAt ? ukTimeToUTC(startAt) : null,
            end_at: endAt ? ukTimeToUTC(endAt) : null,
            checkin_start_at: checkinStartAt ? ukTimeToUTC(checkinStartAt) : null,
            checkin_end_at: checkinEndAt ? ukTimeToUTC(checkinEndAt) : null,
            banner_url: bannerImages[0] || null,
            banner_images: bannerImages,
            youtube_url: youtubeUrl || null,
            min_age: minAge,
            max_tickets_per_order: maxTicketsPerOrder,
            refund_policy: refundPolicy,
            ticket_availability: ticketAvailability,
        }
    }

    function buildTicketPayload(tt: TicketTypeRow, sortOrder: number) {
        return {
            name: tt.name, description: tt.description, price_pence: tt.price_pence,
            quantity_total: tt.quantity_total, max_per_order: tt.max_per_order,
            is_visible: tt.is_visible, sort_order: sortOrder,
            sale_starts_at: tt.sale_starts_at || null, sale_ends_at: tt.sale_ends_at || null,
            is_group: tt.is_group, group_size: tt.group_size,
        }
    }

    async function getOrCreateEventId(): Promise<{ id: string; slug: string } | null> {
        const supabase = createClient()
        const existingId = event?.id || createdEventIdRef.current
        // toSlug() here matters: the Event Slug field (section 02) is a free-typed
        // input that's only auto-sanitized while creating a brand-new event — once
        // editing, nothing else cleans it, so a manually retyped value with spaces/
        // caps/punctuation would otherwise reach the DB (and the public URL) as-is.
        // slugLocked events always use the original slug, ignoring form state, so
        // a locked (disabled) field can never reach the DB as a changed value.
        if (existingId) {
            if (slugLocked) return { id: existingId, slug: event?.slug || '' }
            return { id: existingId, slug: toSlug(slug || event?.slug || '') || event?.slug || '' }
        }

        const baseSlug = toSlug(slug) || toSlug(title) || `event-${Date.now()}`
        let candidate = baseSlug
        for (let attempt = 0; attempt < 3; attempt++) {
            const { data, error } = await supabase
                .from('events')
                .insert({ organiser_id: organiserId, ...buildEventPayload(candidate), status: 'draft' })
                .select('id')
                .single()

            if (data && !error) {
                createdEventIdRef.current = data.id
                if (candidate !== slug) setSlug(candidate)
                return { id: data.id, slug: candidate }
            }
            if (error?.code === '23505') {
                candidate = `${baseSlug}-${randomSlugSuffix()}`
                continue
            }
            console.error('Create event error:', error)
            setSaveError(friendlyDbError(error, 'Saving your draft'))
            return null
        }
        setSaveError('Saving failed: could not find an available slug. Set a custom Event Slug in section 02 and try again.')
        return null
    }

    // Returns a failure message per ticket that could not be saved (empty = all good)
    async function saveTicketTypes(eventId: string): Promise<string[]> {
        const supabase = createClient()
        const failures: string[] = []
        for (let i = 0; i < tickets.length; i++) {
            const tt = tickets[i]
            if (tt.id) {
                // .select() so an RLS-filtered update (0 rows, no error) is detectable
                const { data, error } = await supabase.from('ticket_types')
                    .update(buildTicketPayload(tt, i)).eq('id', tt.id).select('id')
                if (error) failures.push(`"${tt.name}": ${error.message}`)
                else if (!data || data.length === 0) failures.push(`"${tt.name}": no permission to update`)
            } else {
                const { data: newTt, error } = await supabase.from('ticket_types')
                    .insert({ event_id: eventId, ...buildTicketPayload(tt, i) })
                    .select('id').single()
                if (error) failures.push(`"${tt.name}": ${error.message}`)
                else if (newTt) setTickets(prev => prev.map((t, idx) => idx === i ? { ...t, id: newTt.id } : t))
            }
        }
        return failures
    }

    async function saveDraft() {
        setSaving(true)
        setSaveError('')
        const supabase = createClient()
        const created = await getOrCreateEventId()
        if (!created) { setSaving(false); return }

        let effectiveSlug = toSlug(created.slug) || toSlug(title) || `event-${Date.now()}`
        // .select() so an RLS-filtered update (0 rows, no error) is detectable
        let { data: updated, error: updateError } = await supabase.from('events')
            .update(buildEventPayload(effectiveSlug)).eq('id', created.id).select('id')
        if (updateError?.code === '23505') {
            effectiveSlug = `${effectiveSlug}-${randomSlugSuffix()}`
            const retry = await supabase.from('events')
                .update(buildEventPayload(effectiveSlug)).eq('id', created.id).select('id')
            updated = retry.data
            updateError = retry.error
        }
        if (updateError || !updated || updated.length === 0) {
            console.error('Save draft error:', updateError)
            setSaveError(updateError ? friendlyDbError(updateError, 'Saving your draft') : PERMISSION_MSG)
            setSaving(false)
            return
        }
        if (effectiveSlug !== slug) setSlug(effectiveSlug)

        const ticketFailures = await saveTicketTypes(created.id)
        setSaving(false)
        if (ticketFailures.length) {
            setSaveError(`Event details saved, but some tickets failed — ${ticketFailures.join('; ')}`)
            return
        }

        setSaved(true)
        setTimeout(() => setSaved(false), 2000)

        // Navigate to edit page if just created
        if (!event?.id) router.replace(`/organiser/events/${created.id}/edit`)
    }

    // Check-in close must be after check-in open — a close time before open
    // means the door scanner rejects every ticket for the entire event
    // (compares fine as plain strings: both are "YYYY-MM-DDTHH:mm").
    const checkinTimesInvalid = !!checkinStartAt && !!checkinEndAt && checkinEndAt <= checkinStartAt

    function validate() {
        const errs: string[] = []
        if (!title.trim()) errs.push('Event title is required')
        if (!category) errs.push('Category is required')
        if (!startAt) errs.push('Start date & time is required')
        if (!endAt) errs.push('End date & time is required')
        if (!venueName.trim()) errs.push('Venue name is required')
        if (!venueCity.trim()) errs.push('City is required')
        if (!venuePostcode.trim()) errs.push('Postcode is required')
        if (tickets.length === 0 && ticketAvailability !== 'coming_soon') errs.push('At least one ticket type is required')
        if (checkinTimesInvalid) errs.push('Check-in closing time must be after the check-in opening time')
        return errs
    }

    async function handlePublish() {
        const errs = validate()
        if (errs.length) { setErrors(errs); return }
        setErrors([])
        setSaveError('')
        setPublishing(true)
        const supabase = createClient()
        const created = await getOrCreateEventId()
        if (!created) {
            setErrors(['Could not save the event — see the message in the top-right corner.'])
            setPublishing(false)
            return
        }

        // Save tickets BEFORE flipping the event live, so an event is never
        // published while its ticket types failed to save.
        const ticketFailures = await saveTicketTypes(created.id)
        if (ticketFailures.length) {
            setErrors(ticketFailures.map(f => `Ticket ${f}`))
            setPublishing(false)
            return
        }

        let effectiveSlug = toSlug(created.slug) || toSlug(title) || `event-${Date.now()}`
        // .select() so an RLS-filtered update (0 rows, no error) is detectable
        let { data: updated, error: updateError } = await supabase.from('events')
            .update({ ...buildEventPayload(effectiveSlug), status: 'published' })
            .eq('id', created.id).select('id')
        if (updateError?.code === '23505') {
            effectiveSlug = `${effectiveSlug}-${randomSlugSuffix()}`
            const retry = await supabase.from('events')
                .update({ ...buildEventPayload(effectiveSlug), status: 'published' })
                .eq('id', created.id).select('id')
            updated = retry.data
            updateError = retry.error
        }
        if (updateError || !updated || updated.length === 0) {
            console.error('Publish error:', updateError)
            setErrors([updateError ? friendlyDbError(updateError, 'Publishing') : PERMISSION_MSG])
            setPublishing(false)
            return
        }
        if (effectiveSlug !== slug) setSlug(effectiveSlug)

        setPublishing(false)

        // Fire-and-forget the "your event is live" notification + email.
        // The API is idempotent (uses events.published_email_sent_at), so
        // republishes won't double-send.
        void fetch(`/api/organiser/events/${created.id}/notify-published`, { method: 'POST' })
            .catch(err => console.error('publish notify failed:', err))

        router.push('/organiser/events')
    }

    async function uploadBanner(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setBannerError('')
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setBannerError('Only JPG, PNG or WEBP files are allowed'); return }

        setBannerUploading(true)
        const supabase = createClient()
        let blob: Blob
        try { blob = await compressImage(file, 1600) } catch { blob = file }
        const path = `organisers/${organiserId}/${Date.now()}.webp`
        const { error } = await supabase.storage.from('event-banners').upload(path, blob, { contentType: 'image/webp' })
        if (error) {
            setBannerError(error.message)
        } else {
            const { data } = supabase.storage.from('event-banners').getPublicUrl(path)
            setBannerImages(prev => [...prev, data.publicUrl])
        }
        setBannerUploading(false)
    }

    function addTicketFromPreset(name: string, description: string, is_group?: boolean) {
        setTickets(prev => [...prev, {
            ...defaultTicket,
            name,
            description,
            priceStr: '',
            price_pence: 0,
            qtyStr: '',
            quantity_total: 0,
            sort_order: prev.length,
            ...(is_group ? { is_group: true, group_size: 2 } : {}),
        }])
    }

    function updateTicket(i: number, updates: Partial<TicketTypeRow>) {
        setTickets(prev => prev.map((t, idx) => idx === i ? { ...t, ...updates } : t))
    }

    async function removeTicket(i: number) {
        const tt = tickets[i]
        if (tt.id) {
            const supabase = createClient()
            await supabase.from('ticket_types').delete().eq('id', tt.id)
        }
        setTickets(prev => prev.filter((_, idx) => idx !== i))
    }

    function moveTicket(i: number, dir: -1 | 1) {
        setTickets(prev => {
            const arr = [...prev]
            const j = i + dir
            if (j < 0 || j >= arr.length) return arr
                ;[arr[i], arr[j]] = [arr[j], arr[i]]
            return arr
        })
    }


    async function lookupPostcode() {
        const pc = venuePostcode.trim()
        if (pc.length < 5) return
        setPostcodeStatus('loading')
        setPostcodeMsg('Looking up postcode...')
        try {
            const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`)
            const json = await res.json()
            if (json.status === 200 && json.result) {
                const town = json.result.admin_district || json.result.parish || ''
                if (town) setVenueCity(town)
                if (!venueAddress.trim()) setVenueAddress('')
                if (json.result.latitude) setVenueLat(json.result.latitude)
                if (json.result.longitude) setVenueLng(json.result.longitude)
                setPostcodeStatus('success')
                setPostcodeMsg(`✓ Postcode found: ${town}`)
                setTimeout(() => { setPostcodeStatus('idle'); setPostcodeMsg('') }, 3000)
            } else {
                setPostcodeStatus('error')
                setPostcodeMsg('Postcode not found — please enter manually')
            }
        } catch {
            setPostcodeStatus('error')
            setPostcodeMsg('Postcode not found — please enter manually')
        }
    }

    const inputClass = 'w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25'
    const ticketInput = 'w-full bg-card border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25'
    const labelClass = 'text-xs text-muted block mb-1.5'
    const cardClass = 'bg-card rounded-2xl shadow-card p-6 mb-6'

    return (
        <div>
            {/* Save indicator */}
            <div className="fixed top-4 right-4 z-40 flex flex-col gap-2 items-end">
                {saved && <span className="text-warm-green text-xs font-semibold bg-card shadow-hover rounded-xl px-3 py-2">Saved ✓</span>}
                {saving && <span className="text-muted text-xs bg-card shadow-hover rounded-xl px-3 py-2">Saving...</span>}
                {saveError && !saving && (
                    <span className="text-warm-red text-xs bg-card shadow-hover border border-warm-red/30 rounded-xl px-3 py-2 max-w-sm text-right">
                        {saveError}
                    </span>
                )}
            </div>

            {/* Section 01 — Basic Info */}
            <div className={cardClass}>
                <SectionTitle num="01" title="BASIC INFO" badge="bg-accent text-white" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <label className={labelClass}>Event Title *</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} className={inputClass} placeholder="Your event name" required />
                        <p className="text-xs text-muted mt-1 text-right">{title.length}/100</p>
                    </div>
                    <div>
                        <label className={labelClass}>Category *</label>
                        <ThemedSelect value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
                            <option value="">Select category...</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </ThemedSelect>
                    </div>
                    <div>
                        <label className={labelClass}>Tags (comma-separated)</label>
                        <input type="text" value={tags} onChange={e => setTags(e.target.value)} className={inputClass} placeholder="e.g. live music, outdoor, family" />
                        {tags && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                                    <span key={tag} className="text-xs bg-background border border-border px-2 py-0.5 rounded-full text-muted">{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="sm:col-span-2">
                        <label className={labelClass}>Description</label>
                        {typeof window !== 'undefined' && (
                            <div className="rounded-xl overflow-hidden">
                                <RichTextEditor content={description} onChange={setDescription} />
                            </div>
                        )}
                    </div>
                    <div className="sm:col-span-2">
                        <label className={labelClass}>Banner Images <span className="text-muted font-normal">(up to 4)</span></label>
                        {bannerImages.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {bannerImages.map((url, i) => (
                                    <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
                                        <Image src={url} alt={`Banner ${i + 1}`} fill sizes="80px" className="object-cover" />
                                        {i === 0 && (
                                            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">MAIN</span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setBannerImages(prev => prev.filter((_, idx) => idx !== i))}
                                            className="absolute top-1 right-1 bg-black/55 rounded-full w-[18px] h-[18px] flex items-center justify-center text-white text-[11px] leading-none"
                                            aria-label="Remove image"
                                        >×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {bannerImages.length < 4 && (
                            <label className="block w-full border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-warm-red/50 transition-colors">
                                <p className="text-sm text-muted">{bannerUploading ? 'Uploading...' : bannerImages.length === 0 ? 'Click to upload or drag images here' : `Click to upload image ${bannerImages.length + 1} of 4`}</p>
                                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadBanner} className="hidden" disabled={bannerUploading} />
                            </label>
                        )}
                        {bannerError && <p className="text-warm-red text-xs mt-1">{bannerError}</p>}
                        <p className="text-xs text-muted mt-1.5">Portrait format 800×1200px (2:3 ratio). Max 5MB each. JPG, PNG or WebP. First image is the main banner.</p>
                    </div>
                    <div className="sm:col-span-2">
                        <label className={labelClass}>Promo Video (YouTube URL)</label>
                        <input
                            type="text"
                            value={youtubeUrl}
                            onChange={e => setYoutubeUrl(e.target.value)}
                            className={inputClass}
                            placeholder="https://www.youtube.com/watch?v=..."
                        />
                        <p className="text-xs text-muted mt-1.5">Paste a YouTube link to show a promo video on your event page.</p>
                    </div>
                </div>
            </div>

            {/* Section 02 — Date & Location */}
            <div className={cardClass}>
                <SectionTitle num="02" title="DATE & LOCATION" badge="bg-warm-orange text-white" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Start Date &amp; Time *</label>
                        <DateTimePicker value={startAt} onChange={setStartAt} min={new Date().toISOString().slice(0, 16)} placeholder="Select start date & time" required className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>End Date &amp; Time *</label>
                        <DateTimePicker value={endAt} onChange={setEndAt} min={startAt || new Date().toISOString().slice(0, 16)} placeholder="Select end date & time" required className={inputClass} />
                        <p className="text-xs text-muted mt-1">All times are UK time (Europe/London).</p>
                    </div>
                    <div>
                        <label className={labelClass}>Check-in Opens</label>
                        <DateTimePicker value={checkinStartAt} onChange={setCheckinStartAt} placeholder="Select check-in open time" className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Check-in Closes</label>
                        <DateTimePicker value={checkinEndAt} onChange={setCheckinEndAt} min={checkinStartAt || undefined} placeholder="Select check-in close time" className={inputClass} />
                        {checkinTimesInvalid && (
                            <p className="text-warm-red text-xs mt-1">Check-in closing time must be after the check-in opening time — otherwise the door scanner will reject every ticket.</p>
                        )}
                    </div>
                    <div>
                        <label className={labelClass}>Venue Name *</label>
                        <input type="text" value={venueName} onChange={e => setVenueName(e.target.value)} className={inputClass} placeholder="e.g. The O2 Arena" required />
                    </div>
                    <div>
                        <label className={labelClass}>City *</label>
                        <input
                            type="text"
                            value={venueCity}
                            onChange={e => setVenueCity(e.target.value)}
                            placeholder="e.g. Manchester"
                            list="uk-cities"
                            className={inputClass}
                            required
                        />
                        <datalist id="uk-cities">
                            {UK_CITIES.map(c => <option key={c} value={c} />)}
                        </datalist>
                    </div>
                    <div className="sm:col-span-2">
                        <label className={labelClass}>Address Line 1</label>
                        <input type="text" value={venueAddress} onChange={e => setVenueAddress(e.target.value)} className={inputClass} placeholder="Street address" />
                    </div>
                    <div>
                        <label className={labelClass}>Postcode *</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={venuePostcode}
                                onChange={e => setVenuePostcode(e.target.value.toUpperCase())}
                                onBlur={lookupPostcode}
                                className={inputClass}
                                placeholder="SW1A 1AA"
                                required
                            />
                            <button
                                type="button"
                                onClick={lookupPostcode}
                                className="shrink-0 whitespace-nowrap bg-card border border-border rounded-xl px-3 py-2.5 text-xs font-medium text-muted hover:text-text hover:border-warm-red transition-colors"
                            >
                                Look Up
                            </button>
                        </div>
                        {postcodeMsg && (
                            <p className={`text-xs mt-1 ${postcodeStatus === 'success' ? 'text-warm-green' : postcodeStatus === 'error' ? 'text-warm-red' : 'text-muted'}`}>{postcodeMsg}</p>
                        )}
                    </div>
                    <div>
                        <label className={labelClass}>Event Slug</label>
                        <input
                            type="text"
                            value={slug}
                            onChange={e => setSlug(e.target.value)}
                            onBlur={e => setSlug(toSlug(e.target.value))}
                            className={slugLocked ? `${inputClass} opacity-60 cursor-not-allowed` : inputClass}
                            placeholder="your-event-slug"
                            disabled={slugLocked}
                            readOnly={slugLocked}
                        />
                        {slugLocked && (
                            <p className="text-muted text-xs mt-1">
                                Locked once published — changing it would break any links already shared. Contact support if you need it changed.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Section 03 — Ticket Types */}
            <div className={cardClass}>
                <div className="flex items-center justify-between mb-5">
                    <SectionTitle num="03" title="TICKET TYPES" badge="bg-warm-yellow text-text" inline />
                    <button type="button" onClick={() => setShowTicketPresetModal(true)} className="text-xs text-accent font-semibold hover:underline">+ Add Ticket Type</button>
                </div>
                {tickets.length === 0 && (
                    <p className="text-sm text-muted text-center py-6">No ticket types yet. Add one to start selling.</p>
                )}
                {tickets.map((tt, i) => (
                    <div key={i} className="bg-background rounded-xl p-4 mb-3 last:mb-0">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-muted">Ticket {i + 1}{tt.is_group ? ' · Group' : ''}</span>
                            <div className="flex gap-3 text-xs">
                                {i > 0 && <button type="button" onClick={() => moveTicket(i, -1)} aria-label="Move up" className="text-muted hover:text-text">↑</button>}
                                {i < tickets.length - 1 && <button type="button" onClick={() => moveTicket(i, 1)} aria-label="Move down" className="text-muted hover:text-text">↓</button>}
                                <button type="button" onClick={() => removeTicket(i)} className="text-accent font-medium hover:underline">Remove</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-2">
                                <label className={labelClass}>Name</label>
                                <input type="text" value={tt.name} onChange={e => updateTicket(i, { name: e.target.value })} className={ticketInput} />
                            </div>
                            <div>
                                <label className={labelClass}>Price (£)</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    pattern="[0-9]*\.?[0-9]{0,2}"
                                    value={tt.priceStr}
                                    onChange={e => updateTicket(i, { priceStr: e.target.value, price_pence: priceToPence(e.target.value) })}
                                    className={ticketInput}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Total Quantity</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={tt.qtyStr}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '')
                                        updateTicket(i, { qtyStr: val, quantity_total: parseInt(val) || 1 })
                                    }}
                                    placeholder="e.g. 200"
                                    className={ticketInput}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
                            <div className="sm:col-span-2">
                                <label className={labelClass}>Description (optional)</label>
                                <input type="text" value={tt.description} onChange={e => updateTicket(i, { description: e.target.value })} className={ticketInput} />
                            </div>
                            <div>
                                <label className={labelClass}>Max per Order</label>
                                <input type="number" min="1" max="100" value={tt.max_per_order} onChange={e => updateTicket(i, { max_per_order: parseInt(e.target.value) || 10 })} className={ticketInput} />
                            </div>
                            <div className="flex items-center justify-between sm:justify-start sm:gap-3 pt-5">
                                <span className="text-sm">Visible</span>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={tt.is_visible}
                                    aria-label="Ticket visible"
                                    onClick={() => updateTicket(i, { is_visible: !tt.is_visible })}
                                    className={`w-10 h-6 rounded-full relative transition-colors ${tt.is_visible ? 'bg-accent' : 'bg-border'}`}
                                >
                                    <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${tt.is_visible ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                        {/* Group size (shown only for group tickets) */}
                        {tt.is_group && (
                            <div className="border-t border-border mt-3 pt-3">
                                <label className={labelClass}>Group Size</label>
                                <p className="text-xs text-muted mb-1.5">Each purchase generates one QR code per person in the group</p>
                                <input
                                    type="number"
                                    min={2}
                                    max={50}
                                    value={tt.group_size}
                                    onChange={e => updateTicket(i, { group_size: Math.min(50, Math.max(2, parseInt(e.target.value) || 2)) })}
                                    className={`${ticketInput} sm:w-40`}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Section 04 — Additional Settings */}
            <div className="bg-card rounded-2xl shadow-card p-6 mb-8">
                <SectionTitle num="04" title="ADDITIONAL SETTINGS" badge="bg-warm-green text-white" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Minimum Age</label>
                        <ThemedSelect value={minAge} onChange={e => setMinAge(parseInt(e.target.value))} className={inputClass}>
                            <option value={0}>No restriction</option>
                            <option value={16}>16+</option>
                            <option value={18}>18+</option>
                        </ThemedSelect>
                    </div>
                    <div>
                        <label className={labelClass}>Ticket Availability</label>
                        <ThemedSelect value={ticketAvailability} onChange={e => setTicketAvailability(e.target.value as 'on_sale' | 'coming_soon')} className={inputClass}>
                            <option value="on_sale">On Sale — tickets available now</option>
                            <option value="coming_soon">Coming Soon — tickets not yet released</option>
                        </ThemedSelect>
                    </div>
                    <div className="sm:col-span-2">
                        <label className={labelClass}>Refund Policy</label>
                        <ThemedSelect value={refundPolicy} onChange={e => setRefundPolicy(e.target.value)} className={inputClass}>
                            {REFUND_POLICIES.map(p => <option key={p} value={p}>{p}</option>)}
                        </ThemedSelect>
                    </div>
                </div>
                <p className="text-xs text-muted mt-3">
                    Choose &ldquo;Coming Soon&rdquo; if you haven&apos;t added tickets yet. Visitors will see &ldquo;Tickets Coming Soon&rdquo; instead of &ldquo;Sold Out&rdquo;.
                </p>
            </div>

            {/* Stripe not connected — blocks publish, drafts still allowed (only shown when the page passes stripeReady={false}) */}
            {!stripeReady && (
                <div className="flex items-start gap-3 bg-warm-yellow/10 rounded-xl p-4 mb-4">
                    <span className="w-9 h-9 rounded-lg bg-warm-yellow/20 flex items-center justify-center text-warm-yellowText shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                    </span>
                    <div>
                        <p className="text-sm font-medium">Connect Stripe to publish and start selling tickets.</p>
                        <p className="text-xs text-muted mt-1">You can still save this event as a draft. Publishing (and ticket sales) unlocks once Stripe Connect is set up.</p>
                    </div>
                </div>
            )}

            {/* Action bar */}
            {event?.slug && (
                <div className="mb-4 text-right">
                    <a href={`/events/${event.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:text-text transition-colors">
                        Preview event →
                    </a>
                </div>
            )}
            {errors.length > 0 && (
                <div className="mb-4 bg-warm-red/10 rounded-xl p-4">
                    <p className="text-warm-red text-sm font-medium mb-2">Please fix the following:</p>
                    <ul className="list-disc list-inside space-y-1">
                        {errors.map(e => <li key={e} className="text-warm-red text-xs">{e}</li>)}
                    </ul>
                </div>
            )}
            <div className="flex items-center justify-end gap-3">
                <button
                    type="button"
                    onClick={saveDraft}
                    disabled={saving}
                    className="bg-card border border-border px-5 py-3 rounded-xl text-sm font-semibold hover:bg-background transition-colors disabled:opacity-60"
                >
                    {saving ? 'Saving...' : 'Save as Draft'}
                </button>
                {stripeReady ? (
                    <button
                        type="button"
                        onClick={handlePublish}
                        disabled={publishing}
                        className="bg-accent text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all disabled:opacity-70"
                    >
                        {publishing ? 'Publishing...' : 'Publish Event'}
                    </button>
                ) : (
                    <a
                        href="/organiser/settings"
                        title="Connect Stripe to publish"
                        className="bg-background text-muted border border-border px-5 py-3 rounded-xl text-sm font-semibold"
                    >
                        Publish Event (Connect Stripe first)
                    </a>
                )}
            </div>

            {/* Ticket type preset modal */}
            {showTicketPresetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div onClick={() => setShowTicketPresetModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative bg-card rounded-2xl shadow-hover p-6 w-full max-w-lg">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-heading text-2xl tracking-wide">CHOOSE TICKET TYPE</h3>
                            <button
                                type="button"
                                onClick={() => setShowTicketPresetModal(false)}
                                aria-label="Close"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-background hover:text-text transition-colors"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[
                                { name: 'General Admission', description: 'Standard entry to the event', icon: '🎟️' },
                                { name: 'VIP', description: 'Premium experience with exclusive access', icon: '⭐' },
                                { name: 'Early Bird', description: 'Limited early release at a special price', icon: '🐦' },
                                { name: 'Student', description: 'Discounted — valid student ID required', icon: '🎓' },
                                { name: 'Group Ticket', description: 'Entry for a group of people', icon: '👥' },
                                { name: 'Under 18', description: 'For attendees aged 17 and under', icon: '🧒' },
                                { name: 'Backstage Pass', description: 'Full access including backstage areas', icon: '🎭' },
                                { name: 'Custom', description: 'Build your own ticket type from scratch', icon: '✏️' },
                            ].map(preset => (
                                <button
                                    key={preset.name}
                                    type="button"
                                    onClick={() => {
                                        setShowTicketPresetModal(false)
                                        addTicketFromPreset(
                                            preset.name === 'Custom' ? '' : preset.name,
                                            preset.name === 'Custom' ? '' : preset.description,
                                            preset.name === 'Group Ticket' ? true : undefined,
                                        )
                                    }}
                                    className="bg-card border border-border rounded-xl p-4 text-center hover:border-warm-red hover:shadow-soft transition-all"
                                >
                                    <div className="text-2xl mb-2">{preset.icon}</div>
                                    <div className="font-bold text-sm mb-1">{preset.name}</div>
                                    <div className="text-xs text-muted line-clamp-2">{preset.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
