'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { calculateBookingFeePerTicket, formatPence } from '@/lib/fees'
import type { Event, TicketType, PromoCode } from '@/types'
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(
    () => import('@/components/organiser/RichTextEditor').then(m => m.RichTextEditor),
    { ssr: false, loading: () => <div className="h-48 bg-surface border border-border rounded-lg animate-pulse" /> }
)

const CATEGORIES = ['Music', 'Sports', 'Comedy', 'Theatre', 'Festival', 'Corporate', 'Family', 'Culture', 'Other'] as const
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
    sort_order: number
    sale_starts_at: string
    sale_ends_at: string
    priceStr: string
    qtyStr: string
}

interface PromoCodeRow {
    id?: string
    code: string
    discount_type: 'percent' | 'fixed'
    discount_value: number
    min_order_pence: number
    max_uses: number | null
    valid_from: string
    valid_to: string
    uses_count: number
}

interface EventFormProps {
    organiserId: string
    event?: Event
    ticketTypes?: TicketType[]
    promoCodes?: PromoCode[]
}

function toDatetimeLocal(utcStr: string | null | undefined): string {
    if (!utcStr) return ''
    const d = new Date(utcStr)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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

export function EventForm({ organiserId, event, ticketTypes: initTickets, promoCodes: initPromos }: EventFormProps) {
    const router = useRouter()
    const isEdit = !!event

    // Section 01
    const [title, setTitle] = useState(event?.title || '')
    const [category, setCategory] = useState(event?.category || '')
    const [tags, setTags] = useState((event?.tags || []).join(', '))
    const [description, setDescription] = useState(event?.description || '')
    const [bannerUrl, setBannerUrl] = useState(event?.banner_url || '')
    const [bannerUploading, setBannerUploading] = useState(false)
    const [bannerError, setBannerError] = useState('')

    // Section 02
    const [slug, setSlug] = useState(event?.slug || '')
    const [startAt, setStartAt] = useState(toDatetimeLocal(event?.start_at))
    const [endAt, setEndAt] = useState(toDatetimeLocal(event?.end_at))
    const [venueName, setVenueName] = useState(event?.venue_name || '')
    // Parse city from stored venue_address (saved as "street, city")
    const _rawAddr = event?.venue_address || ''
    const _parts = _rawAddr.split(',')
    const _initCity = _parts.length > 1 ? _parts[_parts.length - 1].trim() : ''
    const _initAddr = _parts.length > 1 ? _parts.slice(0, -1).join(',').trim() : _rawAddr
    const [venueAddress, setVenueAddress] = useState(_initAddr)
    const [venueCity, setVenueCity] = useState(_initCity)
    const [venuePostcode, setVenuePostcode] = useState(event?.venue_postcode || '')

    // Section 03 — Ticket Types
    const defaultTicket: TicketTypeRow = {
        name: 'General Admission', description: '', price_pence: 0, priceStr: '',
        quantity_total: 100, qtyStr: '100', max_per_order: 10, is_visible: true, sort_order: 0,
        sale_starts_at: '', sale_ends_at: '',
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
        })) || [defaultTicket]
    )

    // Section 04
    const [maxTicketsPerOrder, setMaxTicketsPerOrder] = useState(event?.max_tickets_per_order || 10)
    const [minAge, setMinAge] = useState(event?.min_age || 0)
    const [refundPolicy, setRefundPolicy] = useState(event?.refund_policy || REFUND_POLICIES[2])
    const [status, setStatus] = useState<'draft' | 'published'>(event?.status === 'published' ? 'published' : 'draft')

    // Section 05 — Promo codes
    const [promos, setPromos] = useState<PromoCodeRow[]>(
        initPromos?.map(p => ({
            id: p.id, code: p.code, discount_type: p.discount_type, discount_value: p.discount_value,
            min_order_pence: p.min_order_pence, max_uses: p.max_uses, valid_from: p.valid_from || '',
            valid_to: p.valid_to || '', uses_count: p.uses_count,
        })) || []
    )
    const [showPromoModal, setShowPromoModal] = useState(false)
    const [promoError, setPromoError] = useState('')
    const [promoToast, setPromoToast] = useState(false)
    const [newPromo, setNewPromo] = useState<Omit<PromoCodeRow, 'id' | 'uses_count'>>({
        code: '', discount_type: 'percent', discount_value: 10, min_order_pence: 0,
        max_uses: null, valid_from: '', valid_to: '',
    })

    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [errors, setErrors] = useState<string[]>([])
    const [publishing, setPublishing] = useState(false)
    const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

    async function getOrCreateEventId(): Promise<string | null> {
        const supabase = createClient()
        if (event?.id) return event.id

        const eventSlug = slug || toSlug(title) || `event-${Date.now()}`
        const { data, error } = await supabase
            .from('events')
            .insert({
                organiser_id: organiserId,
                title,
                slug: eventSlug,
                description,
                category: category || 'Other',
                tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                venue_name: venueName,
                venue_address: [venueAddress, venueCity].filter(Boolean).join(', '),
                venue_postcode: venuePostcode,
                start_at: startAt ? new Date(startAt).toISOString() : null,
                end_at: endAt ? new Date(endAt).toISOString() : null,
                banner_url: bannerUrl || null,
                status: 'draft',
                min_age: minAge,
                max_tickets_per_order: maxTicketsPerOrder,
                refund_policy: refundPolicy,
            })
            .select('id')
            .single()

        if (error) { console.error('Create event error:', error); return null }
        return data.id
    }

    async function saveDraft() {
        setSaving(true)
        const supabase = createClient()
        const eventId = await getOrCreateEventId()
        if (!eventId) { setSaving(false); return }

        await supabase.from('events').update({
            title,
            slug,
            description,
            category: category || 'Other',
            tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            venue_name: venueName,
            venue_address: [venueAddress, venueCity].filter(Boolean).join(', '),
            venue_postcode: venuePostcode,
            start_at: startAt ? new Date(startAt).toISOString() : null,
            end_at: endAt ? new Date(endAt).toISOString() : null,
            banner_url: bannerUrl || null,
            min_age: minAge,
            max_tickets_per_order: maxTicketsPerOrder,
            refund_policy: refundPolicy,
        }).eq('id', eventId)

        // Upsert ticket types
        for (let i = 0; i < tickets.length; i++) {
            const tt = tickets[i]
            if (tt.id) {
                await supabase.from('ticket_types').update({
                    name: tt.name, description: tt.description, price_pence: tt.price_pence,
                    quantity_total: tt.quantity_total, max_per_order: tt.max_per_order,
                    is_visible: tt.is_visible, sort_order: i,
                    sale_starts_at: tt.sale_starts_at || null, sale_ends_at: tt.sale_ends_at || null,
                }).eq('id', tt.id)
            } else {
                const { data: newTt } = await supabase.from('ticket_types').insert({
                    event_id: eventId, name: tt.name, description: tt.description,
                    price_pence: tt.price_pence, quantity_total: tt.quantity_total,
                    max_per_order: tt.max_per_order, is_visible: tt.is_visible, sort_order: i,
                    sale_starts_at: tt.sale_starts_at || null, sale_ends_at: tt.sale_ends_at || null,
                }).select('id').single()
                if (newTt) {
                    setTickets(prev => prev.map((t, idx) => idx === i ? { ...t, id: newTt.id } : t))
                }
            }
        }

        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        setSaving(false)

        // Navigate to edit page if just created
        if (!event?.id) router.replace(`/organiser/events/${eventId}`)
    }

    function validate() {
        const errs: string[] = []
        if (!title.trim()) errs.push('Event title is required')
        if (!category) errs.push('Category is required')
        if (!startAt) errs.push('Start date is required')
        if (!venueName.trim()) errs.push('Venue name is required')
        if (!venuePostcode.trim()) errs.push('Postcode is required')
        if (tickets.length === 0) errs.push('At least one ticket type is required')
        return errs
    }

    async function handlePublish() {
        const errs = validate()
        if (errs.length) { setErrors(errs); return }
        setErrors([])
        setPublishing(true)
        const supabase = createClient()
        const eventId = await getOrCreateEventId()
        if (!eventId) { setPublishing(false); return }

        await supabase.from('events').update({
            title,
            slug,
            description,
            category: category || 'Other',
            tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            venue_name: venueName,
            venue_address: [venueAddress, venueCity].filter(Boolean).join(', '),
            venue_postcode: venuePostcode,
            start_at: startAt ? new Date(startAt).toISOString() : null,
            end_at: endAt ? new Date(endAt).toISOString() : null,
            banner_url: bannerUrl || null,
            min_age: minAge,
            max_tickets_per_order: maxTicketsPerOrder,
            refund_policy: refundPolicy,
            status: 'published',
        }).eq('id', eventId)

        // Save ticket types (same as saveDraft)
        for (let i = 0; i < tickets.length; i++) {
            const tt = tickets[i]
            if (tt.id) {
                await supabase.from('ticket_types').update({
                    name: tt.name, description: tt.description, price_pence: tt.price_pence,
                    quantity_total: tt.quantity_total, max_per_order: tt.max_per_order,
                    is_visible: tt.is_visible, sort_order: i,
                    sale_starts_at: tt.sale_starts_at || null, sale_ends_at: tt.sale_ends_at || null,
                }).eq('id', tt.id)
            } else {
                const { data: newTt } = await supabase.from('ticket_types').insert({
                    event_id: eventId, name: tt.name, description: tt.description,
                    price_pence: tt.price_pence, quantity_total: tt.quantity_total,
                    max_per_order: tt.max_per_order, is_visible: tt.is_visible, sort_order: i,
                    sale_starts_at: tt.sale_starts_at || null, sale_ends_at: tt.sale_ends_at || null,
                }).select('id').single()
                if (newTt) {
                    setTickets(prev => prev.map((t, idx) => idx === i ? { ...t, id: newTt.id } : t))
                }
            }
        }

        setStatus('published')
        setPublishing(false)
        router.push('/organiser/events')
    }

    async function uploadBanner(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setBannerError('')
        if (file.size > 5 * 1024 * 1024) { setBannerError('File must be under 5MB'); return }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setBannerError('Only JPG, PNG or WEBP files are allowed'); return }

        setBannerUploading(true)
        const supabase = createClient()
        const path = `organisers/${organiserId}/${Date.now()}-${file.name}`
        const { error } = await supabase.storage.from('event-banners').upload(path, file)
        if (error) {
            setBannerError(error.message)
        } else {
            const { data } = supabase.storage.from('event-banners').getPublicUrl(path)
            setBannerUrl(data.publicUrl)
        }
        setBannerUploading(false)
    }

    function addTicket() {
        setTickets(prev => [...prev, { ...defaultTicket, sort_order: prev.length }])
    }

    function updateTicket(i: number, updates: Partial<TicketTypeRow>) {
        setTickets(prev => prev.map((t, idx) => idx === i ? { ...t, ...updates } : t))
    }

    function removeTicket(i: number) {
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

    function generatePromoCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    }

    async function addPromo() {
        const supabase = createClient()
        const eventId = event?.id
        if (!eventId) { setPromoError('Save the event first before adding promo codes'); return }
        setPromoError('')

        const { data, error: insertError } = await supabase.from('promo_codes').insert({
            event_id: eventId,
            organiser_id: organiserId,
            code: newPromo.code.toUpperCase(),
            discount_type: newPromo.discount_type,
            discount_value: newPromo.discount_value,
            min_order_pence: newPromo.min_order_pence,
            max_uses: newPromo.max_uses,
            valid_from: newPromo.valid_from || null,
            valid_to: newPromo.valid_to || null,
        }).select('id').single()

        if (insertError) {
            setPromoError(insertError.message)
            return
        }
        if (data) {
            setPromos(prev => [...prev, { ...newPromo, id: data.id, uses_count: 0 }])
        }
        setShowPromoModal(false)
        setNewPromo({ code: '', discount_type: 'percent', discount_value: 10, min_order_pence: 0, max_uses: null, valid_from: '', valid_to: '' })
        setPromoToast(true)
        setTimeout(() => setPromoToast(false), 3000)
    }

    async function deletePromo(promoId: string) {
        const supabase = createClient()
        await supabase.from('promo_codes').delete().eq('id', promoId)
        setPromos(prev => prev.filter(p => p.id !== promoId))
    }

    const inputClass = "w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
    const labelClass = "text-xs text-muted block mb-1.5"

    function SectionHeader({ num, title: sTitle }: { num: string; title: string }) {
        return (
            <div className="flex items-center gap-3 mb-6">
                <span className="font-mono text-accent text-sm">{num}</span>
                <h2 className="font-heading text-xl text-text tracking-wide">{sTitle}</h2>
            </div>
        )
    }

    return (
        <div className="pb-24">
            {/* Save indicator */}
            <div className="fixed top-4 right-4 z-40 flex flex-col gap-2 items-end">
                {saved && <span className="text-success text-xs bg-success/10 border border-success/20 px-3 py-1.5 rounded-full">Saved ✓</span>}
                {saving && <span className="text-muted text-xs">Saving...</span>}
                {promoToast && <span className="text-success text-xs bg-success/10 border border-success/20 px-3 py-1.5 rounded-full">Promo code created</span>}
            </div>

            {/* Section 01 */}
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
                <SectionHeader num="01" title="Basic Info" />
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
                        <label className={labelClass}>Banner Image</label>
                        {bannerUrl && (
                            <img src={bannerUrl} alt="Banner" className="w-full h-48 object-cover rounded-lg mb-3 border border-border" />
                        )}
                        <label className="block w-full border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-accent/50 transition-colors">
                            <p className="text-muted text-sm">{bannerUploading ? 'Uploading...' : 'Click to upload banner (JPG, PNG, WEBP, max 5MB)'}</p>
                            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadBanner} className="hidden" disabled={bannerUploading} />
                        </label>
                        {bannerError && <p className="text-accent text-xs mt-1">{bannerError}</p>}
                    </div>
                </div>
            </div>

            {/* Section 02 */}
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
                <SectionHeader num="02" title="Date & Venue" />
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Start Date & Time *</label>
                        <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} min={new Date().toISOString().slice(0, 16)} className={inputClass} required />
                    </div>
                    <div>
                        <label className={labelClass}>End Date & Time</label>
                        <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} min={startAt || new Date().toISOString().slice(0, 16)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Timezone</label>
                        <input type="text" value="Europe/London (UK Time)" readOnly className={`${inputClass} opacity-60`} />
                    </div>
                    <div>
                        <label className={labelClass}>Event Slug</label>
                        <input type="text" value={slug} onChange={e => setSlug(e.target.value)} className={inputClass} placeholder="your-event-slug" />
                    </div>
                    <div className="col-span-2">
                        <label className={labelClass}>Venue Name *</label>
                        <input type="text" value={venueName} onChange={e => setVenueName(e.target.value)} className={inputClass} placeholder="e.g. The O2 Arena" required />
                    </div>
                    <div className="col-span-2">
                        <label className={labelClass}>Address Line 1</label>
                        <input type="text" value={venueAddress} onChange={e => setVenueAddress(e.target.value)} className={inputClass} placeholder="Street address" />
                    </div>
                    <div>
                        <label className={labelClass}>City</label>
                        <input
                            type="text"
                            value={venueCity}
                            onChange={e => setVenueCity(e.target.value)}
                            placeholder="e.g. Manchester"
                            list="uk-cities"
                            className={inputClass}
                        />
                        <datalist id="uk-cities">
                            {UK_CITIES.map(c => <option key={c} value={c} />)}
                        </datalist>
                    </div>
                    <div>
                        <label className={labelClass}>Postcode *</label>
                        <input type="text" value={venuePostcode} onChange={e => setVenuePostcode(e.target.value.toUpperCase())} className={inputClass} placeholder="SW1A 1AA" required />
                    </div>
                </div>
            </div>

            {/* Section 03 */}
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
                <SectionHeader num="03" title="Ticket Types" />
                <div className="space-y-4">
                    {tickets.map((tt, i) => (
                        <div key={i} className="bg-surface border border-border rounded-xl p-4">
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
                                        Buyer pays {formatPence(tt.price_pence + calculateBookingFeePerTicket(tt.price_pence))} (incl. {formatPence(calculateBookingFeePerTicket(tt.price_pence))} booking fee)
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
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="md" onClick={addTicket}>+ Add Ticket Type</Button>
                </div>
            </div>

            {/* Section 04 */}
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
                <SectionHeader num="04" title="Settings" />
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Max tickets per order</label>
                        <input type="number" min="1" max="100" value={maxTicketsPerOrder} onChange={e => setMaxTicketsPerOrder(parseInt(e.target.value) || 10)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Minimum Age</label>
                        <select value={minAge} onChange={e => setMinAge(parseInt(e.target.value))} className={inputClass}>
                            <option value={0}>All ages</option>
                            <option value={16}>16+</option>
                            <option value={18}>18+</option>
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className={labelClass}>Refund Policy</label>
                        <select value={refundPolicy} onChange={e => setRefundPolicy(e.target.value)} className={inputClass}>
                            {REFUND_POLICIES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className={labelClass}>Event Visibility</label>
                        <select value={status} onChange={e => setStatus(e.target.value as 'draft' | 'published')} className={inputClass}>
                            <option value="draft">Draft — not visible to public</option>
                            <option value="published">Published — visible and bookable</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Section 05 */}
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
                <SectionHeader num="05" title="Promo Codes" />
                {promos.length > 0 && (
                    <table className="w-full text-sm mb-4">
                        <thead>
                            <tr className="border-b border-border">
                                {['Code', 'Type', 'Value', 'Uses', 'Valid Until', ''].map(h => (
                                    <th key={h} className="text-left text-xs text-muted pb-2 font-normal pr-4">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {promos.map(p => (
                                <tr key={p.id || p.code} className="border-b border-border/50">
                                    <td className="py-2 pr-4 font-mono text-xs text-accent">{p.code}</td>
                                    <td className="py-2 pr-4 text-text text-xs">{p.discount_type}</td>
                                    <td className="py-2 pr-4 text-text text-xs">{p.discount_type === 'percent' ? `${p.discount_value}%` : formatPence(p.discount_value)}</td>
                                    <td className="py-2 pr-4 text-muted text-xs">{p.uses_count}{p.max_uses ? `/${p.max_uses}` : ''}</td>
                                    <td className="py-2 pr-4 text-muted text-xs">{p.valid_to ? new Date(p.valid_to).toLocaleDateString('en-GB') : '—'}</td>
                                    <td className="py-2">{p.id && <button type="button" onClick={() => deletePromo(p.id!)} className="text-xs text-accent hover:underline">Delete</button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => setShowPromoModal(true)}>Create Promo Code</Button>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
                <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6">
                    <p className="text-accent text-sm font-medium mb-2">Please fix the following:</p>
                    <ul className="list-disc list-inside space-y-1">
                        {errors.map(e => <li key={e} className="text-accent text-xs">{e}</li>)}
                    </ul>
                </div>
            )}

            {/* Sticky action bar */}
            <div className="fixed bottom-0 left-[220px] right-0 bg-surface border-t border-border px-8 py-4 flex items-center gap-4 z-30">
                <Button type="button" variant="secondary" size="md" onClick={saveDraft} disabled={saving}>
                    {saving ? 'Saving...' : 'Save as Draft'}
                </Button>
                <Button type="button" variant="primary" size="md" onClick={handlePublish} disabled={publishing}>
                    {publishing ? 'Publishing...' : 'Publish Event'}
                </Button>
                {event?.slug && (
                    <a
                        href={`/events/${event.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted hover:text-text transition-colors"
                    >
                        Preview →
                    </a>
                )}
                {saved && <span className="text-success text-xs ml-auto">Saved ✓</span>}
            </div>

            {/* Promo code modal */}
            {showPromoModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
                        <h3 className="font-heading text-xl text-text mb-4">CREATE PROMO CODE</h3>
                        <div className="space-y-3">
                            <div>
                                <label className={labelClass}>Code</label>
                                <div className="flex gap-2">
                                    <input type="text" value={newPromo.code} onChange={e => setNewPromo(p => ({ ...p, code: e.target.value.toUpperCase() }))} className={`${inputClass} flex-1`} placeholder="SUMMER20" />
                                    <button type="button" onClick={() => setNewPromo(p => ({ ...p, code: generatePromoCode() }))} className="px-3 py-2 bg-surface border border-border rounded-lg text-xs text-muted hover:text-text">Auto</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Discount Type</label>
                                    <select value={newPromo.discount_type} onChange={e => setNewPromo(p => ({ ...p, discount_type: e.target.value as 'percent' | 'fixed' }))} className={inputClass}>
                                        <option value="percent">Percentage (%)</option>
                                        <option value="fixed">Fixed (£)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Value</label>
                                    <input type="number" min="1" value={newPromo.discount_value} onChange={e => setNewPromo(p => ({ ...p, discount_value: parseFloat(e.target.value) || 0 }))} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Max Uses (blank = unlimited)</label>
                                    <input type="number" min="1" value={newPromo.max_uses || ''} onChange={e => setNewPromo(p => ({ ...p, max_uses: e.target.value ? parseInt(e.target.value) : null }))} className={inputClass} placeholder="Unlimited" />
                                </div>
                                <div>
                                    <label className={labelClass}>Min Order (£)</label>
                                    <input type="number" min="0" step="0.01" value={(newPromo.min_order_pence / 100).toFixed(2)} onChange={e => setNewPromo(p => ({ ...p, min_order_pence: priceToPence(e.target.value) }))} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Valid From</label>
                                    <input type="datetime-local" value={newPromo.valid_from} onChange={e => setNewPromo(p => ({ ...p, valid_from: e.target.value }))} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Valid To</label>
                                    <input type="datetime-local" value={newPromo.valid_to} onChange={e => setNewPromo(p => ({ ...p, valid_to: e.target.value }))} className={inputClass} />
                                </div>
                            </div>
                        </div>
                        {promoError && <p className="text-accent text-xs mt-3">{promoError}</p>}
                        <div className="flex gap-3 mt-4">
                            <Button type="button" variant="primary" size="md" onClick={addPromo} disabled={!newPromo.code}>Add Code</Button>
                            <Button type="button" variant="secondary" size="md" onClick={() => setShowPromoModal(false)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
