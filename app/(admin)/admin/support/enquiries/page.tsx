import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import {
    CONTACT_TOPICS, ENQUIRY_PRIORITIES, ENQUIRY_SORTABLE_COLUMNS,
    type ContactEnquiryRow, type EnquirySortColumn,
} from '@/lib/contact'
import { EnquiriesClient } from './enquiries-client'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20
const VALID_TOPICS = CONTACT_TOPICS.map(t => t.value) as string[]
const VALID_PRIORITIES = ENQUIRY_PRIORITIES.map(p => p.value) as string[]
const VALID_TRISTATE = ['true', 'false']
const VALID_SCHEDULE_FILTERS = ['scheduled', 'not_scheduled', 'upcoming', 'past']
const VALID_DIRECTIONS = ['asc', 'desc']

// PostgREST's `.or()` filter DSL treats bare commas/parens as syntax —
// quoting the value lets it contain them safely without breaking out of
// the intended column/operator.
function quoteIlikeValue(v: string): string {
    return v.replace(/"/g, '\\"')
}

interface PageProps {
    searchParams: {
        page?: string
        search?: string
        topic?: string
        source?: string
        is_read?: string
        is_connected?: string
        is_converted?: string
        schedule?: string
        priority?: string
        sort?: string
        direction?: string
    }
}

export default async function AdminEnquiriesPage({ searchParams }: PageProps) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    if (profile?.role !== 'admin') redirect('/')

    // --- Validate + normalize all incoming query params (untrusted input) ---
    const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1)
    const search = (searchParams.search ?? '').trim().slice(0, 200)
    const topic = VALID_TOPICS.includes(searchParams.topic ?? '') ? searchParams.topic! : ''
    const isRead = VALID_TRISTATE.includes(searchParams.is_read ?? '') ? searchParams.is_read! : ''
    const isConnected = VALID_TRISTATE.includes(searchParams.is_connected ?? '') ? searchParams.is_connected! : ''
    const isConverted = VALID_TRISTATE.includes(searchParams.is_converted ?? '') ? searchParams.is_converted! : ''
    const schedule = VALID_SCHEDULE_FILTERS.includes(searchParams.schedule ?? '') ? searchParams.schedule! : ''
    const priority = VALID_PRIORITIES.includes(searchParams.priority ?? '') ? searchParams.priority! : ''
    const sort: EnquirySortColumn = (ENQUIRY_SORTABLE_COLUMNS as readonly string[]).includes(searchParams.sort ?? '')
        ? (searchParams.sort as EnquirySortColumn)
        : 'created_at'
    const direction = VALID_DIRECTIONS.includes(searchParams.direction ?? '') ? searchParams.direction! : 'desc'

    // Distinct known source values, for the filter dropdown. The table is
    // small (admin lead-management data, not a high-volume ledger) so a
    // single-column scan is cheap; revisit with a dedicated lookup if the
    // table grows large enough for this to matter.
    const { data: sourceRows } = await adminClient
        .from('contact_enquiries')
        .select('source')
        .limit(5000)
    const availableSources = Array.from(new Set((sourceRows || []).map(r => r.source as string))).sort()
    const source = availableSources.includes(searchParams.source ?? '') ? searchParams.source! : ''

    let query = adminClient
        .from('contact_enquiries')
        .select('*', { count: 'exact' })

    if (search) {
        const q = quoteIlikeValue(search)
        query = query.or(`name.ilike."%${q}%",email.ilike."%${q}%"`)
    }
    if (topic) query = query.eq('topic', topic)
    if (source) query = query.eq('source', source)
    if (isRead) query = query.eq('is_read', isRead === 'true')
    if (isConnected) query = query.eq('is_connected', isConnected === 'true')
    if (isConverted) query = query.eq('is_converted', isConverted === 'true')
    if (priority) query = query.eq('priority', priority)

    if (schedule === 'scheduled') {
        query = query.not('upcoming_schedule', 'is', null)
    } else if (schedule === 'not_scheduled') {
        query = query.is('upcoming_schedule', null)
    } else if (schedule === 'upcoming') {
        query = query.gte('upcoming_schedule', new Date().toISOString())
    } else if (schedule === 'past') {
        query = query.not('upcoming_schedule', 'is', null).lt('upcoming_schedule', new Date().toISOString())
    }

    // Nulls always sort last regardless of direction — unscheduled /
    // unprioritised enquiries shouldn't dominate either end of the list.
    query = query.order(sort, { ascending: direction === 'asc', nullsFirst: false })

    const offset = (page - 1) * PAGE_SIZE
    query = query.range(offset, offset + PAGE_SIZE - 1)

    const { data, count, error } = await query

    if (error) {
        console.error('[admin/support/enquiries] query failed:', error.message)
    }

    const enquiries = (data || []) as ContactEnquiryRow[]

    return (
        <EnquiriesClient
            enquiries={enquiries}
            totalRows={count ?? 0}
            page={page}
            pageSize={PAGE_SIZE}
            availableSources={availableSources}
            sort={sort}
            direction={direction as 'asc' | 'desc'}
            loadError={Boolean(error)}
        />
    )
}
