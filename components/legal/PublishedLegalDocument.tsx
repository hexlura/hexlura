import type { LegalDocument } from '@/lib/legal'

// Renders an admin-published legal document on the public site.
// Content comes exclusively from admins via /admin/legal (TipTap output);
// styling is applied to the raw HTML via arbitrary-variant classes.
export function PublishedLegalDocument({ doc, title }: { doc: LegalDocument; title: string }) {
    const updated = new Date(doc.published_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
    })
    return (
        <div className="max-w-3xl mx-auto px-6 lg:px-10 py-16">
            <h1 className="font-heading text-5xl lg:text-6xl tracking-wide mb-3">{title.toUpperCase()}</h1>
            <p className="text-sm text-muted mb-1">
                Hexlura Ltd · Company No. 17102803 · Registered in England &amp; Wales
            </p>
            <p className="text-sm text-muted mb-6">
                Last updated: {updated} · Version {doc.version}
            </p>
            <div className="border-t-4 border-accent rounded-full mb-10" style={{ borderTopColor: '#E63950' }} />
            <div
                className="text-[15px] leading-[1.9] text-muted [&_h2]:font-heading [&_h2]:text-3xl [&_h2]:tracking-wide [&_h2]:text-text [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:text-text [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-2 [&_a]:text-accent [&_a]:underline [&_strong]:text-text [&_hr]:my-10 [&_hr]:border-border"
                dangerouslySetInnerHTML={{ __html: doc.content_html }}
            />
        </div>
    )
}
