'use client'

import React, { useState, useRef, useEffect, useLayoutEffect, useId } from 'react'
import { createPortal } from 'react-dom'

// Drop-in replacement for a native <select> whose open list matches the theme
// (the browser draws a native select's list, so CSS cannot restyle it).
// Usage is identical: <ThemedSelect value onChange={e => ...}> <option .../> </ThemedSelect>
// onChange receives an event-like object with target.value (always a string, like the DOM).

interface Opt {
    value: string
    label: string
    disabled: boolean
}

function textOf(node: React.ReactNode): string {
    if (node === null || node === undefined || typeof node === 'boolean') return ''
    if (typeof node === 'string' || typeof node === 'number') return String(node)
    if (Array.isArray(node)) return node.map(textOf).join('')
    if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children)
    return ''
}

function collectOptions(children: React.ReactNode, out: Opt[] = []): Opt[] {
    React.Children.forEach(children, child => {
        if (!React.isValidElement(child)) return
        const props = child.props as { value?: string | number; disabled?: boolean; children?: React.ReactNode }
        if (child.type === 'option') {
            const label = textOf(props.children)
            out.push({ value: props.value !== undefined ? String(props.value) : label, label, disabled: !!props.disabled })
        } else if (child.type === React.Fragment || child.type === 'optgroup') {
            collectOptions(props.children, out)
        }
    })
    return out
}

export interface ThemedSelectProps {
    value?: string | number
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
    children: React.ReactNode
    className?: string
    style?: React.CSSProperties
    disabled?: boolean
    required?: boolean
    name?: string
    id?: string
    'aria-label'?: string
}

// Classes that position/size the control inside its parent belong on the wrapper
// (a grid/flex child), everything else styles the trigger button.
const LAYOUT_TOKEN = /^(?:(?:sm|md|lg|xl|2xl):)?(?:-?m[trblxy]?-|w-|max-w-|min-w-|col-|row-|self-|order-|flex-|grow|shrink|basis-|justify-self-)/

function splitClasses(className: string | undefined): { wrapper: string; trigger: string | undefined } {
    if (className === undefined) return { wrapper: '', trigger: undefined }
    const wrapper: string[] = []
    const trigger: string[] = []
    for (const t of className.split(/\s+/).filter(Boolean)) (LAYOUT_TOKEN.test(t) ? wrapper : trigger).push(t)
    return { wrapper: wrapper.join(' '), trigger: trigger.join(' ') }
}

const DEFAULT_TRIGGER =
    'bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-warm-red/25'

export function ThemedSelect({
    value,
    onChange,
    children,
    className,
    style,
    disabled,
    required,
    name,
    id,
    'aria-label': ariaLabel,
}: ThemedSelectProps) {
    const { wrapper: wrapperClass, trigger: triggerClass } = splitClasses(className)
    const options = collectOptions(children)
    const current = value === undefined || value === null ? '' : String(value)
    const selectedIndex = Math.max(0, options.findIndex(o => o.value === current))
    const selected = options[selectedIndex]

    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(selectedIndex)
    const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const listId = useId()

    function place() {
        const el = triggerRef.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const spaceBelow = window.innerHeight - r.bottom
        // Flip above when there's little room below and more room above
        if (spaceBelow < 260 && r.top > spaceBelow) {
            setPos({ bottom: window.innerHeight - r.top + 8, left: r.left, width: r.width })
        } else {
            setPos({ top: r.bottom + 8, left: r.left, width: r.width })
        }
    }

    useLayoutEffect(() => {
        if (open) place()
    }, [open])

    useEffect(() => {
        if (!open) return
        function onDown(e: MouseEvent) {
            const t = e.target as Node
            if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return
            setOpen(false)
        }
        function onScroll(e: Event) {
            if (panelRef.current?.contains(e.target as Node)) return
            setOpen(false)
        }
        function onResize() { setOpen(false) }
        document.addEventListener('mousedown', onDown)
        window.addEventListener('scroll', onScroll, true)
        window.addEventListener('resize', onResize)
        return () => {
            document.removeEventListener('mousedown', onDown)
            window.removeEventListener('scroll', onScroll, true)
            window.removeEventListener('resize', onResize)
        }
    }, [open])

    // Keep the highlighted row in view while navigating with the keyboard
    useEffect(() => {
        if (!open) return
        panelRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
    }, [active, open])

    function choose(index: number) {
        const opt = options[index]
        if (!opt || opt.disabled) return
        setOpen(false)
        triggerRef.current?.focus()
        if (opt.value !== current) {
            onChange?.({ target: { value: opt.value, name }, currentTarget: { value: opt.value, name } } as unknown as React.ChangeEvent<HTMLSelectElement>)
        }
    }

    function move(delta: number) {
        let i = active
        for (let n = 0; n < options.length; n++) {
            i = (i + delta + options.length) % options.length
            if (!options[i].disabled) break
        }
        setActive(i)
    }

    function onKeyDown(e: React.KeyboardEvent) {
        if (disabled) return
        if (!open) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
                e.preventDefault()
                setActive(selectedIndex)
                setOpen(true)
            }
            return
        }
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
        else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
        else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1) }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active) }
        else if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
        else if (e.key === 'Tab') setOpen(false)
    }

    // Render inside the themed wrapper (when present) so the scoped CSS variables still apply
    const host = typeof document !== 'undefined'
        ? (triggerRef.current?.closest('.organiser-theme, .warm-theme') as HTMLElement | null) ?? document.body
        : null

    return (
        <>
            <span className={`relative inline-flex max-w-full min-w-0 ${wrapperClass}`}>
                <button
                    ref={triggerRef}
                    id={id}
                    type="button"
                    role="combobox"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    aria-controls={open ? listId : undefined}
                    aria-label={ariaLabel}
                    disabled={disabled}
                    onClick={() => { if (!disabled) { setActive(selectedIndex); setOpen(o => !o) } }}
                    onKeyDown={onKeyDown}
                    className={`${triggerClass ?? DEFAULT_TRIGGER} w-full flex items-center justify-between gap-2 text-left disabled:opacity-60 disabled:cursor-not-allowed`}
                    style={style}
                >
                    <span className="truncate">{selected?.label ?? ''}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}>
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </button>
                {/* Keeps native form behaviour: `required` validation and form value */}
                {(required || name) && (
                    <input
                        tabIndex={-1}
                        aria-hidden="true"
                        required={required}
                        name={name}
                        value={current}
                        onChange={() => {}}
                        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                    />
                )}
            </span>

            {open && pos && host && createPortal(
                <div
                    ref={panelRef}
                    id={listId}
                    role="listbox"
                    className="fixed z-[70] bg-card border border-border rounded-2xl shadow-hover py-1.5 max-h-64 overflow-y-auto text-text"
                    style={{ ...pos, minWidth: pos.width, maxWidth: 'min(24rem, calc(100vw - 1rem))' }}
                >
                    {options.map((o, i) => {
                        const isSelected = i === selectedIndex
                        return (
                            <div
                                key={`${o.value}-${i}`}
                                data-index={i}
                                role="option"
                                aria-selected={isSelected}
                                aria-disabled={o.disabled}
                                onMouseEnter={() => !o.disabled && setActive(i)}
                                onClick={() => choose(i)}
                                className={`mx-1.5 px-3 py-2 rounded-xl text-sm flex items-center justify-between gap-3 ${
                                    o.disabled ? 'text-muted opacity-60 cursor-not-allowed' : 'cursor-pointer'
                                } ${i === active && !o.disabled ? 'bg-background' : ''} ${isSelected ? 'font-semibold' : ''}`}
                            >
                                <span className="truncate">{o.label}</span>
                                {isSelected && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E63950" strokeWidth="2.6" className="shrink-0">
                                        <path d="m5 12 5 5L20 7" />
                                    </svg>
                                )}
                            </div>
                        )
                    })}
                </div>,
                host,
            )}
        </>
    )
}
