import { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SeoMetadata, SeoGlobalDefaults } from '@/types'

async function getGlobalDefaults(): Promise<SeoGlobalDefaults> {
    const admin = createAdminClient()
    const { data } = await admin
        .from('platform_settings')
        .select('key, value')
        .in('key', ['seo_site_name', 'seo_default_og_image', 'seo_twitter_handle', 'seo_default_description'])

    const map: Record<string, string> = {}
    for (const row of (data || []) as { key: string; value: string }[]) {
        map[row.key] = row.value
    }

    return {
        site_name: map['seo_site_name'] || 'Hexlura',
        default_og_image: map['seo_default_og_image'] || '',
        twitter_handle: map['seo_twitter_handle'] || '',
        default_description: map['seo_default_description'] || 'Find and book the hottest events near you.',
    }
}

async function getPageSeo(pagePath: string): Promise<SeoMetadata | null> {
    const admin = createAdminClient()
    const { data } = await admin
        .from('seo_metadata')
        .select('*')
        .eq('page_path', pagePath)
        .single()
    return (data as SeoMetadata | null) ?? null
}

function buildMetadata(
    seo: SeoMetadata | null,
    defaults: SeoGlobalDefaults,
    fallbackTitle: string,
    fallbackDescription: string,
    fallbackOgImage?: string,
): Metadata {
    const title = seo?.title || fallbackTitle
    const description = seo?.description || fallbackDescription || defaults.default_description
    const ogImage = seo?.og_image_url || fallbackOgImage || defaults.default_og_image || undefined

    return {
        title,
        description,
        keywords: seo?.keywords || undefined,
        robots: seo?.robots || 'index, follow',
        alternates: seo?.canonical_url ? { canonical: seo.canonical_url } : undefined,
        openGraph: {
            title: seo?.og_title || title,
            description: seo?.og_description || description,
            siteName: defaults.site_name,
            type: 'website',
            ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
        },
        twitter: {
            card: seo?.twitter_card || 'summary_large_image',
            title: seo?.og_title || title,
            description: seo?.og_description || description,
            ...(defaults.twitter_handle ? { site: defaults.twitter_handle } : {}),
            ...(ogImage ? { images: [ogImage] } : {}),
        },
    }
}

function formatPathAsTitle(pagePath: string): string {
    if (pagePath === '/') return 'Home'
    return pagePath
        .replace(/^\//, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Get metadata for a static page (e.g. /about, /how-it-works).
 * Fetches admin overrides from seo_metadata table, falls back to global defaults.
 */
export async function getStaticPageMetadata(pagePath: string): Promise<Metadata> {
    const [defaults, pageSeo] = await Promise.all([
        getGlobalDefaults(),
        getPageSeo(pagePath),
    ])

    const fallbackTitle = `${formatPathAsTitle(pagePath)} | ${defaults.site_name}`
    return buildMetadata(pageSeo, defaults, fallbackTitle, defaults.default_description)
}

/**
 * Get metadata for a dynamic page (e.g. /events/summer-party).
 * Checks for exact-path override first, then template override, then uses content-derived values.
 */
export async function getDynamicPageMetadata(
    resolvedPath: string,
    templatePath: string,
    contentMeta: { title: string; description: string; ogImage?: string },
): Promise<Metadata> {
    const [defaults, exactSeo, templateSeo] = await Promise.all([
        getGlobalDefaults(),
        getPageSeo(resolvedPath),
        getPageSeo(templatePath),
    ])

    const seo = exactSeo || templateSeo
    return buildMetadata(seo, defaults, contentMeta.title, contentMeta.description, contentMeta.ogImage)
}

/**
 * Get JSON-LD structured data for a page, if configured by admin.
 */
export async function getPageJsonLd(pagePath: string): Promise<Record<string, unknown> | null> {
    const seo = await getPageSeo(pagePath)
    return seo?.json_ld || null
}
