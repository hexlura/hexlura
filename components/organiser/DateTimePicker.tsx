'use client'

import { useState, useRef, useEffect } from 'react'

interface DateTimePickerProps {
    value: string        // "YYYY-MM-DDTHH:mm" (24-hr, local time)
    onChange: (val: string) => void
    min?: string         // "YYYY-MM-DDTHH:mm" min constraint
    placeholder?: string
    required?: boolean
    className?: string
}

// Parse "YYYY-MM-DDTHH:mm" → parts
function parseValue(v: string) {
    if (!v) return null
    const [datePart, timePart] = v.split('T')
    if (!datePart) return null
    const [hStr, mStr] = (timePart || '00:00').split(':')
    const h24 = parseInt(hStr || '0', 10)
    const min = parseInt(mStr || '0', 10)
    const ampm: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM'
    const hour12 = h24 % 12 || 12
    return { date: datePart, hour: hour12, minute: min, ampm }
}

// Format for display
function formatDisplay(v: string): string {
    const p = parseValue(v)
    if (!p) return ''
    const d = new Date(p.date + 'T00:00:00')
    if (isNaN(d.getTime())) return ''
    const dateStr = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
    return `${dateStr}, ${p.hour}:${String(p.minute).padStart(2, '0')} ${p.ampm}`
}

// Build "YYYY-MM-DDTHH:mm" from parts
function buildValue(date: string, hour12: number, minute: number, ampm: 'AM' | 'PM'): string {
    const h24 = ampm === 'AM' ? (hour12 % 12) : (hour12 % 12 + 12)
    return `${date}T${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function DateTimePicker({ value, onChange, min, placeholder, required, className }: DateTimePickerProps) {
    const [open, setOpen] = useState(false)

    // Draft state inside the popup
    const initial = parseValue(value)
    const [draftDate, setDraftDate] = useState(initial?.date ?? '')
    const [draftHour, setDraftHour] = useState(initial?.hour ?? 12)
    const [draftMinute, setDraftMinute] = useState(initial?.minute ?? 0)
    const [draftAmPm, setDraftAmPm] = useState<'AM' | 'PM'>(initial?.ampm ?? 'AM')

    // Sync draft when value changes externally
    useEffect(() => {
        const p = parseValue(value)
        if (p) {
            setDraftDate(p.date)
            setDraftHour(p.hour)
            setDraftMinute(p.minute)
            setDraftAmPm(p.ampm)
        }
    }, [value])

    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!open) return
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [open])

    function handleOpen() {
        // Reset draft to current value when opening
        const p = parseValue(value)
        if (p) {
            setDraftDate(p.date)
            setDraftHour(p.hour)
            setDraftMinute(p.minute)
            setDraftAmPm(p.ampm)
        } else {
            // Default to today at 12:00 PM
            const today = new Date()
            const yyyy = today.getFullYear()
            const mm = String(today.getMonth() + 1).padStart(2, '0')
            const dd = String(today.getDate()).padStart(2, '0')
            setDraftDate(`${yyyy}-${mm}-${dd}`)
            setDraftHour(12)
            setDraftMinute(0)
            setDraftAmPm('AM')
        }
        setOpen(true)
    }

    function handleOK() {
        if (!draftDate) return
        onChange(buildValue(draftDate, draftHour, draftMinute, draftAmPm))
        setOpen(false)
    }

    function handleClear() {
        onChange('')
        setOpen(false)
    }

    function clampHour(n: number) {
        if (isNaN(n)) return 12
        return Math.min(12, Math.max(1, n))
    }

    function clampMinute(n: number) {
        if (isNaN(n)) return 0
        return Math.min(59, Math.max(0, n))
    }

    const displayText = value ? formatDisplay(value) : ''
    const minDate = min ? min.split('T')[0] : undefined

    return (
        <div ref={ref} className="relative w-full">
            {/* Trigger */}
            <button
                type="button"
                onClick={handleOpen}
                className={className}
                style={{ textAlign: 'left', cursor: 'pointer' }}
            >
                {displayText || <span style={{ color: '#8888AA' }}>{placeholder ?? 'Select date & time'}</span>}
            </button>

            {/* Popup */}
            {open && (
                <div
                    className="absolute z-50 mt-1 left-0 bg-surface border border-border rounded-sm shadow-xl"
                    style={{ minWidth: '280px' }}
                >
                    <div className="p-4 space-y-4">
                        {/* Date */}
                        <div>
                            <p className="text-xs text-muted mb-1.5 uppercase tracking-wide">Date</p>
                            <input
                                type="date"
                                value={draftDate}
                                min={minDate}
                                onChange={e => setDraftDate(e.target.value)}
                                required={required}
                                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                            />
                        </div>

                        {/* Time */}
                        <div>
                            <p className="text-xs text-muted mb-1.5 uppercase tracking-wide">Time</p>
                            <div className="flex items-center gap-2">
                                {/* Hour */}
                                <input
                                    type="number"
                                    min={1}
                                    max={12}
                                    value={draftHour}
                                    onChange={e => setDraftHour(clampHour(parseInt(e.target.value, 10)))}
                                    className="w-14 bg-background border border-border rounded-sm px-2 py-2 text-sm text-text text-center font-mono focus:outline-none focus:border-accent"
                                />
                                <span className="text-text font-mono text-lg">:</span>
                                {/* Minute */}
                                <input
                                    type="number"
                                    min={0}
                                    max={59}
                                    value={String(draftMinute).padStart(2, '0')}
                                    onChange={e => setDraftMinute(clampMinute(parseInt(e.target.value, 10)))}
                                    className="w-14 bg-background border border-border rounded-sm px-2 py-2 text-sm text-text text-center font-mono focus:outline-none focus:border-accent"
                                />
                                {/* AM/PM */}
                                <div className="flex border border-border rounded-sm overflow-hidden ml-1">
                                    <button
                                        type="button"
                                        onClick={() => setDraftAmPm('AM')}
                                        className="px-3 py-2 text-sm font-semibold transition-colors"
                                        style={{
                                            background: draftAmPm === 'AM' ? '#E63950' : 'transparent',
                                            color: draftAmPm === 'AM' ? '#fff' : '#8888AA',
                                        }}
                                    >
                                        AM
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDraftAmPm('PM')}
                                        className="px-3 py-2 text-sm font-semibold transition-colors"
                                        style={{
                                            background: draftAmPm === 'PM' ? '#E63950' : 'transparent',
                                            color: draftAmPm === 'PM' ? '#fff' : '#8888AA',
                                        }}
                                    >
                                        PM
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between items-center pt-1">
                            <button
                                type="button"
                                onClick={handleClear}
                                className="text-xs text-muted hover:text-accent transition-colors"
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={handleOK}
                                disabled={!draftDate}
                                className="px-5 py-2 bg-accent text-white text-sm font-semibold rounded-sm disabled:opacity-40 hover:bg-[#cc2f43] transition-colors"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
