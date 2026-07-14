import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LegalEditorClient } from './legal-client'
import type { LegalDocType } from '@/lib/legal'

export const dynamic = 'force-dynamic'

export default async function AdminLegalPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/admin/legal')

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    if (profile?.role !== 'admin') redirect('/')

    const { data: documents } = await adminClient
        .from('legal_documents')
        .select('id, doc_type, content_html, version, published_at')
        .order('published_at', { ascending: false })

    return (
        <LegalEditorClient
            documents={(documents ?? []) as {
                id: string
                doc_type: LegalDocType
                content_html: string
                version: string
                published_at: string
            }[]}
        />
    )
}
