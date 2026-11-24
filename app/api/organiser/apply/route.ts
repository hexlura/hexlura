import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLatestLegalDocument } from '@/lib/legal'
import { TERMS_VERSION } from '@/lib/terms'
import { logAuditAction } from '@/lib/audit'

// Organiser sign-up. This used to run in the browser (insert an approved organiser_profiles row,
// then set profiles.role = 'organiser'), which meant any session could approve itself and promote
// its own role. It now runs here with the service role, after validating the caller and the input.
// Behaviour is unchanged for real users: the organiser is approved immediately.

const ORG_TYPES = ['individual', 'artist', 'club_venue', 'event_company', 'charity', 'education']

function toSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function text(value: unknown, max: number): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed.length > max ? null : trimmed
}

export async function POST(request: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // Guest sessions can be minted by anyone — organisers need a real account.
    if (user.is_anonymous) return NextResponse.json({ error: 'Please create an account to apply.' }, { status: 403 })

    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const orgName = text(body.orgName, 100)
    if (!orgName || orgName.length < 2) return NextResponse.json({ error: 'Enter your organisation name (2–100 characters).' }, { status: 400 })
    if (!toSlug(orgName)) return NextResponse.json({ error: 'Organisation name must contain letters or numbers.' }, { status: 400 })

    const orgType = typeof body.orgType === 'string' ? body.orgType : ''
    if (!ORG_TYPES.includes(orgType)) return NextResponse.json({ error: 'Please select your organiser type.' }, { status: 400 })

    if (body.agreedTerms !== true) return NextResponse.json({ error: 'You must agree to the organiser terms' }, { status: 400 })

    const description = text(body.description ?? '', 2000)
    if (description === null) return NextResponse.json({ error: 'Description is too long (2000 characters max).' }, { status: 400 })

    let website: string | null = null
    const rawWebsite = text(body.website ?? '', 200)
    if (rawWebsite === null) return NextResponse.json({ error: 'Website address is too long.' }, { status: 400 })
    if (rawWebsite) {
        try {
            const url = new URL(/^https?:\/\//i.test(rawWebsite) ? rawWebsite : `https://${rawWebsite}`)
            if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('bad protocol')
            website = rawWebsite
        } catch {
            return NextResponse.json({ error: 'Enter a valid website address.' }, { status: 400 })
        }
    }

    const vatRegistered = body.vatRegistered === true
    let vatNumber: string | null = null
    if (vatRegistered) {
        vatNumber = text(body.vatNumber ?? '', 20)
        if (!vatNumber || !/^[A-Za-z0-9 ]{2,20}$/.test(vatNumber)) {
            return NextResponse.json({ error: 'Enter a valid VAT number.' }, { status: 400 })
        }
    }

    const adminClient = createAdminClient()

    const { data: profile, error: profileErr } = await adminClient.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profileErr) return NextResponse.json({ error: 'Could not check your account. Please try again.' }, { status: 500 })
    if (!profile) return NextResponse.json({ error: 'Your account is not set up yet. Please try again shortly.' }, { status: 409 })
    // Only plain users can apply — never overwrite an admin / door-staff / existing organiser role.
    if (profile.role !== 'user') return NextResponse.json({ error: 'Your account already has a role that cannot apply as an organiser.' }, { status: 409 })

    const { data: existing, error: existingErr } = await adminClient.from('organiser_profiles').select('id').eq('user_id', user.id).maybeSingle()
    if (existingErr) return NextResponse.json({ error: 'Could not check your account. Please try again.' }, { status: 500 })
    if (existing) return NextResponse.json({ error: 'You already have an organiser profile.' }, { status: 409 })

    // Acceptance is stamped with the currently-published terms version (code constant until the first publish)
    const publishedTerms = await getLatestLegalDocument('terms')
    const termsVersion = publishedTerms?.version ?? TERMS_VERSION

    const now = new Date().toISOString()
    let organiserId: string | null = null
    for (let attempt = 0; attempt < 3 && !organiserId; attempt++) {
        const slug = `${toSlug(orgName)}-${Math.random().toString(36).slice(2, 6)}`
        const { data: inserted, error: insertErr } = await adminClient
            .from('organiser_profiles')
            .insert({
                user_id: user.id,
                org_name: orgName,
                slug,
                description,
                website,
                vat_registered: vatRegistered,
                vat_number: vatNumber,
                organiser_type: orgType,
                is_approved: true,
                approved_at: now,
                terms_accepted_at: now,
                terms_version: termsVersion,
            })
            .select('id')
            .single()
        if (inserted) {
            organiserId = inserted.id
        } else if (insertErr?.code !== '23505') {
            console.error('Organiser apply insert failed:', insertErr?.message)
            return NextResponse.json({ error: 'Could not create your organiser profile. Please try again.' }, { status: 500 })
        }
    }
    if (!organiserId) return NextResponse.json({ error: 'Could not create your organiser profile. Please try again.' }, { status: 500 })

    // Promote the role. If this fails, remove the profile row so the user is not left half-created.
    const { error: roleErr } = await adminClient.from('profiles').update({ role: 'organiser' }).eq('id', user.id).eq('role', 'user')
    if (roleErr) {
        console.error('Organiser apply role update failed:', roleErr.message)
        await adminClient.from('organiser_profiles').delete().eq('id', organiserId)
        return NextResponse.json({ error: 'Could not finish setting up your account. Please try again.' }, { status: 500 })
    }

    await logAuditAction({ actorId: user.id, action: 'organiser_apply', entityType: 'organiser', entityId: organiserId })

    return NextResponse.json({ success: true })
}
