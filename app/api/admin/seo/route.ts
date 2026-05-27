import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'

export async function POST(request: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { page_path } = body

    if (!page_path || typeof page_path !== 'string') {
        return NextResponse.json({ error: 'page_path is required' }, { status: 400 })
    }

    // Validate json_ld if provided as string
    let jsonLd = body.json_ld ?? null
    if (typeof jsonLd === 'string' && jsonLd.trim()) {
        try {
            jsonLd = JSON.parse(jsonLd)
        } catch {
            return NextResponse.json({ error: 'Invalid JSON-LD: must be valid JSON' }, { status: 400 })
        }
    } else if (typeof jsonLd === 'string' && !jsonLd.trim()) {
        jsonLd = null
    }

    const { error } = await adminClient.from('seo_metadata').upsert({
        page_path,
        title: body.title || null,
        description: body.description || null,
        og_title: body.og_title || null,
        og_description: body.og_description || null,
        og_image_url: body.og_image_url || null,
        twitter_card: body.twitter_card || 'summary_large_image',
        keywords: body.keywords || null,
        canonical_url: body.canonical_url || null,
        robots: body.robots || 'index, follow',
        json_ld: jsonLd,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
    }, { onConflict: 'page_path' })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAuditAction({
        actorId: user.id,
        action: 'update_seo_metadata',
        entityType: 'seo',
        metadata: { page_path },
    })

    return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { page_path } = await request.json()
    if (!page_path) return NextResponse.json({ error: 'page_path is required' }, { status: 400 })

    const { error } = await adminClient.from('seo_metadata').delete().eq('page_path', page_path)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAuditAction({
        actorId: user.id,
        action: 'delete_seo_metadata',
        entityType: 'seo',
        metadata: { page_path },
    })

    return NextResponse.json({ success: true })
}
