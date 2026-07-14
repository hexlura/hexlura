import { createServiceClient } from '@/lib/supabase/service'
import { createAdminClient } from '@/lib/supabase/admin'

export const LEGAL_DOC_TYPES = ['terms', 'privacy', 'cookies'] as const
export type LegalDocType = (typeof LEGAL_DOC_TYPES)[number]

export const LEGAL_DOC_LABELS: Record<LegalDocType, string> = {
    terms: 'Terms & Conditions',
    privacy: 'Privacy Policy',
    cookies: 'Cookie Policy',
}

export interface LegalDocument {
    id: string
    doc_type: LegalDocType
    content_html: string
    version: string
    published_at: string
}

// Latest published version of a legal document, or null if none has ever been
// published (public pages then fall back to their built-in hardcoded content).
// Uses the service client so RLS can never blank a public legal page.
export async function getLatestLegalDocument(docType: LegalDocType): Promise<LegalDocument | null> {
    const serviceClient = createServiceClient()
    const { data } = await serviceClient
        .from('legal_documents')
        .select('id, doc_type, content_html, version, published_at')
        .eq('doc_type', docType)
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    return (data as LegalDocument | null) ?? null
}

const LEGAL_PUBLIC_URLS: Record<LegalDocType, string> = {
    terms: '/terms',
    privacy: '/privacy',
    cookies: '/cookie-policy',
}

// In-app notification to every user when a legal document is published.
// This is the general "heads up" for all users; organisers additionally get
// a hard re-acceptance gate on Terms changes specifically (see the
// (organiser) layout), since Terms carries real contractual obligations.
export async function notifyAllUsersOfLegalUpdate(docType: LegalDocType, version: string): Promise<void> {
    const adminClient = createAdminClient()
    const { data: profiles } = await adminClient.from('profiles').select('id')
    if (!profiles || profiles.length === 0) return

    const title = `${LEGAL_DOC_LABELS[docType]} updated`
    const body = `We've updated our ${LEGAL_DOC_LABELS[docType]} (version ${version}). Please take a moment to review it.`
    const link = LEGAL_PUBLIC_URLS[docType]

    const rows = profiles.map(p => ({
        user_id: p.id,
        type: 'legal_document_updated',
        title,
        body,
        link,
    }))

    // Chunked to stay well under any single-request payload limit as the user base grows.
    const CHUNK_SIZE = 500
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        await adminClient.from('notifications').insert(rows.slice(i, i + CHUNK_SIZE))
    }
}
