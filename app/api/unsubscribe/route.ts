import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyUnsubscribeToken } from '@/lib/email-unsubscribe'

function htmlPage(message: string): string {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Unsubscribe — Hexlura</title>
<style>body{font-family:Arial,sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#0A0A0F;padding:0 24px}
h1{font-size:20px}p{color:#555;font-size:14px}</style></head>
<body><h1>Hexlura</h1><p>${message}</p></body></html>`
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
        return new NextResponse(htmlPage('Missing unsubscribe token.'), { status: 400, headers: { 'Content-Type': 'text/html' } })
    }

    const entryId = verifyUnsubscribeToken(token)
    if (!entryId) {
        return new NextResponse(htmlPage('This unsubscribe link is invalid.'), { status: 400, headers: { 'Content-Type': 'text/html' } })
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient
        .from('organiser_email_list_entries')
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq('id', entryId)
        .is('unsubscribed_at', null)

    if (error) {
        return new NextResponse(htmlPage('Something went wrong. Please try again later.'), { status: 500, headers: { 'Content-Type': 'text/html' } })
    }

    return new NextResponse(htmlPage("You've been unsubscribed and won't receive further emails from this contact list."), { status: 200, headers: { 'Content-Type': 'text/html' } })
}
