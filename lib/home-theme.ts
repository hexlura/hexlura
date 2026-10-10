import { unstable_noStore as noStore } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import {
    HOME_THEME_SETTING_KEYS,
    isHomeThemeMode,
    resolveSeason,
    type HomeThemeMode,
    type SeasonKey,
} from '@/lib/home-theme-config'

/** Server-only: reads the admin's theme settings. Config and date logic live in home-theme-config.ts. */

export interface HomeTheme {
    season: SeasonKey
    particles: boolean
}

/**
 * Reads the admin settings and returns the active theme, or null for the normal homepage.
 * A failed read falls back to 'auto' (the safe default) rather than hiding the error silently.
 */
export async function getHomeTheme(): Promise<HomeTheme | null> {
    // Always read live (the homepage is dynamic anyway); also stops Next logging the no-store fetch as an error.
    noStore()
    const admin = createAdminClient()
    const { data, error } = await admin
        .from('platform_settings')
        .select('key, value')
        .in('key', [...HOME_THEME_SETTING_KEYS])

    if (error) console.error('getHomeTheme: platform_settings read failed:', error.message)

    const map: Record<string, string> = {}
    for (const row of (data || []) as { key: string; value: string }[]) map[row.key] = row.value

    const mode: HomeThemeMode = isHomeThemeMode(map['home_theme_mode']) ? map['home_theme_mode'] : 'auto'
    const season = resolveSeason(mode)
    if (!season) return null
    return { season, particles: map['home_theme_particles'] !== 'false' }
}
