import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: notifications } = await supabase
        .from('notifications')
        .select('id, type, title, body, is_read, link, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)

    const list = notifications || []
    const unreadCount = list.filter((n: { is_read: boolean }) => !n.is_read).length

    return NextResponse.json({ notifications: list, unreadCount })
}

export async function PATCH(req: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, all } = body

    if (all) {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false)
    } else if (id) {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id)
            .eq('user_id', user.id)
    } else {
        return NextResponse.json({ error: 'Provide id or all:true' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { id, all, read } = body as { id?: string; all?: boolean; read?: boolean }

    let q = supabase.from('notifications').delete().eq('user_id', user.id)
    if (id) {
        q = q.eq('id', id)
    } else if (read) {
        q = q.eq('is_read', true)
    } else if (!all) {
        return NextResponse.json({ error: 'Provide id, all:true, or read:true' }, { status: 400 })
    }

    const { error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
}
