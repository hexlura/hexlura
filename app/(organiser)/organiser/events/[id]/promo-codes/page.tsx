'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { formatPence } from '@/lib/fees'

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
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Create form
    const [code, setCode] = useState('')
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
    const [discountValue, setDiscountValue] = useState('')
    const [minOrder, setMinOrder] = useState('')
    const [maxUses, setMaxUses] = useState('')
    const [validFrom, setValidFrom] = useState('')
    const [validTo, setValidTo] = useState('')
    const [creating, setCreating] = useState(false)

    // Inline edit
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')
    const [editMinOrder, setEditMinOrder] = useState('')
    const [editMaxUses, setEditMaxUses] = useState('')
    const [editValidFrom, setEditValidFrom] = useState('')
    const [editValidTo, setEditValidTo] = useState('')
    const [savingEdit, setSavingEdit] = useState(false)

    const fetchCodes = useCallback(async () => {
        setLoading(true)
        const res = await fetch(`/api/organiser/promo-codes?event_id=${eventId}`)
        const json = await res.json()
        setCodes(json.codes || [])
        setLoading(false)
    }, [eventId])

    useEffect(() => { fetchCodes() }, [fetchCodes])

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
                discount_type: discountType,
                discount_value: discountValue,
                min_order_pence: minOrder ? Math.round(parseFloat(minOrder) * 100) : undefined,
                max_uses: maxUses || undefined,
                valid_from: validFrom || undefined,
                valid_to: validTo || undefined,
            }),
        })
        const json = await res.json()
        if (!res.ok) {
            setError(json.error || 'Failed to create code.')
        } else {
            setCode('')
            setDiscountValue('')
            setMinOrder('')
            setMaxUses('')
            setValidFrom('')
            setValidTo('')
            fetchCodes()
        }
        setCreating(false)
    }

    async function handleDelete(id: string, codeText: string) {
        if (!confirm(`Delete "${codeText}"? This can't be undone.`)) return
        await fetch(`/api/organiser/promo-codes/${id}`, { method: 'DELETE' })
        fetchCodes()
    }

    function startEdit(c: PromoCode) {
        setEditingId(c.id)
        setEditValue(String(c.discount_type === 'fixed' ? (c.discount_value / 100).toFixed(2) : c.discount_value))
        setEditMinOrder((c.min_order_pence / 100).toFixed(2))
        setEditMaxUses(c.max_uses ? String(c.max_uses) : '')
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
                min_order_pence: Math.round(parseFloat(editMinOrder || '0') * 100),
                max_uses: editMaxUses || null,
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

    return (
        <div className="max-w-3xl">
            <h1 className="font-heading text-4xl text-text tracking-wide mb-6">PROMO CODES</h1>

            <form onSubmit={handleCreate} className="bg-surface border border-border rounded-none p-6 mb-8 space-y-4">
                <p className="text-sm font-semibold text-text">Create a new code</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-muted mb-1">Code (leave blank to auto-generate)</label>
                        <input
                            type="text"
                            value={code}
                            onChange={e => setCode(e.target.value.toUpperCase())}
                            placeholder="e.g. EARLYBIRD"
                            maxLength={30}
                            className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background text-text outline-none focus:border-accent"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-muted mb-1">Discount type</label>
                        <select
                            value={discountType}
                            onChange={e => setDiscountType(e.target.value as 'percent' | 'fixed')}
                            className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background text-text outline-none focus:border-accent"
                        >
                            <option value="percent">Percent off</option>
                            <option value="fixed">Fixed amount off</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-muted mb-1">
                            {discountType === 'percent' ? 'Discount (%)' : 'Discount (£)'}
                        </label>
                        <input
                            type="number"
                            value={discountValue}
                            onChange={e => setDiscountValue(e.target.value)}
                            min={discountType === 'percent' ? 1 : 0.01}
                            max={discountType === 'percent' ? 100 : undefined}
                            step={discountType === 'percent' ? 1 : 0.01}
                            required
                            className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background text-text outline-none focus:border-accent"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-muted mb-1">Minimum order (£, optional)</label>
                        <input
                            type="number"
                            value={minOrder}
                            onChange={e => setMinOrder(e.target.value)}
                            min={0}
                            step={0.01}
                            className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background text-text outline-none focus:border-accent"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-muted mb-1">Max uses (optional)</label>
                        <input
                            type="number"
                            value={maxUses}
                            onChange={e => setMaxUses(e.target.value)}
                            min={1}
                            placeholder="Unlimited"
                            className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background text-text outline-none focus:border-accent"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-muted mb-1">Valid from</label>
                            <input
                                type="date"
                                value={validFrom}
                                onChange={e => setValidFrom(e.target.value)}
                                className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background text-text outline-none focus:border-accent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-muted mb-1">Valid to</label>
                            <input
                                type="date"
                                value={validTo}
                                onChange={e => setValidTo(e.target.value)}
                                className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background text-text outline-none focus:border-accent"
                            />
                        </div>
                    </div>
                </div>
                {error && <p className="text-accent text-xs">{error}</p>}
                <button
                    type="submit"
                    disabled={creating}
                    className="h-10 px-6 rounded-sm bg-[#0A0A0F] text-white font-semibold text-sm hover:bg-[#2a2a3f] transition disabled:opacity-60"
                >
                    {creating ? 'Creating…' : 'Create Code'}
                </button>
            </form>

            {loading ? (
                <p className="text-muted text-center py-8">Loading codes…</p>
            ) : codes.length === 0 ? (
                <p className="text-muted text-center py-8">No promo codes yet. Create your first one above.</p>
            ) : (
                <div className="space-y-3">
                    {codes.map(c => (
                        <div key={c.id} className="bg-surface border border-border rounded-none p-4">
                            {editingId === c.id ? (
                                <div className="space-y-3">
                                    <p className="font-mono font-bold text-text">{c.code}</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div>
                                            <label className="block text-xs text-muted mb-1">
                                                {c.discount_type === 'percent' ? 'Discount (%)' : 'Discount (£)'}
                                            </label>
                                            <input
                                                type="number"
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                className="w-full border border-border rounded-sm px-2 py-1.5 text-sm bg-background text-text outline-none focus:border-accent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-muted mb-1">Min order (£)</label>
                                            <input
                                                type="number"
                                                value={editMinOrder}
                                                onChange={e => setEditMinOrder(e.target.value)}
                                                className="w-full border border-border rounded-sm px-2 py-1.5 text-sm bg-background text-text outline-none focus:border-accent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-muted mb-1">Max uses</label>
                                            <input
                                                type="number"
                                                value={editMaxUses}
                                                onChange={e => setEditMaxUses(e.target.value)}
                                                placeholder="Unlimited"
                                                className="w-full border border-border rounded-sm px-2 py-1.5 text-sm bg-background text-text outline-none focus:border-accent"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 col-span-2 sm:col-span-1">
                                            <div>
                                                <label className="block text-xs text-muted mb-1">From</label>
                                                <input
                                                    type="date"
                                                    value={editValidFrom}
                                                    onChange={e => setEditValidFrom(e.target.value)}
                                                    className="w-full border border-border rounded-sm px-2 py-1.5 text-sm bg-background text-text outline-none focus:border-accent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-muted mb-1">To</label>
                                                <input
                                                    type="date"
                                                    value={editValidTo}
                                                    onChange={e => setEditValidTo(e.target.value)}
                                                    className="w-full border border-border rounded-sm px-2 py-1.5 text-sm bg-background text-text outline-none focus:border-accent"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {error && <p className="text-accent text-xs">{error}</p>}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => saveEdit(c)}
                                            disabled={savingEdit}
                                            className="h-9 px-4 rounded-sm bg-[#0A0A0F] text-white font-semibold text-xs hover:bg-[#2a2a3f] transition disabled:opacity-60"
                                        >
                                            {savingEdit ? 'Saving…' : 'Save'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setEditingId(null); setError('') }}
                                            className="h-9 px-4 rounded-sm border border-border text-xs text-muted hover:text-text transition"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="font-mono font-bold text-text">{c.code}</p>
                                        <p className="text-xs text-muted mt-0.5">
                                            {discountLabel(c)}
                                            {c.min_order_pence > 0 && ` · min order ${formatPence(c.min_order_pence)}`}
                                            {' · '}{c.uses_count} / {c.max_uses ?? '∞'} used
                                            {c.valid_to && ` · expires ${new Date(c.valid_to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button onClick={() => startEdit(c)} className="text-xs text-accent hover:underline font-medium">
                                            Edit
                                        </button>
                                        <button onClick={() => handleDelete(c.id, c.code)} className="text-xs text-muted hover:text-accent">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
