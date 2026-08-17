// Typed identifiers for page/section keys, to avoid magic strings scattered
// across pages and the admin UI. New sections only need a new key here plus
// a seed row in the database — no schema or API changes.

export const PAGE_KEYS = {
    HOME: 'home',
} as const

export type PageKey = typeof PAGE_KEYS[keyof typeof PAGE_KEYS]

export const HOME_SECTION_KEYS = {
    UPCOMING_EVENTS: 'upcoming_events',
} as const

export type HomeSectionKey = typeof HOME_SECTION_KEYS[keyof typeof HOME_SECTION_KEYS]

// `page_key`/`section_key` values must always match this shape — enforced
// again at the database via a CHECK constraint (see migration 066).
export const KEY_FORMAT = /^[a-z][a-z0-9_]*$/

// Public route to revalidate after a page's controls change.
export const PAGE_PUBLIC_PATHS: Record<string, string> = {
    [PAGE_KEYS.HOME]: '/',
}
