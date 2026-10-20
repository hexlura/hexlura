import { Hr, Link, Text } from '@react-email/components'
import React from 'react'

/**
 * Hexlura email building blocks (warm redesign — see design-preview/emails/).
 *
 * Everything is inline-styled and table-based where layout matters, so it survives Gmail,
 * Apple Mail and Outlook. Web fonts are not used (Gmail/Outlook strip them): headings fall back
 * to Impact / Arial Narrow, body text is Arial. No emoji or SVG icons — email apps render them
 * inconsistently — so icons are plain-text glyphs inside a tinted circle.
 *
 * Fee rule: organiser-facing emails must show ticket revenue only, never Hexlura's fee.
 */

export const colors = {
    page: '#FAF6F3',
    card: '#FFFFFF',
    border: '#F1E7E2',
    dashed: '#E3D3CB',
    text: '#1A0E0C',
    muted: '#6B5D56',
    accent: '#E63950',
    orange: '#FF7A3D',
    green: '#1B9C63',
    amber: '#F5A623',
    amberText: '#9C6900',
}

export const fonts = {
    heading: "'Bebas Neue', Impact, 'Arial Narrow', Arial, sans-serif",
    body: "Arial, Helvetica, sans-serif",
    mono: "'JetBrains Mono', Consolas, 'Courier New', monospace",
}

type Tone = 'green' | 'red' | 'amber' | 'ink'

const toneStyles: Record<Tone, { bg: string; fg: string }> = {
    green: { bg: '#E3F3EB', fg: colors.green },
    red: { bg: '#FBE7EA', fg: colors.accent },
    amber: { bg: '#FDF0D8', fg: colors.amberText },
    ink: { bg: '#EFEAE7', fg: colors.text },
}

/** Tinted circle with a plain-text glyph, e.g. "✓", "✕", "!", "£", "24h". */
export function Icon({ glyph, tone = 'green' }: { glyph: string; tone?: Tone }) {
    const t = toneStyles[tone]
    return (
        <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: '4px 0 16px 0' }}>
            <tbody>
                <tr>
                    <td
                        align="center"
                        valign="middle"
                        style={{
                            width: '58px',
                            height: '58px',
                            borderRadius: '29px',
                            backgroundColor: t.bg,
                            color: t.fg,
                            fontFamily: fonts.body,
                            fontSize: glyph.length > 2 ? '16px' : '26px',
                            fontWeight: 700,
                            lineHeight: '58px',
                            textAlign: 'center',
                        }}
                    >
                        {glyph}
                    </td>
                </tr>
            </tbody>
        </table>
    )
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
    return (
        <Text
            style={{
                fontFamily: fonts.body,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: colors.accent,
                margin: '0 0 8px 0',
            }}
        >
            {children}
        </Text>
    )
}

export function Title({ children }: { children: React.ReactNode }) {
    return (
        <Text
            style={{
                fontFamily: fonts.heading,
                fontSize: '44px',
                fontWeight: 400,
                lineHeight: '46px',
                letterSpacing: '1px',
                color: colors.text,
                margin: '0 0 12px 0',
            }}
        >
            {children}
        </Text>
    )
}

export function Lead({ children }: { children: React.ReactNode }) {
    return (
        <Text style={{ fontFamily: fonts.body, fontSize: '16px', lineHeight: '25px', color: colors.muted, margin: '0 0 20px 0' }}>
            {children}
        </Text>
    )
}

export function P({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <Text style={{ fontFamily: fonts.body, fontSize: '15px', lineHeight: '24px', color: colors.text, margin: '0 0 14px 0', ...style }}>
            {children}
        </Text>
    )
}

export function Note({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
    return (
        <Text
            style={{
                fontFamily: fonts.body,
                fontSize: '13px',
                lineHeight: '21px',
                color: colors.muted,
                margin: '0 0 10px 0',
                textAlign: center ? 'center' : 'left',
            }}
        >
            {children}
        </Text>
    )
}

export function SubHeading({ children }: { children: React.ReactNode }) {
    return (
        <Text style={{ fontFamily: fonts.body, fontSize: '16px', fontWeight: 700, color: colors.text, margin: '22px 0 8px 0' }}>
            {children}
        </Text>
    )
}

export function A({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link href={href} style={{ color: colors.accent, fontWeight: 700, textDecoration: 'none' }}>
            {children}
        </Link>
    )
}

export const SupportLink = () => <A href="mailto:support@hexlura.com">support@hexlura.com</A>

export function Divider() {
    return <Hr style={{ borderColor: colors.border, borderWidth: '1px 0 0 0', margin: '24px 0' }} />
}

/** Soft cream box that groups details. */
export function Card({ children, white = false }: { children: React.ReactNode; white?: boolean }) {
    return (
        <div
            style={{
                backgroundColor: white ? colors.card : colors.page,
                border: `1px solid ${colors.border}`,
                borderRadius: '18px',
                padding: '18px 20px',
                margin: '18px 0',
            }}
        >
            {children}
        </div>
    )
}

export function CardTitle({ children, small = false }: { children: React.ReactNode; small?: boolean }) {
    return (
        <Text style={{ fontFamily: fonts.body, fontSize: small ? '16px' : '19px', fontWeight: 700, lineHeight: '26px', color: colors.text, margin: '0 0 6px 0' }}>
            {children}
        </Text>
    )
}

export function CardSub({ children }: { children: React.ReactNode }) {
    return <Text style={{ fontFamily: fonts.body, fontSize: '13.5px', lineHeight: '21px', color: colors.muted, margin: 0 }}>{children}</Text>
}

type RowTone = 'default' | 'accent' | 'green' | 'red'
const rowToneColor: Record<RowTone, string> = { default: colors.text, accent: colors.accent, green: colors.green, red: colors.accent }

/** One label / value line inside a Card. Pass `last` on the final row to drop its divider. */
export function Row({
    label,
    children,
    mono = false,
    tone = 'default',
    last = false,
}: {
    label: string
    children: React.ReactNode
    mono?: boolean
    tone?: RowTone
    last?: boolean
}) {
    return (
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderBottom: last ? 'none' : `1px solid ${colors.border}` }}>
            <tbody>
                <tr>
                    <td valign="top" style={{ fontFamily: fonts.body, fontSize: '14px', lineHeight: '21px', color: colors.muted, padding: last ? '10px 12px 0 0' : '10px 12px 10px 0' }}>
                        {label}
                    </td>
                    <td
                        valign="top"
                        align="right"
                        style={{
                            fontFamily: mono ? fonts.mono : fonts.body,
                            fontSize: '14px',
                            lineHeight: '21px',
                            fontWeight: 600,
                            color: rowToneColor[tone],
                            textAlign: 'right',
                            padding: last ? '10px 0 0 0' : '10px 0',
                        }}
                    >
                        {children}
                    </td>
                </tr>
            </tbody>
        </table>
    )
}

/** Bold total line under a list of rows, with an optional small note below the value. */
export function TotalRow({ label, value, note, tone = 'default' }: { label: string; value: string; note?: string; tone?: RowTone }) {
    return (
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderTop: `2px solid ${colors.text}`, marginTop: '8px' }}>
            <tbody>
                <tr>
                    <td valign="top" style={{ fontFamily: fonts.body, fontSize: '18px', fontWeight: 700, color: colors.text, padding: '14px 12px 0 0' }}>{label}</td>
                    <td valign="top" align="right" style={{ fontFamily: fonts.body, fontSize: '18px', fontWeight: 700, color: rowToneColor[tone], textAlign: 'right', padding: '14px 0 0 0' }}>
                        {value}
                        {note ? <div style={{ fontSize: '12px', fontWeight: 400, color: colors.muted, marginTop: '2px' }}>{note}</div> : null}
                    </td>
                </tr>
            </tbody>
        </table>
    )
}

/** Dashed box for a reference / code, e.g. a booking reference. */
export function RefBox({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ border: `2px dashed ${colors.dashed}`, borderRadius: '18px', textAlign: 'center', padding: '16px', margin: '18px 0', backgroundColor: colors.card }}>
            <Text style={{ fontFamily: fonts.body, fontSize: '10px', fontWeight: 700, letterSpacing: '3px', color: colors.muted, margin: '0 0 6px 0', textAlign: 'center' }}>{label}</Text>
            <Text style={{ fontFamily: fonts.mono, fontSize: '28px', fontWeight: 700, letterSpacing: '1px', color: colors.accent, margin: 0, textAlign: 'center' }}>{value}</Text>
        </div>
    )
}

/** Big green money box, e.g. a payout amount. */
export function AmountBox({ label, amount, sub }: { label: string; amount: string; sub?: string }) {
    return (
        <div style={{ backgroundColor: '#EAF6F0', border: '1px solid #BFE3D0', borderRadius: '18px', textAlign: 'center', padding: '22px', margin: '20px 0' }}>
            <Text style={{ fontFamily: fonts.body, fontSize: '10.5px', fontWeight: 700, letterSpacing: '3px', color: colors.green, margin: 0, textAlign: 'center' }}>{label}</Text>
            <Text style={{ fontFamily: fonts.heading, fontSize: '56px', lineHeight: '60px', fontWeight: 400, color: colors.green, margin: '4px 0', textAlign: 'center' }}>{amount}</Text>
            {sub ? <Text style={{ fontFamily: fonts.body, fontSize: '13px', color: colors.muted, margin: 0, textAlign: 'center' }}>{sub}</Text> : null}
        </div>
    )
}

/** Highlighted call-out. `tone` red is for things that are failing. */
export function Notice({ title, children, tone = 'amber' }: { title?: string; children: React.ReactNode; tone?: 'amber' | 'red' }) {
    const red = tone === 'red'
    return (
        <div
            style={{
                borderLeft: `4px solid ${red ? colors.accent : colors.amber}`,
                backgroundColor: red ? '#FCEEF0' : '#FEF4E0',
                borderRadius: '0 14px 14px 0',
                padding: '14px 16px',
                margin: '18px 0',
            }}
        >
            {title ? (
                <Text style={{ fontFamily: fonts.body, fontSize: '10.5px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: red ? colors.accent : colors.amberText, margin: '0 0 4px 0' }}>
                    {title}
                </Text>
            ) : null}
            <Text style={{ fontFamily: fonts.body, fontSize: '14px', lineHeight: '22px', color: colors.text, margin: 0 }}>{children}</Text>
        </div>
    )
}

/** Free-text from a user (reason, message). Keeps their line breaks. */
export function Quote({ label, children }: { label?: string; children: React.ReactNode }) {
    return (
        <div style={{ margin: '14px 0' }}>
            {label ? (
                <Text style={{ fontFamily: fonts.body, fontSize: '10.5px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: colors.muted, margin: '0 0 6px 0' }}>{label}</Text>
            ) : null}
            <Text
                style={{
                    fontFamily: fonts.body,
                    fontSize: '15px',
                    lineHeight: '24px',
                    color: colors.text,
                    margin: 0,
                    backgroundColor: colors.page,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '14px',
                    padding: '14px 16px',
                    whiteSpace: 'pre-wrap',
                }}
            >
                {children}
            </Text>
        </div>
    )
}

/** Full-width pill button. `ghost` is the quiet secondary version. */
export function Button({ href, children, ghost = false }: { href: string; children: React.ReactNode; ghost?: boolean }) {
    return (
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ margin: ghost ? '0 0 12px 0' : '24px 0 12px 0' }}>
            <tbody>
                <tr>
                    <td align="center">
                        <Link
                            href={href}
                            style={{
                                display: 'block',
                                backgroundColor: ghost ? colors.card : colors.accent,
                                color: ghost ? colors.text : '#FFFFFF',
                                border: ghost ? `1px solid ${colors.border}` : `1px solid ${colors.accent}`,
                                borderRadius: '14px',
                                padding: '16px 24px',
                                fontFamily: fonts.body,
                                fontSize: '15.5px',
                                fontWeight: 700,
                                textAlign: 'center',
                                textDecoration: 'none',
                            }}
                        >
                            {children}
                        </Link>
                    </td>
                </tr>
            </tbody>
        </table>
    )
}

/** Tick list inside a Card. */
export function CheckList({ items }: { items: React.ReactNode[] }) {
    return (
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
            <tbody>
                {items.map((item, i) => (
                    <tr key={i}>
                        <td valign="top" width="28" style={{ padding: '7px 0', fontFamily: fonts.body, fontSize: '13px', fontWeight: 700, color: colors.green }}>✓</td>
                        <td valign="top" style={{ padding: '7px 0', fontFamily: fonts.body, fontSize: '14.5px', lineHeight: '22px', color: colors.text }}>{item}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

/** Numbered step with optional inline link, used by the organiser welcome checklist. */
export function Step({ n, title, children, href, linkLabel }: { n: number; title: string; children: React.ReactNode; href?: string; linkLabel?: string }) {
    return (
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ margin: '0 0 14px 0' }}>
            <tbody>
                <tr>
                    <td valign="top" width="40" style={{ paddingTop: '2px' }}>
                        <table role="presentation" cellPadding={0} cellSpacing={0}>
                            <tbody>
                                <tr>
                                    <td align="center" valign="middle" style={{ width: '28px', height: '28px', borderRadius: '14px', backgroundColor: '#FBE7EA', color: colors.accent, fontFamily: fonts.body, fontSize: '13px', fontWeight: 700, lineHeight: '28px', textAlign: 'center' }}>
                                        {n}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                    <td valign="top">
                        <Text style={{ fontFamily: fonts.body, fontSize: '15px', fontWeight: 700, color: colors.text, margin: '0 0 4px 0' }}>{title}</Text>
                        <Text style={{ fontFamily: fonts.body, fontSize: '14px', lineHeight: '22px', color: colors.muted, margin: '0 0 6px 0' }}>{children}</Text>
                        {href && linkLabel ? (
                            <Text style={{ fontFamily: fonts.body, fontSize: '14px', margin: 0 }}>
                                <A href={href}>{linkLabel}</A>
                            </Text>
                        ) : null}
                    </td>
                </tr>
            </tbody>
        </table>
    )
}

/** Date / time / venue lines for an event, used inside a Card. Pass only the rows you have. */
export function EventFacts({ date, time, venue }: { date?: string; time?: string; venue?: string }) {
    const rows = [
        date ? { k: 'Date', v: date } : null,
        time ? { k: 'Time', v: time } : null,
        venue ? { k: 'Venue', v: venue } : null,
    ].filter(Boolean) as { k: string; v: string }[]
    return (
        <>
            {rows.map((r, i) => (
                <Row key={r.k} label={r.k} last={i === rows.length - 1}>
                    {r.v}
                </Row>
            ))}
        </>
    )
}
