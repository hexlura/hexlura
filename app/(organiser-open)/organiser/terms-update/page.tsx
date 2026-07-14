import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getLatestLegalDocument } from '@/lib/legal'
import { TermsUpdateClient } from './terms-update-client'

export const dynamic = 'force-dynamic'

export default async function OrganiserTermsUpdatePage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/organiser/terms-update')

    const serviceClient = createServiceClient()
    const { data: organiser } = await serviceClient
        .from('organiser_profiles')
        .select('org_name, terms_version')
        .eq('user_id', user.id)
        .maybeSingle()

    // Not an organiser owner at all — nothing to accept here
    if (!organiser) redirect('/organiser')

    const latestTerms = await getLatestLegalDocument('terms')
    // Nothing published, or already accepted the current version — no gate needed
    if (!latestTerms || organiser.terms_version === latestTerms.version) redirect('/organiser')

    return (
        <TermsUpdateClient
            orgName={organiser.org_name}
            contentHtml={latestTerms.content_html}
            version={latestTerms.version}
        />
    )
}
