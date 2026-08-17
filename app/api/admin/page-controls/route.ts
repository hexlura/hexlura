import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'
import { KEY_FORMAT, PAGE_PUBLIC_PATHS } from '@/lib/page-controls/constants'

// Updates the visibility of a single page section. Only ever writes
// `is_visible` (+ audit fields) — page_key/section_key/id/created_at are
// never accepted from the request body, so a malicious payload with extra
// fields cannot mutate anything beyond the toggle itself.
export async function POST(request: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: adminProfile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!adminProfile || adminProfile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { pageKey, sectionKey, isVisible } = (body ?? {}) as {
        pageKey?: unknown
        sectionKey?: unknown
        isVisible?: unknown
    }

    if (
        typeof pageKey !== 'string' || !KEY_FORMAT.test(pageKey) ||
        typeof sectionKey !== 'string' || !KEY_FORMAT.test(sectionKey) ||
        typeof isVisible !== 'boolean'
    ) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Explicit desired-state UPDATE (never a toggle/invert) makes repeated
    // or racing requests deterministic. Selecting is_visible first captures
    // the pre-change value for the audit entry.
    const { data: existing } = await adminClient
        .from('page_controls')
        .select('is_visible')
        .eq('page_key', pageKey)
        .eq('section_key', sectionKey)
        .single()

    if (!existing) {
        return NextResponse.json({ error: 'Page control not found' }, { status: 404 })
    }

    const { data: updated, error: updateError } = await adminClient
        .from('page_controls')
        .update({
            is_visible: isVisible,
            updated_by: user.id,
        })
        .eq('page_key', pageKey)
        .eq('section_key', sectionKey)
        .select('is_visible')
        .single()

    if (updateError || !updated) {
        console.error('[page-controls] update failed:', pageKey, sectionKey, updateError?.message)
        return NextResponse.json({ error: 'Unable to update page visibility.' }, { status: 500 })
    }

    await logAuditAction({
        actorId: user.id,
        action: 'page_section_visibility_changed',
        entityType: 'page_control',
        entityId: `${pageKey}:${sectionKey}`,
        metadata: { pageKey, sectionKey, oldValue: existing.is_visible, newValue: isVisible },
    })

    revalidatePath(PAGE_PUBLIC_PATHS[pageKey] ?? '/')
    revalidatePath('/admin/page-controls')

    return NextResponse.json({ success: true, isVisible: updated.is_visible })
}
