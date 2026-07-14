import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'
import { LEGAL_DOC_TYPES, type LegalDocType } from '@/lib/legal'

export const dynamic = 'force-dynamic'

const MAX_CONTENT_LENGTH = 500_000 // ~0.5 MB of HTML — far beyond any real legal doc

async function requireAdmin() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    if (profile?.role !== 'admin') {
        return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }
    return { user, error: null }
}

// GET — all versions of all legal documents (newest first), for the admin editor
export async function GET() {
    const { user, error } = await requireAdmin()
    if (!user) return error

    const adminClient = createAdminClient()
    const { data } = await adminClient
        .from('legal_documents')
        .select('id, doc_type, content_html, version, published_at, published_by')
        .order('published_at', { ascending: false })

    return NextResponse.json({ documents: data ?? [] })
}

// POST — publish a new version of one document (append-only; never overwrites)
export async function POST(request: NextRequest) {
    const { user, error } = await requireAdmin()
    if (!user) return error

    const body = await request.json().catch(() => ({})) as { doc_type?: string; content_html?: string }
    const docType = body.doc_type as LegalDocType

    if (!LEGAL_DOC_TYPES.includes(docType)) {
        return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
    }
    const contentHtml = (body.content_html ?? '').trim()
    if (contentHtml.length < 50) {
        return NextResponse.json({ error: 'Content is too short to be a legal document' }, { status: 400 })
    }
    if (contentHtml.length > MAX_CONTENT_LENGTH) {
        return NextResponse.json({ error: 'Content is too large' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Version = today's date; same-day republishes get a numeric suffix so the
    // (doc_type, version) pair stays unique and acceptance stamps stay precise.
    const today = new Date().toISOString().slice(0, 10)
    const { data: sameDay } = await adminClient
        .from('legal_documents')
        .select('version')
        .eq('doc_type', docType)
        .like('version', `${today}%`)
    const version = !sameDay || sameDay.length === 0 ? today : `${today}.${sameDay.length + 1}`

    const { data: created, error: insertError } = await adminClient
        .from('legal_documents')
        .insert({
            doc_type: docType,
            content_html: contentHtml,
            version,
            published_by: user.id,
        })
        .select('id, version, published_at')
        .single()

    if (insertError || !created) {
        return NextResponse.json({ error: insertError?.message || 'Failed to publish' }, { status: 500 })
    }

    void logAuditAction({
        actorId: user.id,
        action: 'legal_document_published',
        entityType: 'legal_document',
        entityId: created.id,
        metadata: { doc_type: docType, version: created.version, content_length: contentHtml.length },
    })

    return NextResponse.json({ success: true, version: created.version, published_at: created.published_at })
}
