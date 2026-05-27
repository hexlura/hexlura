import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { path } = await req.json() as { path?: string }
    if (!path) return NextResponse.json({ error: 'path is required' }, { status: 400 })

    // Ensure bucket exists — migrations may not have been applied in production
    await adminClient.storage.createBucket('category-images', { public: true }).catch(() => {})

    const { data, error } = await adminClient.storage
        .from('category-images')
        .createSignedUploadUrl(path, { upsert: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Also return the public URL so the client can use it after upload
    const { data: urlData } = adminClient.storage.from('category-images').getPublicUrl(path)

    return NextResponse.json({
        signedUrl: data.signedUrl,
        token: data.token,
        path: data.path,
        publicUrl: urlData.publicUrl,
    })
}
