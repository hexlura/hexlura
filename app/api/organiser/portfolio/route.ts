import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getOrganiser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { user: null, organiser: null }
    const adminClient = createAdminClient()
    const { data: organiser } = await adminClient
        .from('organiser_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
    return { user, organiser }
}

export async function GET() {
    const { organiser } = await getOrganiser()
    if (!organiser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
        .from('organiser_portfolio')
        .select('*')
        .eq('organiser_id', organiser.id)
        .order('display_order', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ items: data || [] })
}

export async function POST(req: NextRequest) {
    const { organiser } = await getOrganiser()
    if (!organiser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { type, url, thumbnail_url, caption } = body

    const adminClient = createAdminClient()
    const { count } = await adminClient
        .from('organiser_portfolio')
        .select('*', { count: 'exact', head: true })
        .eq('organiser_id', organiser.id)

    const { data, error } = await adminClient
        .from('organiser_portfolio')
        .insert({
            organiser_id: organiser.id,
            type,
            url,
            thumbnail_url: thumbnail_url || null,
            caption: caption || null,
            display_order: (count ?? 0),
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })
}

export async function PATCH(req: NextRequest) {
    const { organiser } = await getOrganiser()
    if (!organiser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, ...fields } = body

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
        .from('organiser_portfolio')
        .update(fields)
        .eq('id', id)
        .eq('organiser_id', organiser.id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })
}

export async function DELETE(req: NextRequest) {
    const { organiser } = await getOrganiser()
    if (!organiser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id } = body

    const adminClient = createAdminClient()

    // Get the item first to check type and get URL for storage cleanup
    const { data: item } = await adminClient
        .from('organiser_portfolio')
        .select('type, url')
        .eq('id', id)
        .eq('organiser_id', organiser.id)
        .single()

    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Delete DB record
    const { error } = await adminClient
        .from('organiser_portfolio')
        .delete()
        .eq('id', id)
        .eq('organiser_id', organiser.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Clean up storage if photo
    if (item.type === 'photo') {
        try {
            const url = new URL(item.url)
            const pathParts = url.pathname.split('/organiser-portfolio/')
            if (pathParts.length === 2) {
                const supabase = createClient()
                await supabase.storage.from('organiser-portfolio').remove([pathParts[1]])
            }
        } catch {
            // Ignore storage cleanup errors
        }
    }

    return NextResponse.json({ success: true })
}
