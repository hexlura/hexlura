import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const adminClient = createAdminClient()
    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return null
    return adminClient
}

export async function GET() {
    const adminClient = await requireAdmin()
    if (!adminClient) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await adminClient
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ categories: data })
}

export async function POST(req: NextRequest) {
    const adminClient = await requireAdmin()
    if (!adminClient) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, slug, image_url, display_order, is_active } = body

    if (!name || !slug) {
        return NextResponse.json({ error: 'name and slug are required' }, { status: 400 })
    }

    const { data, error } = await adminClient
        .from('categories')
        .insert({ name, slug, image_url: image_url || null, display_order: display_order ?? 0, is_active: is_active ?? true })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ category: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
    const adminClient = await requireAdmin()
    if (!adminClient) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, ...fields } = body

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { data, error } = await adminClient
        .from('categories')
        .update(fields)
        .eq('id', id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ category: data })
}

export async function DELETE(req: NextRequest) {
    const adminClient = await requireAdmin()
    if (!adminClient) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id } = body

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { error } = await adminClient.from('categories').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
