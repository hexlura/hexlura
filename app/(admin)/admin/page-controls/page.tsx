import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAllPageControlsForAdmin } from '@/lib/page-controls/get-page-controls'
import { PageControlsClient } from './page-controls-client'

const PAGE_LABELS: Record<string, string> = {
    home: 'Home Page',
}

export default async function PageControlsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const controls = await getAllPageControlsForAdmin()

    const groups = new Map<string, typeof controls>()
    for (const control of controls) {
        const group = groups.get(control.page_key)
        if (group) {
            group.push(control)
        } else {
            groups.set(control.page_key, [control])
        }
    }

    return (
        <div className="max-w-3xl">
            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">PAGE CONTROLS</h1>
                <p className="text-muted text-sm mt-1">Show or hide sections of public pages without a deploy</p>
            </div>

            {groups.size === 0 ? (
                <div className="bg-card border border-border rounded-none p-6 text-sm text-muted">
                    No page controls configured yet.
                </div>
            ) : (
                Array.from(groups.entries()).map(([pageKey, sections]) => (
                    <div key={pageKey} className="bg-card border border-border rounded-none p-6 mb-6">
                        <h2 className="text-sm font-medium text-text mb-4 uppercase tracking-wide">
                            {PAGE_LABELS[pageKey] ?? pageKey}
                        </h2>
                        <PageControlsClient pageKey={pageKey} sections={sections} />
                    </div>
                ))
            )}
        </div>
    )
}
