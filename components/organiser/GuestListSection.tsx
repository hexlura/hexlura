'use client'

import { useState, useEffect, useCallback } from 'react'

interface CompCode {
    id: string
    code: string
    comp_ticket_type_id: string | null
    max_uses: number | null
    uses_count: number
    ticket_types: { name: string } | null
}

interface TicketTypeOption {
    id: string
    name: string
}

interface GuestListSectionProps {
    eventId: string
    ticketTypes: TicketTypeOption[]
}

function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = 'GUEST-'
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
}

export function GuestListSection({ eventId, ticketTypes }: GuestListSectionProps) {
    const [codes, setCodes] = useState<CompCode[]>([])
    const [loadingCodes, setLoadingCodes] = useState(true)
    const [newCode, setNewCode] = useState(() => generateCode())
    const [newTicketTypeId, setNewTicketTypeId] = useState('')
    const [newUsageLimit, setNewUsageLimit] = useState('1')
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState('')

    const fetchCodes = useCallback(async () => {
        const res = await fetch(`/api/organiser/comp-codes?event_id=${eventId}`)
        const data = await res.json()
        setCodes(data.codes || [])
        setLoadingCodes(false)
    }, [eventId])

    useEffect(() => {
        fetchCodes()
    }, [fetchCodes])

    async function createCode() {
        if (!newCode.trim()) return
        setError('')
        setCreating(true)
        const res = await fetch('/api/organiser/comp-codes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_id: eventId,
                code: newCode,
                comp_ticket_type_id: newTicketTypeId || null,
                max_uses: parseInt(newUsageLimit) || 1,
            }),
        })
        const data = await res.json()
        if (!res.ok) {
            setError(data.error || 'Failed to create code')
        } else {
            setNewCode(generateCode())
            setNewTicketTypeId('')
            setNewUsageLimit('1')
            await fetchCodes()
        }
        setCreating(false)
    }

    async function deleteCode(id: string) {
        if (!confirm('Delete this comp code? This cannot be undone.')) return
        await fetch(`/api/organiser/comp-codes/${id}`, { method: 'DELETE' })
        setCodes(prev => prev.filter(c => c.id !== id))
    }

    const inputClass = "w-full bg-white border border-[#C0C0C8] rounded-lg px-3 py-2.5 text-sm text-[#0A0A0F] placeholder:text-[#666677] focus:outline-none focus:border-[#E63950]"
    const labelClass = "text-xs text-[#666677] block mb-1.5"

    return (
        <div className="mt-8 pt-6" style={{ borderTop: '1px solid #C0C0C8' }}>
            <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-[#E63950] text-sm">GL</span>
                <h2 style={{ fontFamily: 'var(--font-bebas-neue, Bebas Neue, sans-serif)', fontSize: 20, color: '#0A0A0F', letterSpacing: '0.05em' }}>
                    GUEST LIST / COMP TICKETS
                </h2>
            </div>
            <p className="text-xs mb-5" style={{ color: '#666677' }}>
                Create complimentary codes for guests. When entered at checkout, the ticket becomes £0.00 and payment is skipped entirely.
            </p>

            {/* Existing codes */}
            {loadingCodes ? (
                <p className="text-xs mb-4" style={{ color: '#666677' }}>Loading codes...</p>
            ) : codes.length === 0 ? (
                <p className="text-xs mb-4" style={{ color: '#666677' }}>No comp codes yet.</p>
            ) : (
                <div className="space-y-2 mb-5">
                    {codes.map(c => {
                        const usesLeft = c.max_uses !== null ? c.max_uses - c.uses_count : null
                        return (
                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F5F5F7', border: '1px solid #C0C0C8', borderRadius: 8, padding: '10px 14px' }}>
                                <div>
                                    <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#E63950', fontWeight: 700 }}>{c.code}</span>
                                    <div style={{ display: 'flex', gap: 12, marginTop: 3 }}>
                                        <span style={{ fontSize: 11, color: '#666677' }}>{c.ticket_types?.name || 'Any ticket type'}</span>
                                        <span style={{ fontSize: 11, color: '#666677' }}>
                                            {c.uses_count} used{usesLeft !== null ? ` · ${usesLeft} remaining` : ''}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => deleteCode(c.id)}
                                    style={{ fontSize: 12, color: '#E63950', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 16, flexShrink: 0 }}
                                >
                                    Delete
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Create new code */}
            <div style={{ background: '#F5F5F7', border: '1px solid #C0C0C8', borderRadius: 8, padding: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0F', marginBottom: 12 }}>Create New Comp Code</p>
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <label className={labelClass}>Code</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="text"
                                value={newCode}
                                onChange={e => setNewCode(e.target.value.toUpperCase())}
                                className={inputClass}
                                placeholder="GUEST-XXXXXX"
                            />
                            <button
                                type="button"
                                onClick={() => setNewCode(generateCode())}
                                style={{ border: '1px solid #C0C0C8', color: '#666677', padding: '4px 12px', fontSize: 12, borderRadius: 8, background: 'white', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                            >
                                Shuffle
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Ticket Type</label>
                        <select value={newTicketTypeId} onChange={e => setNewTicketTypeId(e.target.value)} className={inputClass}>
                            <option value="">Any ticket type</option>
                            {ticketTypes.map(tt => (
                                <option key={tt.id} value={tt.id}>{tt.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Usage Limit</label>
                        <input
                            type="number"
                            min="1"
                            max="10000"
                            value={newUsageLimit}
                            onChange={e => setNewUsageLimit(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                </div>
                {error && <p style={{ fontSize: 12, color: '#E63950', marginTop: 8 }}>{error}</p>}
                <button
                    type="button"
                    onClick={createCode}
                    disabled={creating || !newCode.trim()}
                    style={{
                        marginTop: 12,
                        width: '100%',
                        padding: '10px 0',
                        background: creating || !newCode.trim() ? '#C0C0C8' : '#0A0A0F',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: creating || !newCode.trim() ? 'not-allowed' : 'pointer',
                    }}
                >
                    {creating ? 'Creating...' : 'Create Code'}
                </button>
            </div>
        </div>
    )
}
