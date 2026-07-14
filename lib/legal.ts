import { createServiceClient } from '@/lib/supabase/service'

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
