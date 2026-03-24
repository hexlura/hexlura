'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { calculateBookingFeePerTicket, formatPence } from '@/lib/fees'
import type { Event, TicketType, PromoCode } from '@/types'
import dynamic from 'next/dynamic'
import { CATEGORIES } from '@/lib/config/categories'

const RichTextEditor = dynamic(
    () => import('@/components/organiser/RichTextEditor').then(m => m.RichTextEditor),
    { ssr: false, loading: () => <div className="h-48 bg-surface border border-border rounded-lg animate-pulse" /> }
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
    const [youtubeUrl, setYoutubeUrl] = useState(event?.youtube_url || '')

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
    const [showTicketPresetModal, setShowTicketPresetModal] = useState(false)
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
    const [currentStep, setCurrentStep] = useState(1)
    const [stepErrors, setStepErrors] = useState<string[]>([])
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
                start_at: startAt ? ukTimeToUTC(startAt) : null,
                end_at: endAt ? ukTimeToUTC(endAt) : null,
                banner_url: bannerUrl || null,
                youtube_url: youtubeUrl || null,
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
            youtube_url: youtubeUrl || null,
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
                    is_group: tt.is_group, group_size: tt.group_size,
                }).eq('id', tt.id)
            } else {
                const { data: newTt } = await supabase.from('ticket_types').insert({
                    event_id: eventId, name: tt.name, description: tt.description,
                    price_pence: tt.price_pence, quantity_total: tt.quantity_total,
                    max_per_order: tt.max_per_order, is_visible: tt.is_visible, sort_order: i,
                    sale_starts_at: tt.sale_starts_at || null, sale_ends_at: tt.sale_ends_at || null,
                    is_group: tt.is_group, group_size: tt.group_size,
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

    function validateStep(step: number): boolean {
        const errs: string[] = []
        if (step === 1) {
            if (!title.trim()) errs.push('Event title is required')
            if (!category) errs.push('Category is required')
        } else if (step === 2) {
            if (!startAt) errs.push('Start date is required')
            if (!venueName.trim()) errs.push('Venue name is required')
            if (!venuePostcode.trim()) errs.push('Postcode is required')
        } else if (step === 3) {
            if (tickets.length === 0) errs.push('At least one ticket type is required')
            tickets.forEach((tt, i) => {
                if (!tt.name.trim()) errs.push(`Ticket ${i + 1}: name is required`)
                if (tt.price_pence < 0) errs.push(`Ticket ${i + 1}: price cannot be negative`)
            })
        }
        setStepErrors(errs)
        return errs.length === 0
    }

    const goToNext = async () => {
        if (!validateStep(currentStep)) return
        await saveDraft()
        setCurrentStep(prev => Math.min(prev + 1, 5))
        window.scrollTo(0, 0)
    }

    const goToPrev = () => {
        setStepErrors([])
        setCurrentStep(prev => Math.max(prev - 1, 1))
        window.scrollTo(0, 0)
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
            youtube_url: youtubeUrl || null,
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
                    is_group: tt.is_group, group_size: tt.group_size,
                }).eq('id', tt.id)
            } else {
                const { data: newTt } = await supabase.from('ticket_types').insert({
                    event_id: eventId, name: tt.name, description: tt.description,
                    price_pence: tt.price_pence, quantity_total: tt.quantity_total,
                    max_per_order: tt.max_per_order, is_visible: tt.is_visible, sort_order: i,
                    sale_starts_at: tt.sale_starts_at || null, sale_ends_at: tt.sale_ends_at || null,
                    is_group: tt.is_group, group_size: tt.group_size,
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

    function addTicketFromPreset(name: string, description: string) {
        setTickets(prev => [...prev, {
            ...defaultTicket,
            name,
            description,
            priceStr: '',
            price_pence: 0,
            qtyStr: '',
            quantity_total: 0,
            sort_order: prev.length,
        }])
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

    const STEP_LABELS = ['Basic Info', 'Date & Venue', 'Tickets', 'Settings', 'Publish']

    return (
        <div>
            {/* Save indicator */}
            <div className="fixed top-4 right-4 z-40 flex flex-col gap-2 items-end">
                {saved && <span className="text-success text-xs bg-success/10 border border-success/20 px-3 py-1.5 rounded-full">Saved ✓</span>}
                {saving && <span className="text-muted text-xs">Saving...</span>}
                {promoToast && <span className="text-success text-xs bg-success/10 border border-success/20 px-3 py-1.5 rounded-full">Promo code created</span>}
            </div>

            {/* Step indicator */}
            <div style={{ background: '#13131A', borderRadius: 16, padding: 24, marginBottom: 32 }}>
                {/* Mobile */}
                <div className="sm:hidden text-center">
                    <p style={{ color: '#8888AA', fontSize: 12, marginBottom: 4 }}>Step {currentStep} of 5</p>
                    <p className="font-heading text-text text-lg">{STEP_LABELS[currentStep - 1]}</p>
                </div>
                {/* Desktop */}
                <div className="hidden sm:flex items-start">
                    {STEP_LABELS.map((label, idx) => {
                        const stepNum = idx + 1
                        const done = currentStep > stepNum
                        const active = currentStep === stepNum
                        return (
                            <div key={stepNum} style={{ display: 'flex', alignItems: 'center', flex: idx < 4 ? 1 : undefined }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        background: done || active ? '#E63950' : '#2A2A3A',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
                                    }}>{done ? '✓' : stepNum}</div>
                                    <span style={{ fontSize: 11, marginTop: 6, whiteSpace: 'nowrap', color: active ? '#F0F0F8' : '#8888AA' }}>{label}</span>
                                </div>
                                {idx < 4 && (
                                    <div style={{ flex: 1, height: 2, background: done ? '#E63950' : '#2A2A3A', margin: '0 8px 20px 8px' }} />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Step content */}
            <div style={{ background: '#1A1A24', borderRadius: 16, padding: 28, minHeight: 400 }}>

                {/* Step 1 — Basic Info */}
                {currentStep === 1 && (
                    <div>
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
                                <p className="text-xs mt-1" style={{ color: '#8888AA' }}>Recommended size: 1280×720px (16:9 ratio). Max 5MB. JPG, PNG or WebP.</p>
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
                                <p className="text-xs mt-1" style={{ color: '#8888AA' }}>Paste a YouTube link to show a promo video on your event page.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2 — Date & Venue */}
                {currentStep === 2 && (
                    <div>
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
                                            border: '1px solid #2A2A3A',
                                            color: '#8888AA',
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
                                        onMouseLeave={e => (e.currentTarget.style.borderColor = '#2A2A3A')}
                                    >
                                        Look Up
                                    </button>
                                </div>
                                {postcodeMsg && (
                                    <p style={{
                                        fontSize: 12,
                                        marginTop: 4,
                                        color: postcodeStatus === 'success' ? '#00E5A0' : postcodeStatus === 'error' ? '#E63950' : '#8888AA',
                                    }}>{postcodeMsg}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3 — Ticket Types */}
                {currentStep === 3 && (
                    <div>
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
                                    {/* Group ticket */}
                                    <div className="border-t border-border mt-2 pt-3 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-sm text-text">Group Ticket</span>
                                                <p className="text-xs text-muted mt-0.5">Each purchase generates one QR code per person in the group</p>
                                            </div>
                                            <div
                                                onClick={() => updateTicket(i, { is_group: !tt.is_group, group_size: !tt.is_group ? 2 : 1 })}
                                                className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer flex-shrink-0 ml-4 ${tt.is_group ? 'bg-accent' : 'bg-border'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${tt.is_group ? 'translate-x-5' : 'translate-x-1'}`} />
                                            </div>
                                        </div>
                                        {tt.is_group && (
                                            <div>
                                                <label className={labelClass}>Group Size</label>
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
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="md" onClick={() => setShowTicketPresetModal(true)}>+ Add Ticket Type</Button>
                        </div>
                    </div>
                )}

                {/* Step 4 — Settings */}
                {currentStep === 4 && (
                    <div>
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
                )}

                {/* Step 5 — Promo Codes + Publish */}
                {currentStep === 5 && (
                    <div>
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
                        {event?.slug && (
                            <div className="mt-4">
                                <a href={`/events/${event.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:text-text transition-colors">
                                    Preview event →
                                </a>
                            </div>
                        )}
                        {errors.length > 0 && (
                            <div className="mt-6 bg-accent/10 border border-accent/30 rounded-xl p-4">
                                <p className="text-accent text-sm font-medium mb-2">Please fix the following:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    {errors.map(e => <li key={e} className="text-accent text-xs">{e}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Per-step validation errors */}
                {stepErrors.length > 0 && (
                    <div className="mt-6 bg-accent/10 border border-accent/30 rounded-xl p-4">
                        <p className="text-accent text-sm font-medium mb-2">Please fix the following:</p>
                        <ul className="list-disc list-inside space-y-1">
                            {stepErrors.map(e => <li key={e} className="text-accent text-xs">{e}</li>)}
                        </ul>
                    </div>
                )}

                {/* Navigation bar */}
                <div style={{ borderTop: '1px solid #2A2A3A', paddingTop: 24, marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {currentStep > 1 ? (
                        <button
                            type="button"
                            onClick={goToPrev}
                            style={{ background: 'transparent', border: '1px solid #2A2A3A', color: '#8888AA', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#F0F0F8'; e.currentTarget.style.color = '#F0F0F8' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A3A'; e.currentTarget.style.color = '#8888AA' }}
                        >← Back</button>
                    ) : <div />}
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            type="button"
                            onClick={saveDraft}
                            disabled={saving}
                            style={{ background: 'transparent', border: '1px solid #E63950', color: '#E63950', padding: '12px 24px', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}
                            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = 'rgba(230,57,80,0.08)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >{saving ? 'Saving...' : 'Save Draft'}</button>
                        {currentStep < 5 ? (
                            <button
                                type="button"
                                onClick={goToNext}
                                style={{ background: '#E63950', color: '#fff', padding: '12px 32px', borderRadius: 8, cursor: 'pointer', fontSize: 14, border: 'none' }}
                                onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
                                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                            >Next →</button>
                        ) : (
                            <button
                                type="button"
                                onClick={handlePublish}
                                disabled={publishing}
                                style={{ background: '#E63950', color: '#fff', padding: '12px 32px', borderRadius: 8, cursor: publishing ? 'not-allowed' : 'pointer', fontSize: 14, border: 'none', opacity: publishing ? 0.7 : 1 }}
                                onMouseEnter={e => { if (!publishing) e.currentTarget.style.opacity = '0.9' }}
                                onMouseLeave={e => { if (!publishing) e.currentTarget.style.opacity = '1' }}
                            >{publishing ? 'Publishing...' : 'Publish Event'}</button>
                        )}
                    </div>
                </div>
            </div>

            {/* Ticket type preset modal */}
            {showTicketPresetModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div style={{ background: '#13131A', border: '1px solid #2A2A3A', borderRadius: 16, padding: 24, width: '100%', maxWidth: 500 }}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 style={{ fontFamily: 'var(--font-bebas-neue, Bebas Neue, sans-serif)', fontSize: 20, color: '#fff', letterSpacing: '0.05em' }}>Choose Ticket Type</h3>
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
                                        )
                                    }}
                                    style={{
                                        background: '#1A1A24',
                                        border: '1px solid #2A2A3A',
                                        borderRadius: 12,
                                        padding: 16,
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        transition: 'border-color 0.15s, background 0.15s',
                                    }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E63950' }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2A2A3A' }}
                                >
                                    <div style={{ fontSize: 24, marginBottom: 8 }}>{preset.icon}</div>
                                    <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 4 }}>{preset.name}</div>
                                    <div style={{ color: '#8888AA', fontSize: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{preset.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

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
