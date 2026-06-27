'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(value: number): string {
    if (value === 0) return '£0'
    if (value >= 1_000_000) {
        return '£' + (value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 2) + 'M'
    }
    if (value >= 1_000) {
        const s = value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        return '£' + s
    }
    return '£' + value.toFixed(2)
}

/** Convert a hex colour like #E63950 to "r,g,b" for use in rgba() strings. */
function hexToRgb(hex: string): string {
    const h = hex.replace('#', '')
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return `${r},${g},${b}`
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconCalc() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="10" x2="10" y2="10" />
            <line x1="14" y1="10" x2="16" y2="10" />
            <line x1="8" y1="14" x2="10" y2="14" />
            <line x1="14" y1="14" x2="16" y2="14" />
            <line x1="8" y1="18" x2="10" y2="18" />
            <line x1="14" y1="18" x2="16" y2="18" />
        </svg>
    )
}

function IconTicket() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        </svg>
    )
}

function IconPound() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 18H6l3-6V8a3 3 0 1 1 6 0" />
            <line x1="6" y1="12" x2="13" y2="12" />
        </svg>
    )
}

function IconBarChart() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
            <line x1="2" y1="20" x2="22" y2="20" />
        </svg>
    )
}

function IconGift() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 12 20 22 4 22 4 12" />
            <rect x="2" y="7" width="20" height="5" />
            <line x1="12" y1="22" x2="12" y2="7" />
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>
    )
}

function IconWallet() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 12V8H6a2 2 0 0 1 0-4h14v4" />
            <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
            <circle cx="18" cy="12" r="2" fill="currentColor" stroke="none" />
        </svg>
    )
}

function IconCalendar() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    )
}

function IconShield() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
        </svg>
    )
}

// ─── Stepper Input ────────────────────────────────────────────────────────────

interface StepperInputProps {
    id: string
    value: string
    onChange: (val: string) => void
    step: number
    min: number
    placeholder: string
    icon: React.ReactNode
    label: string
    prefix?: string
    /** Accent hex colour — drives the icon & focus ring tint */
    accentColor: string
    /** The text color of the input */
    color: string
    /** Glass panel background opacity (0–1). Lower = more transparent. */
    glassTint: number
}

function StepperInput({
    id, value, onChange, step, min, placeholder, icon, label, prefix, accentColor, color, glassTint,
}: StepperInputProps) {
    const parsed = parseFloat(value) || 0
    const rgb = hexToRgb(accentColor)

    const increment = useCallback(() => {
        const next = Math.max(min, parsed + step)
        onChange(step < 1 ? next.toFixed(2) : String(next))
    }, [parsed, step, min, onChange])

    const decrement = useCallback(() => {
        const next = Math.max(min, parsed - step)
        onChange(step < 1 ? next.toFixed(2) : String(next))
    }, [parsed, step, min, onChange])

    return (
        <div>
            <label htmlFor={id} style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '1.4px',
                textTransform: 'uppercase',
                color: color,
                marginBottom: '8px',
            }}>
                {label}
            </label>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: `rgba(255,255,255,${glassTint})`,
                    border: '1px solid rgba(255,255,255,0.10)',
                    boxShadow: '0 0 10px rgba(230, 57, 80, 0.15)',
                    borderRadius: '14px',
                    padding: '0 4px 0 16px',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                }}
                className={`stepper-wrap stepper-wrap-${id}`}
                data-accent-rgb={rgb}
            >
                {/* Left icon */}
                <span style={{
                    color: accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                    marginRight: '10px',
                }}>
                    {icon}
                </span>

                {/* Optional prefix (£) */}
                {prefix && (
                    <span style={{
                        color: 'rgba(255,255,255,0.45)',
                        fontSize: '17px',
                        fontWeight: 500,
                        marginRight: '2px',
                        flexShrink: 0,
                    }}>
                        {prefix}
                    </span>
                )}

                {/* Actual input */}
                <input
                    id={id}
                    type="number"
                    min={min}
                    step={step}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: '17px',
                        fontWeight: 600,
                        color: color,
                        padding: '16px 0',
                        appearance: 'textfield',
                        MozAppearance: 'textfield',
                        WebkitAppearance: 'none',
                        minWidth: 0,
                    } as React.CSSProperties}
                />

                {/* Stepper buttons */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    margin: '6px 4px',
                    gap: '2px',
                }}>
                    <button
                        type="button"
                        aria-label={`Increase ${label}`}
                        onClick={increment}
                        style={{
                            width: '30px',
                            height: '26px',
                            background: 'rgba(255,255,255,0.07)',
                            border: '1px solid rgba(255,255,255,0.10)',
                            boxShadow: '0 0 10px rgba(230, 57, 80, 0.15)',
                            borderRadius: '7px 7px 4px 4px',
                            color: accentColor,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.15s, color 0.15s',
                            lineHeight: 1,
                            padding: 0,
                        }}
                        className="stepper-btn"
                        data-accent={accentColor}
                        data-accent-rgb={rgb}
                    >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                            <path d="M5 2 L8.5 7 L1.5 7 Z" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        aria-label={`Decrease ${label}`}
                        onClick={decrement}
                        style={{
                            width: '30px',
                            height: '26px',
                            background: 'rgba(255,255,255,0.07)',
                            border: '1px solid rgba(255,255,255,0.10)',
                            boxShadow: '0 0 10px rgba(230, 57, 80, 0.15)',
                            borderRadius: '4px 4px 7px 7px',
                            color: accentColor,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.15s, color 0.15s',
                            lineHeight: 1,
                            padding: 0,
                        }}
                        className="stepper-btn"
                        data-accent={accentColor}
                        data-accent-rgb={rgb}
                    >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                            <path d="M5 8 L1.5 3 L8.5 3 Z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RevenueCalculatorProps {
    /**
     * Primary accent colour used for: bonus row highlight, icon tints,
     * CTA button, focus rings, and the footer shield.
     * @default '#E63950'
     */
    accentColor?: string

    /**
     * Hex colour of the ambient glow orb behind the card.
     * Set to 'transparent' or same as page bg to disable the glow entirely.
     * @default '#E63950'
     */
    glowColor?: string

    /**
     * Intensity of the glow (0–1). Controls the glow alpha.
     * @default 0.25
     */
    glowIntensity?: number

    /**
     * White-tint alpha of the glass card background (0 = fully transparent, 1 = white).
     * Adjust this to control how "frosted" the card feels against its backdrop.
     * @default 0.07
     */
    glassTint?: number

    /**
     * White-tint alpha for the inner input fields and summary card rows.
     * Keep lower than glassTint for depth layering.
     * @default 0.04
     */
    innerTint?: number

    /**
     * "Create Event" CTA button present in the calculator
     * @default true
     */
    showCta?: boolean

    /**
     * href for the "Create Event" CTA button.
     * @default '/organiser/apply'
     */
    ctaHref?: string

    /**
     * Label text for the CTA button.
     * @default 'Create Event'
     */
    ctaLabel?: string

    /**
     * Text colour for the CTA button label.
     * @default '#FFFFFF'
     */
    ctaTextColor?: string

    /**
     * Title colour.
     * @default '#FFFFFF'
     */
    titleColor?: string

    /**
     * Subtitle / description text colour.
     * @default 'rgba(255,255,255,0.42)'
     */
    subtitleColor?: string

    /**
     * Row label colour (Standard Revenue, Total Revenue Potential labels).
     * @default 'rgba(255,255,255,0.78)'
     */
    rowLabelColor?: string

    /**
     * Row value colour for standard and total rows.
     * @default '#FFFFFF'
     */
    rowValueColor?: string

    /**
     * Maximum card width.
     * @default '480px'
     */
    maxWidth?: string
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RevenueCalculator({
    accentColor = '#E63950',
    glowColor = '#E63950',
    glowIntensity = 0.25,
    glassTint = 0.07,
    innerTint = 0.04,
    showCta = true,
    ctaHref = '/organiser/apply',
    ctaLabel = 'Create Event',
    ctaTextColor = '#FFFFFF',
    titleColor = '#FFFFFF',
    subtitleColor = '#FFFFFF',
    rowLabelColor = '#FFFFFF',
    rowValueColor = '#FFFFFF',
    maxWidth = '480px',
    // maxWidth = '100%',
}: RevenueCalculatorProps) {
    const [numTickets, setNumTickets] = useState<string>('1000')
    const [ticketPrice, setTicketPrice] = useState<string>('20.00')

    const { standardRevenue, bonusEarnings, totalPotential } = useMemo(() => {
        const price = parseFloat(ticketPrice) || 0
        const tickets = parseInt(numTickets, 10) || 0
        const standardRevenue = price * tickets
        const bonusEarnings = standardRevenue * 0.10 * 0.50   // 50% of 10% = 5%
        const totalPotential = standardRevenue + bonusEarnings
        return { standardRevenue, bonusEarnings, totalPotential }
    }, [ticketPrice, numTickets])

    const accentRgb = hexToRgb(accentColor)
    const glowRgb = hexToRgb(glowColor === 'transparent' ? '#000000' : glowColor)

    return (
        <>
            {/* ── Outer sizing wrapper ── */}
            <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth }}>

                {/* Ambient glow — purely decorative, inherits from behind the card */}
                {glowColor !== 'transparent' && (
                    <div style={{
                        position: 'absolute',
                        inset: '-48px',
                        background: `radial-gradient(ellipse 65% 55% at 50% 50%, rgba(${glowRgb},${glowIntensity}) 0%, rgba(${glowRgb},${glowIntensity * 0.4}) 55%, transparent 100%)`,
                        borderRadius: '48px',
                        zIndex: 0,
                        pointerEvents: 'none',
                        filter: 'blur(24px)',
                    }} />
                )}

                {/* ── Glass card ── */}
                <div style={{
                    position: 'relative',
                    zIndex: 1,
                    // Pure glass: no opaque fill — the backdrop-filter does the work
                    background: `rgba(255,255,255,${glassTint})`,
                    backdropFilter: 'blur(32px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(32px) saturate(160%)',
                    borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.13)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.10)',
                    padding: '32px',
                    fontFamily: 'var(--font-body, "DM Sans", sans-serif)',
                    color: '#FFFFFF',
                }}>

                    {/* ── Header ── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: `rgba(${accentRgb},0.12)`,
                            border: `1px solid rgba(${accentRgb},0.25)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: accentColor,
                            flexShrink: 0,
                        }}>
                            <IconCalc />
                        </div>
                        <h2 style={{
                            fontSize: '22px',
                            fontWeight: 700,
                            color: titleColor,
                            margin: 0,
                            letterSpacing: '-0.3px',
                        }}>
                            Revenue Calculator
                        </h2>
                    </div>
                    <p style={{
                        fontSize: '14px',
                        color: subtitleColor,
                        margin: '0 0 28px 0',
                        lineHeight: 1.5,
                    }}>
                        See how much extra revenue you could earn by selling tickets through{' '}
                        <span style={{ color: accentColor, fontWeight: 600 }}>Hexlura</span>.
                    </p>

                    {/* ── Inputs ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
                        <StepperInput
                            id="calc-num-tickets"
                            label="NUMBER OF TICKETS"
                            value={numTickets}
                            onChange={setNumTickets}
                            step={50}
                            min={0}
                            placeholder="0"
                            icon={<IconTicket />}
                            accentColor={accentColor}
                            color={rowLabelColor}
                            glassTint={innerTint}
                        />
                        <StepperInput
                            id="calc-ticket-price"
                            label="TICKET PRICE (£)"
                            value={ticketPrice}
                            onChange={setTicketPrice}
                            step={1}
                            min={0}
                            placeholder="0.00"
                            icon={<IconPound />}
                            // prefix="£"
                            accentColor={accentColor}
                            color={rowLabelColor}
                            glassTint={innerTint}
                        />
                    </div>

                    {/* ── Divider ── */}
                    {/* <div style={{
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.12) 70%, transparent 100%)',
                        marginBottom: '10px',
                    }} /> */}

                    {/* ── Revenue Summary Card ── */}
                    <div style={{
                        background: `rgba(255,255,255,${innerTint})`,
                        border: '1px solid rgba(255,255,255,0.09)',
                        borderRadius: '18px',
                        overflow: 'hidden',
                        marginBottom: '20px',
                    }}>

                        {/* Standard Revenue Row */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '18px 20px',
                            borderBottom: '1px solid rgba(255,255,255,0.07)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: `rgba(${accentRgb},0.12)`,
                                    border: `1px solid rgba(${accentRgb},0.25)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: accentColor,
                                    flexShrink: 0,
                                }}>
                                    <IconBarChart />
                                </div>
                                <span style={{ fontSize: '15px', fontWeight: 500, color: rowLabelColor }}>
                                    Standard Revenue
                                </span>
                            </div>
                            <span style={{
                                fontSize: '20px',
                                fontWeight: 700,
                                color: rowValueColor,
                                letterSpacing: '-0.5px',
                                fontVariantNumeric: 'tabular-nums',
                            }}>
                                {fmt(standardRevenue)}
                            </span>
                        </div>

                        {/* Bonus Earnings Row — accent highlight */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '18px 20px',
                            background: `rgba(${accentRgb},0.09)`,
                            // background: `rgba(10, 10, 15, 1)`,
                            borderBottom: `1px solid rgba(${accentRgb},0.20)`,
                            position: 'relative',
                        }}>
                            {/* Left accent bar */}
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: '3px',
                                background: `linear-gradient(180deg, ${accentColor} 0%, rgba(${accentRgb},0.5) 100%)`,
                                borderRadius: '0 2px 2px 0',
                            }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: `rgba(${accentRgb},0.15)`,
                                    border: `1px solid rgba(${accentRgb},0.28)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: accentColor,
                                    flexShrink: 0,
                                }}>
                                    <IconGift />
                                </div>
                                <span style={{ fontSize: '15px', fontWeight: 600, color: accentColor }}>
                                    Extra 5% Bonus Earnings
                                </span>
                            </div>
                            <span style={{
                                fontSize: '20px',
                                fontWeight: 700,
                                color: accentColor,
                                letterSpacing: '-0.5px',
                                fontVariantNumeric: 'tabular-nums',
                                textShadow: `0 0 20px rgba(${accentRgb},0.40)`,
                            }}>
                                {fmt(bonusEarnings)}
                            </span>
                        </div>

                        {/* Dashed separator */}
                        <div style={{
                            height: '1px',
                            background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 6px, transparent 6px, transparent 12px)',
                        }} />

                        {/* Total Revenue Potential Row */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '18px 20px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: `rgba(${accentRgb},0.12)`,
                                    border: `1px solid rgba(${accentRgb},0.25)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: accentColor,
                                    flexShrink: 0,
                                }}>
                                    <IconWallet />
                                </div>
                                <span style={{ fontSize: '15px', fontWeight: 500, color: rowLabelColor }}>
                                    Total Revenue Potential
                                </span>
                            </div>
                            <span style={{
                                fontSize: '22px',
                                fontWeight: 800,
                                color: rowValueColor,
                                letterSpacing: '-0.5px',
                                fontVariantNumeric: 'tabular-nums',
                            }}>
                                {fmt(totalPotential)}
                            </span>
                        </div>
                    </div>

                    {/* ── CTA Button ── */}

                    {showCta && (
                        <Link
                            href={ctaHref}
                            id="revenue-calc-cta"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '17px 24px',
                                background: `linear-gradient(135deg, ${accentColor} 0%, rgba(${accentRgb},0.75) 100%)`,
                                borderRadius: '14px',
                                fontSize: '15px',
                                fontWeight: 700,
                                letterSpacing: '0.6px',
                                textTransform: 'uppercase',
                                color: ctaTextColor,
                                textDecoration: 'none',
                                boxShadow: `0 0 28px rgba(${accentRgb},0.32), 0 4px 16px rgba(0,0,0,0.22)`,
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                boxSizing: 'border-box',
                            }}
                            className="rc-cta-btn"
                            data-accent-rgb={accentRgb}
                        >
                            <IconCalendar />
                            {ctaLabel}
                        </Link>
                    )}

                    {/* ── Footer trust note ── */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '16px',
                        color: 'black',
                        fontSize: '12px',
                        fontWeight: 500,
                    }}>
                        <span style={{ color: accentColor, opacity: 0.65 }}>
                            <IconShield />
                        </span>
                        Transparent pricing. No hidden fees. Built for organizers.
                    </div>
                </div>
            </div>

            <style>{`
                /* Hide native number spinners */
                input[type=number]::-webkit-outer-spin-button,
                input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }

                /* Stepper wrapper — focus ring driven by inline data-accent-rgb attribute via JS */
                .stepper-wrap:focus-within {
                    border-color: rgba(${accentRgb}, 0.55) !important;
                    box-shadow: 0 0 0 3px rgba(${accentRgb}, 0.12);
                }

                /* Stepper button hover */
                .stepper-btn:hover {
                    background: rgba(${accentRgb}, 0.15) !important;
                    color: ${accentColor} !important;
                    border-color: rgba(${accentRgb}, 0.30) !important;
                }

                /* CTA hover / active */
                .rc-cta-btn:hover {
                    transform: translateY(-2px) !important;
                    box-shadow: 0 0 44px rgba(${accentRgb}, 0.48), 0 8px 24px rgba(0,0,0,0.28) !important;
                }
                .rc-cta-btn:active {
                    transform: translateY(0px) !important;
                    box-shadow: 0 0 20px rgba(${accentRgb}, 0.28), 0 2px 8px rgba(0,0,0,0.18) !important;
                }
            `}</style>
        </>
    )
}
