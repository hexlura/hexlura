'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { formatPence } from '@/lib/fees'
import { createClient } from '@/lib/supabase/client'
import { ThemedSelect } from '@/components/ui/ThemedSelect'

interface PromoCode {
    id: string
    code: string
    discount_type: 'percent' | 'fixed'
    discount_value: number
    min_order_pence: number
    max_uses: number | null
    uses_count: number
    valid_from: string | null
    valid_to: string | null
    created_at: string
    ticket_type_id: string | null
    max_uses_per_customer: number | null
    max_discount_pence: number | null
    max_tickets: number | null
    ticket_type?: { name: string } | null
}

interface TicketType {
    id: string
    name: string
}

interface Redemption {
    id: string
    email: string | null
    discount_pence: number
    created_at: string
    booking: { booking_ref: string } | null
}

function toDateInputValue(iso: string | null): string {
    if (!iso) return ''
    return iso.slice(0, 10)
}

function discountLabel(code: PromoCode): string {
    return code.discount_type === 'percent'
        ? `${code.discount_value}% off`
        : `${formatPence(code.discount_value)} off`
}

export default function PromoCodesPage() {
    const params = useParams<{ id: string }>()
    const eventId = params.id

    const [codes, setCodes] = useState<PromoCode[]>([])
    const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [eventTitle, setEventTitle] = useState('')

    // Create form
    const [code, setCode] = useState('')
    const [ticketTypeId, setTicketTypeId] = useState('')
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
    const [discountValue, setDiscountValue] = useState('')
    const [maxDiscount, setMaxDiscount] = useState('')
    const [minOrder, setMinOrder] = useState('')
    const [maxUses, setMaxUses] = useState('')
    const [maxUsesPerCustomer, setMaxUsesPerCustomer] = useState('')
    const [maxTickets, setMaxTickets] = useState('')
    const [validFrom, setValidFrom] = useState('')
    const [validTo, setValidTo] = useState('')
    const [creating, setCreating] = useState(false)

    // Inline edit
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')
    const [editMaxDiscount, setEditMaxDiscount] = useState('')
    const [editMinOrder, setEditMinOrder] = useState('')
    const [editMaxUses, setEditMaxUses] = useState('')
    const [editMaxUsesPerCustomer, setEditMaxUsesPerCustomer] = useState('')
    const [editMaxTickets, setEditMaxTickets] = useState('')
    const [editValidFrom, setEditValidFrom] = useState('')
    const [editValidTo, setEditValidTo] = useState('')
    const [savingEdit, setSavingEdit] = useState(false)

    // Usage/redemption history
    const [openUsageId, setOpenUsageId] = useState<string | null>(null)
    const [redemptions, setRedemptions] = useState<Redemption[]>([])
    const [loadingRedemptions, setLoadingRedemptions] = useState(false)
    const [usageError, setUsageError] = useState('')

    const fetchCodes = useCallback(async () => {
        setLoading(true)
        const res = await fetch(`/api/organiser/promo-codes?event_id=${eventId}`)
        const json = await res.json()
        if (!res.ok) {
            setError(json.error || 'Failed to load promo codes.')
            setCodes([])
        } else {
            setError('')
            setCodes(json.codes || [])
        }
        setLoading(false)
    }, [eventId])

    useEffect(() => { fetchCodes() }, [fetchCodes])

    useEffect(() => {
        const supabase = createClient()
        supabase.from('events').select('title').eq('id', eventId).single().then(({ data }) => {
            if (data?.title) setEventTitle(data.title)
        })
        supabase.from('ticket_types').select('id, name').eq('event_id', eventId).order('sort_order').then(({ data }) => {
            if (data) setTicketTypes(data)
        })
    }, [eventId])


    async function toggleUsage(codeId: string) {
        if (openUsageId === codeId) {
            setOpenUsageId(null)
            return
        }
        setOpenUsageId(codeId)
        setLoadingRedemptions(true)
        setUsageError('')
        const res = await fetch(`/api/organiser/promo-codes/${codeId}/redemptions`)
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
            setRedemptions([])
            setUsageError(json.error || 'Could not load usage for this code.')
        } else {
            setRedemptions(json.redemptions || [])
        }
        setLoadingRedemptions(false)
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setCreating(true)
        const res = await fetch('/api/organiser/promo-codes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_id: eventId,
                code: code || undefined,
                ticket_type_id: ticketTypeId || undefined,
                discount_type: discountType,
                discount_value: discountValue,
                max_discount_pence: discountType === 'percent' && maxDiscount ? Math.round(parseFloat(maxDiscount) * 100) : undefined,
                min_order_pence: minOrder ? Math.round(parseFloat(minOrder) * 100) : undefined,
                max_uses: maxUses || undefined,
                max_uses_per_customer: maxUsesPerCustomer || undefined,
                max_tickets: maxTickets || undefined,
                valid_from: validFrom || undefined,
                valid_to: validTo || undefined,
            }),
        })
        const json = await res.json()
        if (!res.ok) {
            setError(json.error || 'Failed to create code.')
        } else {
            setCode('')
            setTicketTypeId('')
            setDiscountValue('')
            setMaxDiscount('')
            setMinOrder('')
            setMaxUses('')
            setMaxUsesPerCustomer('')
            setMaxTickets('')
            setValidFrom('')
            setValidTo('')
            fetchCodes()
        }
        setCreating(false)
    }

    async function handleDelete(id: string, codeText: string) {
        if (!confirm(`Delete "${codeText}"? This can't be undone.`)) return
        const res = await fetch(`/api/organiser/promo-codes/${id}`, { method: 'DELETE' })
        if (!res.ok) {
            const json = await res.json().catch(() => ({}))
            setError(json.error || 'Failed to delete code.')
            return
        }
        fetchCodes()
    }

    function startEdit(c: PromoCode) {
        setEditingId(c.id)
        setEditValue(String(c.discount_type === 'fixed' ? (c.discount_value / 100).toFixed(2) : c.discount_value))
        setEditMaxDiscount(c.max_discount_pence ? (c.max_discount_pence / 100).toFixed(2) : '')
        setEditMinOrder((c.min_order_pence / 100).toFixed(2))
        setEditMaxUses(c.max_uses ? String(c.max_uses) : '')
        setEditMaxUsesPerCustomer(c.max_uses_per_customer ? String(c.max_uses_per_customer) : '')
        setEditMaxTickets(c.max_tickets ? String(c.max_tickets) : '')
        setEditValidFrom(toDateInputValue(c.valid_from))
        setEditValidTo(toDateInputValue(c.valid_to))
    }

    async function saveEdit(c: PromoCode) {
        setSavingEdit(true)
        setError('')
        const discount_value = c.discount_type === 'fixed'
            ? Math.round(parseFloat(editValue) * 100)
            : parseInt(editValue, 10)
        const res = await fetch(`/api/organiser/promo-codes/${c.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                discount_value,
                max_discount_pence: c.discount_type === 'percent' && editMaxDiscount ? Math.round(parseFloat(editMaxDiscount) * 100) : null,
                min_order_pence: Math.round(parseFloat(editMinOrder || '0') * 100),
                max_uses: editMaxUses || null,
                max_uses_per_customer: editMaxUsesPerCustomer || null,
                max_tickets: editMaxTickets || null,
                valid_from: editValidFrom || null,
                valid_to: editValidTo || null,
            }),
        })
        const json = await res.json()
        if (!res.ok) {
            setError(json.error || 'Failed to update code.')
        } else {
            setEditingId(null)
            fetchCodes()
        }
        setSavingEdit(false)
    }

    const fieldInput = 'w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25'
    const fieldSelect = 'w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25'
    const labelClass = 'text-xs text-muted block mb-1.5'
    const editInput = 'w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25'
    const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

    return (
        <div className="max-w-7xl">
            <Link href="/organiser/events" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors mb-4">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                Back to Events
            </Link>

            <div className="mb-6">
                <h1 className="font-heading text-4xl tracking-wide">PROMO CODES</h1>
                {eventTitle && <p className="text-muted text-sm mt-1">For {eventTitle}</p>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Create form */}
                <form onSubmit={handleCreate} className="bg-card rounded-2xl shadow-card p-6 self-start">
                    <h2 className="text-sm font-semibold mb-4">Create New Code</h2>
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className={labelClass}>Code (leave blank to auto-generate)</label>
                            <input
                                type="text"
                                value={code}
                                onChange={e => setCode(e.target.value.toUpperCase())}
                                placeholder="e.g. EARLYBIRD"
                                maxLength={30}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Applies to</label>
                            <ThemedSelect
                                value={ticketTypeId}
                                onChange={e => setTicketTypeId(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25"
                            >
                                <option value="">All ticket types</option>
                                {ticketTypes.map(tt => (
                                    <option key={tt.id} value={tt.id}>{tt.name}</option>
                                ))}
                            </ThemedSelect>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Discount type</label>
                                <ThemedSelect
                                    value={discountType}
                                    onChange={e => setDiscountType(e.target.value as 'percent' | 'fixed')}
                                    className={fieldSelect}
                                >
                                    <option value="percent">Percent %</option>
                                    <option value="fixed">Fixed £</option>
                                </ThemedSelect>
                            </div>
                            <div>
                                <label className={labelClass}>Amount</label>
                                <input
                                    type="number"
                                    value={discountValue}
                                    onChange={e => setDiscountValue(e.target.value)}
                                    min={discountType === 'percent' ? 1 : 0.01}
                                    max={discountType === 'percent' ? 100 : undefined}
                                    step={discountType === 'percent' ? 1 : 0.01}
                                    required
                                    placeholder="20"
                                    className={fieldInput}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {discountType === 'percent' && (
                                <div>
                                    <label className={labelClass}>Max discount cap (£, optional)</label>
                                    <input
                                        type="number"
                                        value={maxDiscount}
                                        onChange={e => setMaxDiscount(e.target.value)}
                                        min={0.01}
                                        step={0.01}
                                        placeholder="No cap"
                                        className={fieldInput}
                                    />
                                </div>
                            )}
                            <div>
                                <label className={labelClass}>Minimum order (£, optional)</label>
                                <input
                                    type="number"
                                    value={minOrder}
                                    onChange={e => setMinOrder(e.target.value)}
                                    min={0}
                                    step={0.01}
                                    placeholder="£0.00"
                                    className={fieldInput}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Max total orders</label>
                                <input
                                    type="number"
                                    value={maxUses}
                                    onChange={e => setMaxUses(e.target.value)}
                                    min={1}
                                    placeholder="Unlimited"
                                    className={fieldInput}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Max per customer</label>
                                <input
                                    type="number"
                                    value={maxUsesPerCustomer}
                                    onChange={e => setMaxUsesPerCustomer(e.target.value)}
                                    min={1}
                                    placeholder="Unlimited"
                                    className={fieldInput}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Max tickets per order (optional)</label>
                            <input
                                type="number"
                                value={maxTickets}
                                onChange={e => setMaxTickets(e.target.value)}
                                min={1}
                                placeholder="Unlimited"
                                className={fieldInput}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Valid from</label>
                                <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} className={fieldInput} />
                            </div>
                            <div>
                                <label className={labelClass}>Valid to</label>
                                <input type="date" value={validTo} onChange={e => setValidTo(e.target.value)} className={fieldInput} />
                            </div>
                        </div>
                        {error && <p className="text-warm-red text-xs">{error}</p>}
                        <button
                            type="submit"
                            disabled={creating}
                            className="bg-accent text-white px-5 py-3 rounded-xl text-sm font-semibold mt-1 disabled:opacity-60"
                        >
                            {creating ? 'Creating…' : 'Create Code'}
                        </button>
                    </div>
                </form>

                {/* Existing codes */}
                <div className="lg:col-span-2 bg-card rounded-2xl shadow-card overflow-hidden self-start">
                    <div className="px-6 py-4 border-b border-border">
                        <h2 className="text-sm font-semibold">Existing Codes</h2>
                    </div>
                    {loading ? (
                        <p className="text-muted text-sm text-center py-12">Loading codes…</p>
                    ) : codes.length === 0 ? (
                        <p className="text-muted text-sm text-center py-12">No promo codes yet. Create your first one.</p>
                    ) : (
                        <div className="divide-y divide-border">
                            {codes.map(c => (
                                <div key={c.id} className="p-5">
                                    {editingId === c.id ? (
                                        <div className="space-y-3">
                                            <p className="font-mono font-bold text-sm">{c.code}</p>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <div>
                                                    <label className={labelClass}>
                                                        {c.discount_type === 'percent' ? 'Discount (%)' : 'Discount (£)'}
                                                    </label>
                                                    <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className={editInput} />
                                                </div>
                                                {c.discount_type === 'percent' && (
                                                    <div>
                                                        <label className={labelClass}>Max discount (£)</label>
                                                        <input type="number" value={editMaxDiscount} onChange={e => setEditMaxDiscount(e.target.value)} placeholder="No cap" className={editInput} />
                                                    </div>
                                                )}
                                                <div>
                                                    <label className={labelClass}>Min order (£)</label>
                                                    <input type="number" value={editMinOrder} onChange={e => setEditMinOrder(e.target.value)} className={editInput} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Max orders</label>
                                                    <input type="number" value={editMaxUses} onChange={e => setEditMaxUses(e.target.value)} placeholder="Unlimited" className={editInput} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Max per customer</label>
                                                    <input type="number" value={editMaxUsesPerCustomer} onChange={e => setEditMaxUsesPerCustomer(e.target.value)} placeholder="Unlimited" className={editInput} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Max tickets / order</label>
                                                    <input type="number" value={editMaxTickets} onChange={e => setEditMaxTickets(e.target.value)} placeholder="Unlimited" className={editInput} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 col-span-2 sm:col-span-1">
                                                    <div>
                                                        <label className={labelClass}>From</label>
                                                        <input type="date" value={editValidFrom} onChange={e => setEditValidFrom(e.target.value)} className={editInput} />
                                                    </div>
                                                    <div>
                                                        <label className={labelClass}>To</label>
                                                        <input type="date" value={editValidTo} onChange={e => setEditValidTo(e.target.value)} className={editInput} />
                                                    </div>
                                                </div>
                                            </div>
                                            {error && <p className="text-warm-red text-xs">{error}</p>}
                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => saveEdit(c)}
                                                    disabled={savingEdit}
                                                    className="bg-text text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-60"
                                                >
                                                    {savingEdit ? 'Saving…' : 'Save'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setEditingId(null); setError('') }}
                                                    className="bg-background border border-border px-4 py-2 rounded-xl text-xs font-medium text-muted hover:text-text transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-mono font-bold text-sm">{c.code}</p>
                                                        {c.ticket_type_id && (
                                                            <span className="text-[10px] font-bold text-accent bg-warm-red/10 border border-warm-red/30 rounded-full px-2 py-0.5 uppercase tracking-wide">
                                                                {c.ticket_type?.name || 'Ticket type'} only
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted mt-1">
                                                        {discountLabel(c)}
                                                        {c.max_discount_pence != null && ` (capped at ${formatPence(c.max_discount_pence)})`}
                                                        {c.min_order_pence > 0 ? ` · min order ${formatPence(c.min_order_pence)}` : ''}
                                                        {' · '}{c.uses_count} / {c.max_uses ?? '∞'} orders
                                                        {c.max_uses_per_customer != null && ` · ${c.max_uses_per_customer} per customer`}
                                                        {c.max_tickets != null && ` · max ${c.max_tickets} ticket${c.max_tickets === 1 ? '' : 's'} per order`}
                                                        {c.valid_to ? ` · expires ${fmtDate(c.valid_to)}` : ' · no expiry'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <button type="button" onClick={() => toggleUsage(c.id)} className="text-xs text-muted hover:text-text flex items-center gap-1">
                                                        Usage
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: openUsageId === c.id ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
                                                            <path d="M6 9l6 6 6-6" />
                                                        </svg>
                                                    </button>
                                                    <button type="button" onClick={() => startEdit(c)} className="text-xs text-accent hover:underline font-medium">Edit</button>
                                                    <button type="button" onClick={() => handleDelete(c.id, c.code)} className="text-xs text-muted hover:text-accent">Delete</button>
                                                </div>
                                            </div>
                                            {openUsageId === c.id && (
                                                <div className="mt-3 pt-3 border-t border-border">
                                                    {loadingRedemptions ? (
                                                        <p className="text-xs text-muted">Loading…</p>
                                                    ) : usageError ? (
                                                        <p className="text-xs text-warm-red">{usageError}</p>
                                                    ) : redemptions.length === 0 ? (
                                                        <p className="text-xs text-muted">No redemptions yet.</p>
                                                    ) : (
                                                        <table className="w-full text-xs">
                                                            <thead>
                                                                <tr className="text-left text-muted">
                                                                    <th className="font-normal pb-1">Booking</th>
                                                                    <th className="font-normal pb-1">Buyer</th>
                                                                    <th className="font-normal pb-1">Date</th>
                                                                    <th className="font-normal pb-1 text-right">Discount</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {redemptions.map(r => (
                                                                    <tr key={r.id}>
                                                                        <td className="font-mono py-1">{r.booking?.booking_ref || '—'}</td>
                                                                        <td className="py-1">{r.email || '—'}</td>
                                                                        <td className="py-1 text-muted">{fmtDate(r.created_at)}</td>
                                                                        <td className="py-1 text-right">{formatPence(r.discount_pence)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
