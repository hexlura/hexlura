'use client'

import { useState, useEffect } from 'react'
import { TM } from '@/components/ui/TM'
import { useRouter } from 'next/navigation'

const COLORS = [
    { key: 'design_color_accent',     label: 'Accent / Brand',  cssVar: '--accent',     default: '#E63950' },
    { key: 'design_color_gold',       label: 'Gold / Secondary', cssVar: '--gold',       default: '#F5A623' },
    { key: 'design_color_success',    label: 'Success',          cssVar: '--success',    default: '#00C48A' },
    { key: 'design_color_text',       label: 'Primary Text',     cssVar: '--text',       default: '#0A0A0F' },
    { key: 'design_color_muted',      label: 'Muted Text',       cssVar: '--muted',      default: '#8888AA' },
    { key: 'design_color_background', label: 'Background',       cssVar: '--background', default: '#FFFFFF' },
    { key: 'design_color_surface',    label: 'Surface',          cssVar: '--surface',    default: '#F5F5F7' },
    { key: 'design_color_card',       label: 'Card',             cssVar: '--card',       default: '#FFFFFF' },
    { key: 'design_color_border',     label: 'Border',           cssVar: '--border',     default: '#C0C0C8' },
]

const HEADING_FONTS = ['Bebas Neue', 'Oswald', 'Anton', 'Montserrat', 'Playfair Display']
const BODY_FONTS    = ['DM Sans', 'Inter', 'Poppins', 'Nunito', 'Raleway']

// All optional Google Fonts loaded together for in-page preview
const PREVIEW_FONTS_URL =
    'https://fonts.googleapis.com/css2?family=Oswald:wght@400;700&family=Anton&family=Montserrat:wght@400;700&family=Playfair+Display:wght@400;700&family=Inter:wght@400;500;600&family=Poppins:wght@400;500;600&family=Nunito:wght@400;600&family=Raleway:wght@400;600&display=swap'

const DEFAULTS: Record<string, string> = {
    ...Object.fromEntries(COLORS.map(c => [c.key, c.default])),
    design_font_heading: 'Bebas Neue',
    design_font_body: 'DM Sans',
}

interface DesignClientProps {
    initialSettings: Record<string, string>
}

export function DesignClient({ initialSettings }: DesignClientProps) {
    const router = useRouter()
    // Merge saved settings over defaults so all keys are always present
    const [settings, setSettings] = useState<Record<string, string>>({ ...DEFAULTS, ...initialSettings })
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')

    // Load preview fonts client-side
    useEffect(() => {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = PREVIEW_FONTS_URL
        document.head.appendChild(link)
        return () => { document.head.removeChild(link) }
    }, [])

    const get = (key: string) => settings[key] ?? DEFAULTS[key] ?? ''
    const set = (key: string, value: string) =>
        setSettings(prev => ({ ...prev, [key]: value }))

    const handleSave = async () => {
        setSaving(true)
        setError('')
        const res = await fetch('/api/admin/design-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings }),
        })
        setSaving(false)
        if (res.ok) {
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
            router.refresh()
        } else {
            const data = await res.json().catch(() => ({})) as { error?: string }
            setError(data.error ?? 'Failed to save settings')
        }
    }

    const handleReset = () => setSettings({ ...DEFAULTS })

    // ── Styles ────────────────────────────────────────────────────
    const section: React.CSSProperties = {
        background: '#FFFFFF', border: '1px solid #E0E0E0', padding: '28px', marginBottom: '24px',
    }
    const sectionTitle: React.CSSProperties = {
        fontFamily: '"Bebas Neue", sans-serif', fontSize: '22px', color: '#0A0A0F',
        margin: '0 0 4px 0', letterSpacing: '1px',
    }
    const sectionDesc: React.CSSProperties = {
        fontSize: '13px', color: '#8888AA', margin: '0 0 24px 0',
    }
    const label: React.CSSProperties = {
        fontSize: '11px', color: '#666677', marginBottom: '6px', display: 'block',
        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
    }
    const selectStyle: React.CSSProperties = {
        width: '100%', border: '1px solid #E0E0E0', padding: '8px 12px',
        fontSize: '14px', color: '#0A0A0F', outline: 'none', background: '#FFFFFF', cursor: 'pointer',
    }
    const previewBox: React.CSSProperties = {
        marginTop: '16px', padding: '16px', border: '1px solid #E0E0E0', background: '#FAFAFA',
    }

    return (
        <div style={{ padding: '32px', maxWidth: '960px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
                <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '36px', color: '#0A0A0F', margin: 0 }}>
                    DESIGN SETTINGS
                </h1>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                        onClick={handleReset}
                        style={{ padding: '8px 16px', background: 'transparent', color: '#666677', border: '1px solid #C0C0C8', fontSize: '13px', cursor: 'pointer' }}
                    >
                        Reset to Defaults
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{ padding: '10px 28px', background: '#0A0A0F', color: '#FFFFFF', border: 'none', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
                    >
                        {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ background: '#FFF5F5', border: '1px solid #E63950', padding: '12px 16px', marginBottom: '24px', fontSize: '14px', color: '#E63950' }}>
                    {error}
                </div>
            )}

            {/* ── Colors ─────────────────────────────────────────── */}
            <div style={section}>
                <p style={sectionTitle}>Brand Colors</p>
                <p style={sectionDesc}>These map directly to CSS variables used across the entire site. Changes apply globally after saving.</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '20px' }}>
                    {COLORS.map(color => {
                        const value = get(color.key)
                        return (
                            <div key={color.key}>
                                <label style={label}>{color.label}</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {/* Color swatch — clicking it opens the native color picker */}
                                    <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0, border: '1px solid #E0E0E0', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer' }}>
                                        <div style={{ position: 'absolute', inset: 0, background: value }} />
                                        <input
                                            type="color"
                                            value={value}
                                            onChange={e => set(color.key, e.target.value)}
                                            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }}
                                        />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <input
                                            type="text"
                                            value={value}
                                            maxLength={7}
                                            onChange={e => {
                                                const v = e.target.value
                                                if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) set(color.key, v)
                                            }}
                                            style={{ width: '100%', border: '1px solid #E0E0E0', padding: '6px 8px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: '#0A0A0F', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                        <div style={{ fontSize: '11px', color: '#8888AA', marginTop: '3px' }}>{color.cssVar}</div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Live color preview */}
                <div style={{ marginTop: '28px', padding: '20px', border: '1px solid #E0E0E0', background: get('design_color_surface') }}>
                    <p style={{ fontSize: '11px', color: '#8888AA', margin: '0 0 12px 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Preview</p>
                    <div style={{ background: get('design_color_card'), border: `1px solid ${get('design_color_border')}`, padding: '20px', borderRadius: '2px' }}>
                        <p style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '26px', color: get('design_color_text'), margin: '0 0 4px 0', lineHeight: 1 }}>
                            UPCOMING EVENTS IN MANCHESTER
                        </p>
                        <p style={{ fontSize: '14px', color: get('design_color_muted'), margin: '0 0 16px 0' }}>
                            Browse the best nights out, gigs, and festivals near you.
                        </p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ background: get('design_color_accent'), color: '#FFFFFF', padding: '6px 16px', fontSize: '13px', fontWeight: 600 }}>Buy Tickets</span>
                            <span style={{ background: get('design_color_gold'), color: '#FFFFFF', padding: '6px 16px', fontSize: '13px', fontWeight: 600 }}>Featured</span>
                            <span style={{ background: get('design_color_success'), color: '#FFFFFF', padding: '6px 16px', fontSize: '13px', fontWeight: 600 }}>Available</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Typography ─────────────────────────────────────── */}
            <div style={section}>
                <p style={sectionTitle}>Typography</p>
                <p style={sectionDesc}>Heading font is used for titles and display text. Body font is used for all other copy.</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                    {/* Heading font */}
                    <div>
                        <label style={label}>Heading Font</label>
                        <select
                            value={get('design_font_heading')}
                            onChange={e => set('design_font_heading', e.target.value)}
                            style={selectStyle}
                        >
                            {HEADING_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <div style={previewBox}>
                            <p style={{ fontFamily: `'${get('design_font_heading')}', sans-serif`, fontSize: '32px', margin: 0, color: '#0A0A0F', lineHeight: 1 }}>
                                HEXLURA<TM /> EVENTS
                            </p>
                            <p style={{ fontFamily: `'${get('design_font_heading')}', sans-serif`, fontSize: '18px', margin: '8px 0 0', color: '#8888AA', lineHeight: 1 }}>
                                DISCOVER WHAT&apos;S ON NEAR YOU
                            </p>
                        </div>
                        <p style={{ fontSize: '11px', color: '#8888AA', marginTop: '8px' }}>Used for: headings, hero text, section titles</p>
                    </div>

                    {/* Body font */}
                    <div>
                        <label style={label}>Body Font</label>
                        <select
                            value={get('design_font_body')}
                            onChange={e => set('design_font_body', e.target.value)}
                            style={selectStyle}
                        >
                            {BODY_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <div style={previewBox}>
                            <p style={{ fontFamily: `'${get('design_font_body')}', sans-serif`, fontSize: '15px', margin: 0, color: '#0A0A0F', lineHeight: 1.65 }}>
                                Find and book the best events near you. Browse clubs, gigs, festivals, comedy nights, and more — all in one place.
                            </p>
                            <p style={{ fontFamily: `'${get('design_font_body')}', sans-serif`, fontSize: '13px', margin: '10px 0 0', color: '#8888AA' }}>
                                From £5.00 · Manchester · Sat 14 Jun 2025
                            </p>
                        </div>
                        <p style={{ fontSize: '11px', color: '#8888AA', marginTop: '8px' }}>Used for: body copy, labels, descriptions, navigation</p>
                    </div>
                </div>
            </div>

            {/* Bottom save row */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
                {saved && <span style={{ fontSize: '14px', color: '#00C48A', fontWeight: 600 }}>Changes saved — site updated.</span>}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ padding: '10px 32px', background: '#0A0A0F', color: '#FFFFFF', border: 'none', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    )
}
