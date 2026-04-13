import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { SettingsClient } from './settings-client'
import { resolveOrganiserId } from '@/lib/organiser-access'

export default async function SettingsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) redirect('/organiser/pending')

    const serviceClient = createServiceClient()
    const { data: organiser } = await serviceClient
        .from('organiser_profiles')
        .select('*')
        .eq('id', organiserId)
        .single()
    if (!organiser) redirect('/organiser/pending')

    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">SETTINGS</h1>
                <p className="text-muted text-sm mt-1">Manage your organiser account</p>
            </div>
            <SettingsClient organiser={organiser} />
        </div>
    )
}
