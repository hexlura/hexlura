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
    label: string
    prefix: string
}

function StepperInput({
    id, value, onChange, step, min, placeholder, label, prefix
}: StepperInputProps) {
    const parsed = parseFloat(value) || 0

    const increment = useCallback(() => {
        const next = Math.max(min, parsed + step)
        onChange(step < 1 ? next.toFixed(2) : String(next))
    }, [parsed, step, min, onChange])

    const decrement = useCallback(() => {
        const next = Math.max(min, parsed - step)
        onChange(step < 1 ? next.toFixed(2) : String(next))
    }, [parsed, step, min, onChange])

    return (
        <div style={{ marginBottom: '22px' }}>
            <label
                htmlFor={id}
                style={{
                    display: 'block',
                    fontSize: '12px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    fontFamily: 'var(--font-mono), monospace',
                    marginBottom: '8px',
                    fontWeight: 600,
                }}
            >
                {label}
            </label>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '2px solid var(--text)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    background: 'transparent',
                    height: '48px',
                }}
            >
                {/* Prefix */}
                <span
                    style={{
                        padding: '0 14px',
                        background: 'var(--surface)',
                        fontFamily: 'var(--font-mono), monospace',
                        fontWeight: 600,
                        borderRight: '2px solid var(--text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: 'var(--text)',
                        userSelect: 'none',
                    }}
                >
                    {prefix}
                </span>

                {/* Actual Input */}
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
                        fontSize: '16px',
                        fontWeight: 600,
                        color: 'var(--text)',
                        padding: '0 14px',
                        fontFamily: 'var(--font-mono), monospace',
                        appearance: 'textfield',
                        MozAppearance: 'textfield',
                        WebkitAppearance: 'none',
                        minWidth: 0,
                        height: '100%',
                    } as React.CSSProperties}
                />

                {/* Steppers */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        borderLeft: '2px solid var(--text)',
                        width: '32px',
                    }}
                >
                    <button
                        type="button"
                        aria-label={`Increase ${label}`}
                        onClick={increment}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--surface)',
                            border: 'none',
                            borderBottom: '1px solid var(--text)',
                            cursor: 'pointer',
                            color: 'var(--text)',
                            padding: 0,
                            fontSize: '9px',
                            fontWeight: 'bold',
                        }}
                    >
                        ▲
                    </button>
                    <button
                        type="button"
                        aria-label={`Decrease ${label}`}
                        onClick={decrement}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--surface)',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text)',
                            padding: 0,
                            fontSize: '9px',
                            fontWeight: 'bold',
                        }}
                    >
                        ▼
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RevenueCalculatorProps {
    accentColor?: string
    glowColor?: string
    glowIntensity?: number
    glassTint?: number
    innerTint?: number
    showCta?: boolean
    ctaHref?: string
    ctaLabel?: string
    ctaTextColor?: string
    titleColor?: string
    subtitleColor?: string
    rowLabelColor?: string
    rowValueColor?: string
    maxWidth?: string
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RevenueCalculator({
    accentColor = '#E63950',
    showCta = true,
    ctaHref = '/organiser/apply',
    ctaLabel = 'Create Event',
    ctaTextColor = '#FFFFFF',
    maxWidth = '100%',
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

    return (
        <>
            <div
                className="st-calc-ticket"
                style={{
                    width: '100%',
                    maxWidth,
                    background: 'var(--card)',
                    border: '2px solid var(--text)',
                    borderRadius: '6px',
                    position: 'relative',
                    boxShadow: `8px 8px 0 ${accentColor}`,
                    fontFamily: 'var(--font-body), sans-serif',
                }}
            >
                {/* Ticket Top */}
                <div
                    style={{
                        padding: '26px 28px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: '11px',
                                letterSpacing: '0.12em',
                                color: 'var(--muted)',
                                fontFamily: 'var(--font-mono), monospace',
                                marginBottom: '6px',
                            }}
                        >
                            REVENUE CALCULATOR · ORGANISER COPY
                        </div>
                        <div
                            style={{
                                fontFamily: 'var(--font-heading), sans-serif',
                                fontSize: '22px',
                                marginBottom: '4px',
                                color: 'var(--text)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.02em',
                            }}
                        >
                            YOUR EVENT
                        </div>
                        <div
                            style={{
                                fontSize: '12.5px',
                                color: 'var(--muted)',
                                fontFamily: 'var(--font-mono), monospace',
                            }}
                        >
                            SERIAL HXL-CALC-01 · LIVE ESTIMATE
                        </div>
                    </div>
                    {/* Stamp */}
                    <div
                        style={{
                            width: '78px',
                            height: '78px',
                            borderRadius: '50%',
                            border: '2.5px dashed var(--gold)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            transform: 'rotate(-11deg)',
                            color: 'var(--gold)',
                            flexShrink: 0,
                            userSelect: 'none',
                        }}
                    >
                        <b
                            style={{
                                fontFamily: 'var(--font-heading), sans-serif',
                                fontSize: '20px',
                                lineHeight: 1,
                            }}
                        >
                            LIVE
                        </b>
                        <span
                            style={{
                                fontSize: '8px',
                                letterSpacing: '0.08em',
                                fontFamily: 'var(--font-mono), monospace',
                            }}
                        >
                            CALC
                        </span>
                    </div>
                </div>

                {/* Perforation notch */}
                <div style={{ position: 'relative', height: 0 }}>
                    <div
                        aria-hidden="true"
                        style={{
                            position: 'absolute',
                            width: '20px',
                            height: '20px',
                            background: 'var(--surface)',
                            borderRadius: '50%',
                            top: '-10px',
                            left: '-10px',
                            borderRight: '2px solid var(--text)',
                        }}
                    />
                    <div
                        style={{
                            borderTop: '2px dashed var(--border)',
                            margin: '0 20px',
                        }}
                    />
                    <div
                        aria-hidden="true"
                        style={{
                            position: 'absolute',
                            width: '20px',
                            height: '20px',
                            background: 'var(--surface)',
                            borderRadius: '50%',
                            top: '-10px',
                            right: '-10px',
                            borderLeft: '2px solid var(--text)',
                        }}
                    />
                </div>

                {/* Calculator Bottom fields & outputs */}
                <div className="st-calc-bottom">
                    <div className="st-calc-fields">
                        <StepperInput
                            id="qty"
                            label="Number of tickets"
                            value={numTickets}
                            onChange={setNumTickets}
                            step={50}
                            min={1}
                            placeholder="500"
                            prefix="#"
                        />
                        <StepperInput
                            id="price"
                            label="Ticket price"
                            value={ticketPrice}
                            onChange={setTicketPrice}
                            step={1}
                            min={0}
                            placeholder="25.00"
                            prefix="£"
                        />
                    </div>

                    {/* Output Panel */}
                    <div
                        style={{
                            background: 'var(--surface)',
                            border: '2px dashed var(--border)',
                            borderRadius: '6px',
                            padding: '22px 24px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '10px',
                                fontSize: '14px',
                            }}
                        >
                            <span style={{ color: 'var(--muted)' }}>Standard Revenue</span>
                            <span
                                style={{
                                    fontFamily: 'var(--font-mono), monospace',
                                    fontWeight: 600,
                                    color: 'var(--text)',
                                }}
                            >
                                {fmt(standardRevenue)}
                            </span>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'baseline',
                                padding: '14px 0 0',
                                marginTop: '8px',
                                borderTop: '2px solid var(--text)',
                                paddingTop: '14px',
                            }}
                        >
                            <span style={{ color: 'var(--text)', fontSize: '14px' }}>
                                Total Revenue Potential
                            </span>
                            <span
                                style={{
                                    fontFamily: 'var(--font-heading), sans-serif',
                                    fontSize: '34px',
                                    color: 'var(--text)',
                                }}
                            >
                                {fmt(totalPotential)}
                            </span>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginTop: '14px',
                                fontSize: '14px',
                            }}
                        >
                            <span
                                style={{
                                    color: 'var(--accent)',
                                    fontWeight: 600,
                                }}
                            >
                                Extra 5% Bonus Earnings
                            </span>
                            <span
                                style={{
                                    fontFamily: 'var(--font-mono), monospace',
                                    fontWeight: 700,
                                    color: 'var(--accent)',
                                }}
                            >
                                +{fmt(bonusEarnings)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Optional CTA Button */}
                {showCta && (
                    <div style={{ padding: '0 30px 24px', marginTop: '-10px' }}>
                        <Link
                            href={ctaHref}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '14px 24px',
                                background: 'var(--accent)',
                                border: '2px solid var(--text)',
                                borderRadius: '4px',
                                fontSize: '15px',
                                fontWeight: 700,
                                color: ctaTextColor,
                                textDecoration: 'none',
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                boxShadow: '4px 4px 0 var(--text)',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translate(-2px,-2px)'
                                e.currentTarget.style.boxShadow = '6px 6px 0 var(--text)'
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translate(0,0)'
                                e.currentTarget.style.boxShadow = '4px 4px 0 var(--text)'
                            }}
                        >
                            {ctaLabel}
                        </Link>
                    </div>
                )}

                {/* Trust Footer note */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        paddingBottom: '20px',
                        color: 'var(--muted)',
                        fontSize: '12px',
                        fontWeight: 500,
                    }}
                >
                    <span style={{ color: 'var(--accent)' }}>
                        <IconShield />
                    </span>
                    Transparent pricing. No hidden fees. Built for organizers.
                </div>

                {/* Barcode Deco */}
                <div
                    aria-hidden="true"
                    style={{
                        height: '34px',
                        background: `repeating-linear-gradient(
                            90deg,
                            var(--text) 0px, var(--text) 2px,
                            transparent 2px, transparent 4px,
                            var(--text) 4px, var(--text) 5px,
                            transparent 5px, transparent 9px,
                            var(--text) 9px, var(--text) 12px,
                            transparent 12px, transparent 15px
                        )`,
                        opacity: 0.85,
                        borderTop: '2px solid var(--text)',
                        borderRadius: '0 0 4px 4px',
                    }}
                />
            </div>

            <style>{`
                .st-calc-bottom {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 40px;
                    padding: 26px 30px 30px;
                }
                @media (max-width: 800px) {
                    .st-calc-bottom {
                        grid-template-columns: 1fr !important;
                        gap: 26px !important;
                    }
                }
                input[type=number]::-webkit-outer-spin-button,
                input[type=number]::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
            `}</style>
        </>
    )
}
