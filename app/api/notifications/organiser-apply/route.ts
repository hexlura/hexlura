import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { orgName, role, website, description, monthlyEvents, email } = body

        const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder')
        await resend.emails.send({
            from: 'Hexlura <noreply@hexlura.com>',
            to: 'support@hexlura.com',
            subject: `New Organiser Application: ${orgName}`,
            html: `
                <h2>New Organiser Application</h2>
                <p><strong>Organisation:</strong> ${orgName}</p>
                <p><strong>Applicant:</strong> ${email}</p>
                <p><strong>Role:</strong> ${role || 'N/A'}</p>
                <p><strong>Website:</strong> ${website || 'N/A'}</p>
                <p><strong>Monthly events:</strong> ${monthlyEvents}</p>
                <p><strong>Description:</strong><br>${description}</p>
            `,
        })

        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ ok: false })
    }
}
