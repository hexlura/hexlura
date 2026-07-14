import type { LegalDocument } from '@/lib/legal'

// Renders an admin-published legal document on the public site.
// Content comes exclusively from admins via /admin/legal (TipTap output);
// styling is applied to the raw HTML via arbitrary-variant classes.
export function PublishedLegalDocument({ doc, title }: { doc: LegalDocument; title: string }) {
    const updated = new Date(doc.published_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
    })
    return (
        <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
            <div style={{ maxWidth: 860, margin: '0 auto', padding: '60px 24px' }}>
                <h1 style={{ fontFamily: 'var(--font-heading), "Bebas Neue", "Arial Black", sans-serif', fontSize: 48, color: '#0A0A0F', marginBottom: 8 }}>
                    {title}
                </h1>
                <p style={{ fontSize: 13, color: '#8888AA', marginBottom: 4 }}>
                    Hexlura Ltd · Company No. 17102803 · Registered in England &amp; Wales
                </p>
                <p style={{ fontSize: 13, color: '#8888AA', marginBottom: 8 }}>
                    Last updated: {updated} · Version {doc.version}
                </p>
                <div style={{ borderTop: '3px solid #E63950', margin: '24px 0 40px' }} />
                <div
                    className="text-[15px] leading-[1.9] text-[#333333] [&_h2]:font-heading [&_h2]:text-[28px] [&_h2]:text-[#E63950] [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:text-[#0A0A0F] [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-2 [&_a]:text-[#E63950] [&_a]:underline [&_strong]:text-[#0A0A0F] [&_hr]:my-10 [&_hr]:border-[#EEEEEE]"
                    dangerouslySetInnerHTML={{ __html: doc.content_html }}
                />
            </div>
        </div>
    )
}
