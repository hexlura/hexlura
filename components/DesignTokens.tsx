import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// Maps platform_settings key → CSS variable name
const COLOR_MAP: Record<string, string> = {
    design_color_background: '--background',
    design_color_surface: '--surface',
    design_color_card: '--card',
    design_color_border: '--border',
    design_color_accent: '--accent',
    design_color_gold: '--gold',
    design_color_text: '--text',
    design_color_muted: '--muted',
    design_color_success: '--success',
}

// Fonts loaded by Next.js font system — no extra <link> needed
const PRELOADED = new Set(['Bebas Neue', 'DM Sans', 'JetBrains Mono'])

const GOOGLE_FONT_URLS: Record<string, string> = {
    'Oswald': 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;700&display=swap',
    'Anton': 'https://fonts.googleapis.com/css2?family=Anton&display=swap',
    'Montserrat': 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap',
    'Playfair Display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap',
    'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
    'Poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap',
    'Nunito': 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600&display=swap',
    'Raleway': 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;600&display=swap',
}

const fetchDesignSettings = unstable_cache(
    async (): Promise<Record<string, string>> => {
        try {
            const adminClient = createAdminClient()
            const { data } = await adminClient
                .from('platform_settings')
                .select('key, value')
                .like('key', 'design_%')
            return Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
        } catch {
            return {}
        }
    },
    ['design-settings'],
    { tags: ['design-settings'], revalidate: 3600 },
)

export async function DesignTokens() {
    const s = await fetchDesignSettings()

    // Build color CSS vars
    const colorVars = Object.entries(COLOR_MAP)
        .filter(([key]) => s[key])
        .map(([key, cssVar]) => `${cssVar}:${s[key]};`)

    const headingFont = s['design_font_heading']
    const bodyFont = s['design_font_body']

    // Font CSS vars — use !important to beat Next.js class-based font variables
    const fontVars: string[] = []
    if (headingFont && headingFont !== 'Bebas Neue') {
        fontVars.push(`--font-heading:'${headingFont}',sans-serif!important;`)
    }
    if (bodyFont && bodyFont !== 'DM Sans') {
        fontVars.push(`--font-body:'${bodyFont}',sans-serif!important;`)
    }

    const styleLines: string[] = []
    if (colorVars.length) styleLines.push(`:root{${colorVars.join('')}}`)
    if (fontVars.length) styleLines.push(`body{${fontVars.join('')}}`)

    const googleFontLinks = [headingFont, bodyFont]
        .filter((f): f is string => !!f && !PRELOADED.has(f) && f in GOOGLE_FONT_URLS)
        .map(f => GOOGLE_FONT_URLS[f])

    if (!styleLines.length && !googleFontLinks.length) return null

    return (
        <>
            {googleFontLinks.map(url => (
                <link key={url} rel="stylesheet" href={url} />
            ))}
            {styleLines.length > 0 && (
                <style dangerouslySetInnerHTML={{ __html: styleLines.join('\n') }} />
            )}
        </>
    )
}
