'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compress-image'
import { Button } from '@/components/ui/Button'
import { calculateBookingFeePerTicket, formatPence } from '@/lib/fees'
import { useFeeConfig } from '@/lib/use-fee-config'
import type { Event, TicketType } from '@/types'
import dynamic from 'next/dynamic'
import { CATEGORIES } from '@/lib/config/categories'
import { DateTimePicker } from '@/components/organiser/DateTimePicker'
import { GuestListSection } from '@/components/organiser/GuestListSection'

const RichTextEditor = dynamic(
    () => import('@/components/organiser/RichTextEditor').then(m => m.RichTextEditor),
    { ssr: false, loading: () => <div className="h-48 bg-surface border border-border animate-pulse" /> }
)
const UK_CITIES = ['London', 'Manchester', 'Birmingham', 'Glasgow', 'Edinburgh', 'Leeds', 'Bristol', 'Liverpool', 'Newcastle', 'Cardiff', 'Sheffield', 'Nottingham']
const REFUND_POLICIES = [
    'No refunds',
    'Refunds up to 48 hours before event',
    'Refunds up to 7 days before event',
    'Full refunds always available',
]

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

export function EventForm({ organiserId, event, ticketTypes: initTickets }: EventFormProps) {
    const router = useRouter()
    const feeConfig = useFeeConfig()
    const isEdit = !!event

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
    const [status, setStatus] = useState<'draft' | 'published'>(event?.status === 'published' ? 'published' : 'draft')
    const [ticketAvailability, setTicketAvailability] = useState<'on_sale' | 'coming_soon'>(event?.ticket_availability || 'on_sale')

    const [showTicketPresetModal, setShowTicketPresetModal] = useState(false)

    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [errors, setErrors] = useState<string[]>([])
    const [publishing, setPublishing] = useState(false)
    const [openSections, setOpenSections] = useState<Set<number>>(new Set())
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
    }, [event?.id])

    // Auto-save every 30 seconds
    useEffect(() => {
        autoSaveRef.current = setInterval(() => {
            if (title) saveDraft()
        }, 30000)
        return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current) }
    }, [title, description, tickets, status])

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
        if (existingId) return { id: existingId, slug: slug || event?.slug || '' }

        const baseSlug = slug || toSlug(title) || `event-${Date.now()}`
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

        let effectiveSlug = created.slug || toSlug(title) || `event-${Date.now()}`
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
        if (!event?.id) router.replace(`/organiser/events/${created.id}`)
    }

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
        return errs
    }

    function toggleSection(n: number) {
        setOpenSections(prev => {
            const next = new Set(prev)
            if (next.has(n)) { next.delete(n) } else { next.add(n) }
            return next
        })
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

        let effectiveSlug = created.slug || toSlug(title) || `event-${Date.now()}`
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

        setStatus('published')
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

    const inputClass = "w-full bg-surface border border-border rounded-none px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
    const labelClass = "text-xs text-muted block mb-1.5"

    function SectionHeader({ num, title: sTitle, open, onToggle }: { num: string; title: string; open: boolean; onToggle: () => void }) {
        return (
            <button type="button" onClick={onToggle} className="w-full flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                    <span className="font-mono text-accent text-sm">{num}</span>
                    <h2 className="font-heading text-xl text-text tracking-wide">{sTitle}</h2>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>
        )
    }

    return (
        <div>
            {/* Save indicator */}
            <div className="fixed top-4 right-4 z-40 flex flex-col gap-2 items-end">
                {saved && <span className="text-success text-xs bg-success/10 border border-success/20 px-3 py-1.5 rounded-full">Saved ✓</span>}
                {saving && <span className="text-muted text-xs">Saving...</span>}
                {saveError && !saving && (
                    <span className="text-accent text-xs border border-accent/40 px-3 py-1.5 rounded max-w-sm text-right" style={{ background: '#FFF5F6' }}>
                        {saveError}
                    </span>
                )}
            </div>

            {/* Section 1 — Basic Info */}
            <div style={{ background: '#FFFFFF', border: '1px solid #C0C0C8', borderRadius: 2, padding: '0 28px', marginBottom: 16 }}>
                <SectionHeader num="01" title="Basic Info" open={openSections.has(1)} onToggle={() => toggleSection(1)} />
                {openSections.has(1) && (
                    <div className="pb-6">
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Event Title *</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} className={inputClass} placeholder="Your event name" required />
                                <p className="text-xs text-muted mt-1 text-right">{title.length}/100</p>
                            </div>
                            <div>
                                <label className={labelClass}>Category *</label>
                                <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
                                    <option value="">Select category...</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Tags (comma-separated)</label>
                                <input type="text" value={tags} onChange={e => setTags(e.target.value)} className={inputClass} placeholder="e.g. live music, outdoor, family" />
                                {tags && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                                            <span key={tag} className="text-xs bg-surface border border-border px-2 py-0.5 rounded-full text-muted">{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className={labelClass}>Description</label>
                                {typeof window !== 'undefined' && (
                                    <RichTextEditor content={description} onChange={setDescription} />
                                )}
                            </div>
                            <div>
                                <label className={labelClass}>Banner Images <span style={{ fontWeight: 400, color: '#666677' }}>(up to 4)</span></label>
                                {bannerImages.length > 0 && (
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                        {bannerImages.map((url, i) => (
                                            <div key={url} style={{ position: 'relative', width: '80px', height: '80px' }}>
                                                <img src={url} alt={`Banner ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '2px', border: '1px solid #E0E0E8' }} />
                                                {i === 0 && (
                                                    <span style={{ position: 'absolute', bottom: '3px', left: '3px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '9px', padding: '1px 4px', borderRadius: '3px' }}>MAIN</span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setBannerImages(prev => prev.filter((_, idx) => idx !== i))}
                                                    style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', lineHeight: 1 }}
                                                    aria-label="Remove image"
                                                >×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {bannerImages.length < 4 && (
                                    <label className="block w-full border-2 border-dashed border-border p-8 text-center cursor-pointer hover:border-accent/50 transition-colors">
                                        <p className="text-muted text-sm">{bannerUploading ? 'Uploading...' : `Click to upload image ${bannerImages.length + 1} of 4`}</p>
                                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadBanner} className="hidden" disabled={bannerUploading} />
                                    </label>
                                )}
                                {bannerError && <p className="text-accent text-xs mt-1">{bannerError}</p>}
                                <p className="text-xs mt-1" style={{ color: '#666677' }}>Portrait format 800×1200px (2:3 ratio). Max 5MB each. JPG, PNG or WebP. First image is the main banner.</p>
                            </div>
                            <div>
                                <label className={labelClass}>Promo Video (YouTube URL)</label>
                                <input
                                    type="text"
                                    value={youtubeUrl}
                                    onChange={e => setYoutubeUrl(e.target.value)}
                                    className={inputClass}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                />
                                <p className="text-xs mt-1" style={{ color: '#666677' }}>Paste a YouTube link to show a promo video on your event page.</p>
                            </div>
                        </div>
                        <div className="flex justify-end mt-4">
                            <button type="button" onClick={saveDraft} disabled={saving}
                                style={{ background: '#0A0A0F', border: 'none', color: '#FFFFFF', padding: '8px 20px', borderRadius: 2, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, opacity: saving ? 0.6 : 1 }}
                                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#333333' }}
                                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#0A0A0F' }}
                            >{saving ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Section 2 — Date & Venue */}
            <div style={{ background: '#FFFFFF', border: '1px solid #C0C0C8', borderRadius: 2, padding: '0 28px', marginBottom: 16 }}>
                <SectionHeader num="02" title="Date & Venue" open={openSections.has(2)} onToggle={() => toggleSection(2)} />
                {openSections.has(2) && (
                    <div className="pb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Start Date & Time *</label>
                                <DateTimePicker value={startAt} onChange={setStartAt} min={new Date().toISOString().slice(0, 16)} placeholder="Select start date & time" required className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>End Date & Time *</label>
                                <DateTimePicker value={endAt} onChange={setEndAt} min={startAt || new Date().toISOString().slice(0, 16)} placeholder="Select end date & time" required className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Check-in Opens</label>
                                <DateTimePicker value={checkinStartAt} onChange={setCheckinStartAt} placeholder="Select check-in open time" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Check-in Closes</label>
                                <DateTimePicker value={checkinEndAt} onChange={setCheckinEndAt} placeholder="Select check-in close time" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Timezone</label>
                                <input type="text" value="Europe/London (UK Time)" readOnly className={`${inputClass} opacity-60`} />
                            </div>
                            <div>
                                <label className={labelClass}>Event Slug</label>
                                <input type="text" value={slug} onChange={e => setSlug(e.target.value)} className={inputClass} placeholder="your-event-slug" />
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                                <label className={labelClass}>Venue Name *</label>
                                <input type="text" value={venueName} onChange={e => setVenueName(e.target.value)} className={inputClass} placeholder="e.g. The O2 Arena" required />
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                                <label className={labelClass}>Address Line 1</label>
                                <input type="text" value={venueAddress} onChange={e => setVenueAddress(e.target.value)} className={inputClass} placeholder="Street address" />
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
                            <div>
                                <label className={labelClass}>Postcode *</label>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
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
                                        style={{
                                            border: '1px solid #C0C0C8',
                                            color: '#666677',
                                            padding: '4px 10px',
                                            fontSize: 12,
                                            borderRadius: 2,
                                            marginLeft: 8,
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.borderColor = '#E63950')}
                                        onMouseLeave={e => (e.currentTarget.style.borderColor = '#C0C0C8')}
                                    >
                                        Look Up
                                    </button>
                                </div>
                                {postcodeMsg && (
                                    <p style={{
                                        fontSize: 12,
                                        marginTop: 4,
                                        color: postcodeStatus === 'success' ? '#00C48A' : postcodeStatus === 'error' ? '#E63950' : '#666677',
                                    }}>{postcodeMsg}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end mt-4">
                            <button type="button" onClick={saveDraft} disabled={saving}
                                style={{ background: '#0A0A0F', border: 'none', color: '#FFFFFF', padding: '8px 20px', borderRadius: 2, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, opacity: saving ? 0.6 : 1 }}
                                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#333333' }}
                                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#0A0A0F' }}
                            >{saving ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Section 3 — Ticket Types */}
            <div style={{ background: '#FFFFFF', border: '1px solid #C0C0C8', borderRadius: 2, padding: '0 28px', marginBottom: 16 }}>
                <SectionHeader num="03" title="Ticket Types" open={openSections.has(3)} onToggle={() => toggleSection(3)} />
                {openSections.has(3) && (
                    <div className="pb-6">
                        <div className="space-y-4">
                            {tickets.map((tt, i) => (
                                <div key={i} className="bg-surface border border-border p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs text-muted font-mono">Ticket {i + 1}</span>
                                        <div className="flex gap-2">
                                            {i > 0 && <button type="button" onClick={() => moveTicket(i, -1)} className="text-xs text-muted hover:text-text">↑</button>}
                                            {i < tickets.length - 1 && <button type="button" onClick={() => moveTicket(i, 1)} className="text-xs text-muted hover:text-text">↓</button>}
                                            <button type="button" onClick={() => removeTicket(i)} className="text-xs text-accent hover:underline">Remove</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass}>Name</label>
                                            <input type="text" value={tt.name} onChange={e => updateTicket(i, { name: e.target.value })} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Price (£)</label>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                pattern="[0-9]*\.?[0-9]{0,2}"
                                                value={tt.priceStr}
                                                onChange={e => updateTicket(i, { priceStr: e.target.value, price_pence: priceToPence(e.target.value) })}
                                                className={inputClass}
                                            />
                                            <p className="text-xs text-muted mt-1">
                                                Buyer pays {formatPence(tt.price_pence + calculateBookingFeePerTicket(tt.price_pence, feeConfig))} (incl. {formatPence(calculateBookingFeePerTicket(tt.price_pence, feeConfig))} booking fee)
                                            </p>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Description (optional)</label>
                                            <input type="text" value={tt.description} onChange={e => updateTicket(i, { description: e.target.value })} className={inputClass} />
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
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Max per Order</label>
                                            <input type="number" min="1" max="100" value={tt.max_per_order} onChange={e => updateTicket(i, { max_per_order: parseInt(e.target.value) || 10 })} className={inputClass} />
                                        </div>
                                        <div className="flex items-center justify-between pt-4">
                                            <span className="text-sm text-text">Visible</span>
                                            <div onClick={() => updateTicket(i, { is_visible: !tt.is_visible })} className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${tt.is_visible ? 'bg-accent' : 'bg-border'}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${tt.is_visible ? 'translate-x-5' : 'translate-x-1'}`} />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Group size (shown only for group tickets) */}
                                    {tt.is_group && (
                                        <div className="border-t border-border mt-2 pt-3">
                                            <label className={labelClass}>Group Size</label>
                                            <p className="text-xs text-muted mb-1.5">Each purchase generates one QR code per person in the group</p>
                                            <input
                                                type="number"
                                                min={2}
                                                max={50}
                                                value={tt.group_size}
                                                onChange={e => updateTicket(i, { group_size: Math.min(50, Math.max(2, parseInt(e.target.value) || 2)) })}
                                                className={inputClass}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="md" onClick={() => setShowTicketPresetModal(true)}>+ Add Ticket Type</Button>
                        </div>
                        <div className="flex justify-end mt-4">
                            <button type="button" onClick={saveDraft} disabled={saving}
                                style={{ background: '#0A0A0F', border: 'none', color: '#FFFFFF', padding: '8px 20px', borderRadius: 2, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, opacity: saving ? 0.6 : 1 }}
                                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#333333' }}
                                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#0A0A0F' }}
                            >{saving ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Section 4 — Settings */}
            <div style={{ background: '#FFFFFF', border: '1px solid #C0C0C8', borderRadius: 2, padding: '0 28px', marginBottom: 16 }}>
                <SectionHeader num="04" title="Settings" open={openSections.has(4)} onToggle={() => toggleSection(4)} />
                {openSections.has(4) && (
                    <div className="pb-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Minimum Age</label>
                                <select value={minAge} onChange={e => setMinAge(parseInt(e.target.value))} className={inputClass}>
                                    <option value={0}>All ages</option>
                                    <option value={16}>16+</option>
                                    <option value={18}>18+</option>
                                </select>
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                                <label className={labelClass}>Refund Policy</label>
                                <select value={refundPolicy} onChange={e => setRefundPolicy(e.target.value)} className={inputClass}>
                                    {REFUND_POLICIES.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                                <label className={labelClass}>Event Visibility</label>
                                <select value={status} onChange={e => setStatus(e.target.value as 'draft' | 'published')} className={inputClass}>
                                    <option value="draft">Draft — not visible to public</option>
                                    <option value="published">Published — visible and bookable</option>
                                </select>
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                                <label className={labelClass}>Ticket Availability</label>
                                <select value={ticketAvailability} onChange={e => setTicketAvailability(e.target.value as 'on_sale' | 'coming_soon')} className={inputClass}>
                                    <option value="on_sale">On Sale — tickets available now</option>
                                    <option value="coming_soon">Coming Soon — tickets not yet released</option>
                                </select>
                                <p className="text-xs mt-1" style={{ color: '#666677' }}>
                                    Choose &ldquo;Coming Soon&rdquo; if you haven&apos;t added tickets yet. Visitors will see &ldquo;Tickets Coming Soon&rdquo; instead of &ldquo;Sold Out&rdquo;.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end mt-4">
                            <button type="button" onClick={saveDraft} disabled={saving}
                                style={{ background: '#0A0A0F', border: 'none', color: '#FFFFFF', padding: '8px 20px', borderRadius: 2, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, opacity: saving ? 0.6 : 1 }}
                                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#333333' }}
                                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#0A0A0F' }}
                            >{saving ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Section 5 — Guest List / Comp Tickets (only for existing events) */}
            {event?.id && (
                <div style={{ background: '#FFFFFF', border: '1px solid #C0C0C8', borderRadius: 2, padding: '0 28px', marginBottom: 16 }}>
                    <SectionHeader num="05" title="Guest List / Comp Tickets" open={openSections.has(5)} onToggle={() => toggleSection(5)} />
                    {openSections.has(5) && (
                        <div className="pb-6">
                            <GuestListSection
                                eventId={event.id}
                                ticketTypes={tickets.filter(t => t.id).map(t => ({ id: t.id!, name: t.name }))}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Action bar */}
            <div style={{ background: '#FFFFFF', border: '1px solid #C0C0C8', borderRadius: 2, padding: 28 }}>
                {event?.slug && (
                    <div className="mb-4">
                        <a href={`/events/${event.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:text-text transition-colors">
                            Preview event →
                        </a>
                    </div>
                )}
                {errors.length > 0 && (
                    <div className="mb-6 bg-accent/10 border border-accent/30 p-4">
                        <p className="text-accent text-sm font-medium mb-2">Please fix the following:</p>
                        <ul className="list-disc list-inside space-y-1">
                            {errors.map(e => <li key={e} className="text-accent text-xs">{e}</li>)}
                        </ul>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button
                        type="button"
                        onClick={saveDraft}
                        disabled={saving}
                        style={{ background: 'transparent', border: '1px solid #C0C0C8', color: '#666677', padding: '12px 24px', borderRadius: 2, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}
                        onMouseEnter={e => { if (!saving) { e.currentTarget.style.borderColor = '#0A0A0F'; e.currentTarget.style.color = '#0A0A0F' } }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#C0C0C8'; e.currentTarget.style.color = '#666677' }}
                    >{saving ? 'Saving...' : 'Save Draft'}</button>
                    <button
                        type="button"
                        onClick={handlePublish}
                        disabled={publishing}
                        style={{ background: '#0A0A0F', color: '#fff', padding: '12px 32px', borderRadius: 2, cursor: publishing ? 'not-allowed' : 'pointer', fontSize: 14, border: 'none', opacity: publishing ? 0.7 : 1 }}
                        onMouseEnter={e => { if (!publishing) e.currentTarget.style.background = '#333333' }}
                        onMouseLeave={e => { if (!publishing) e.currentTarget.style.background = '#0A0A0F' }}
                    >{publishing ? 'Publishing...' : 'Publish Event'}</button>
                </div>
            </div>

            {/* Ticket type preset modal */}
            {showTicketPresetModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div style={{ background: '#FFFFFF', border: '1px solid #C0C0C8', borderRadius: 2, padding: 24, width: '100%', maxWidth: 500 }}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 style={{ fontFamily: 'var(--font-bebas-neue, Bebas Neue, sans-serif)', fontSize: 20, color: '#0A0A0F', letterSpacing: '0.05em' }}>Choose Ticket Type</h3>
                            <button type="button" onClick={() => setShowTicketPresetModal(false)} className="text-muted hover:text-text text-lg leading-none">✕</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
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
                                    style={{
                                        background: '#FFFFFF',
                                        border: '1px solid #C0C0C8',
                                        borderRadius: 12,
                                        padding: 16,
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        transition: 'border-color 0.15s, background 0.15s',
                                    }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E63950' }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#C0C0C8' }}
                                >
                                    <div style={{ fontSize: 24, marginBottom: 8 }}>{preset.icon}</div>
                                    <div style={{ fontWeight: 700, color: '#0A0A0F', fontSize: 14, marginBottom: 4 }}>{preset.name}</div>
                                    <div style={{ color: '#666677', fontSize: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{preset.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
