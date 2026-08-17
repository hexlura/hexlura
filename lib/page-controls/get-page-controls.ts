import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PageControl } from './types'
import type { PageKey } from './constants'

/**
 * Fetches every section control for a page in a single query. Public pages
 * should call this once and reuse the result for all their sections rather
 * than querying per-section.
 *
 * Fails closed: if the row is missing or the query errors, the section is
 * treated as not configured (and callers should default to hidden) so a
 * transient DB issue never silently exposes something an admin turned off.
 */
export async function getPageControls(pageKey: PageKey): Promise<Map<string, PageControl>> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('page_controls')
        .select('id, page_key, section_key, display_name, is_visible, sort_order, updated_at, updated_by')
        .eq('page_key', pageKey)
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('[page-controls] getPageControls failed:', pageKey, error.message)
        return new Map()
    }

    const controls = new Map<string, PageControl>()
    for (const row of (data ?? []) as PageControl[]) {
        controls.set(row.section_key, row)
    }
    return controls
}

/**
 * Convenience lookup for a single section. Prefer `getPageControls` + this
 * helper when a page has more than one controlled section, so only one
 * database round trip happens per render.
 */
export function isSectionVisible(controls: Map<string, PageControl>, sectionKey: string): boolean {
    return controls.get(sectionKey)?.is_visible === true
}

/** One-off equivalent of getPageControls + isSectionVisible for a single lookup. */
export async function isPageSectionVisible(pageKey: PageKey, sectionKey: string): Promise<boolean> {
    const controls = await getPageControls(pageKey)
    return isSectionVisible(controls, sectionKey)
}

/**
 * Admin listing: every page control across every page, grouped by the
 * caller. Uses the service-role client the same way the rest of the admin
 * portal does (see lib/supabase/admin.ts) — this is a read for an already
 * role-checked admin page, not a bypass of any per-user authorization.
 */
export async function getAllPageControlsForAdmin(): Promise<PageControl[]> {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
        .from('page_controls')
        .select('id, page_key, section_key, display_name, is_visible, sort_order, updated_at, updated_by')
        .order('page_key', { ascending: true })
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('[page-controls] getAllPageControlsForAdmin failed:', error.message)
        return []
    }

    return (data ?? []) as PageControl[]
}
