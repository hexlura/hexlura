// Scoped Tailwind arbitrary-variant classes shared by the rich text editor content
// root (RichTextEditor / legal document editor) and its preview panes, so every
// element renders identically in both — no visual jump between edit and preview.
export const LEGAL_CONTENT_CLASSES =
    '[&_h1]:text-[2em] [&_h1]:font-bold [&_h1]:my-[0.67em] [&_h1]:leading-[1.2] ' +
    '[&_h2]:text-[1.5em] [&_h2]:font-bold [&_h2]:my-[0.75em] [&_h2]:leading-[1.3] ' +
    '[&_h3]:text-[1.25em] [&_h3]:font-bold [&_h3]:my-[0.83em] [&_h3]:leading-[1.4] ' +
    '[&_h4]:text-[1.125em] [&_h4]:font-bold [&_h4]:my-[1em] [&_h4]:leading-[1.4] ' +
    '[&_h5]:text-[1em] [&_h5]:font-bold [&_h5]:my-[1em] [&_h5]:leading-[1.4] ' +
    '[&_h6]:text-[0.875em] [&_h6]:font-bold [&_h6]:my-[1em] [&_h6]:leading-[1.4] ' +
    '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 ' +
    '[&_p]:mb-3 [&_p]:leading-relaxed ' +
    '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 ' +
    '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 ' +
    '[&_li]:mb-1 ' +
    '[&_li_p]:mb-0 ' +
    '[&_a]:text-accent [&_a]:underline ' +
    '[&_strong]:font-semibold ' +
    '[&_s]:line-through [&_del]:line-through ' +
    '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted [&_blockquote]:my-3 ' +
    '[&_hr]:border-border [&_hr]:my-6 ' +
    '[&_code]:bg-surface [&_code]:text-accent [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.85em] [&_code]:font-mono ' +
    // Code blocks: the wrapping <pre> must never exceed its container. overflow-x-auto
    // plus max-w-full keeps long unbroken lines scrollable inside their own box instead
    // of pushing the page width, in both the editor and Preview HTML.
    '[&_pre]:bg-text [&_pre]:text-white [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:my-3 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre [&_pre]:text-xs [&_pre]:leading-relaxed [&_pre]:font-mono ' +
    '[&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_pre_code]:p-0 [&_pre_code]:whitespace-pre ' +
    '[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-3 ' +
    // Tables: Tiptap wraps the <table> in a .tableWrapper div (renderWrapper: true), so
    // overflow lives on the wrapper — the table itself stays auto width and cells get a
    // min-width so empty/newly-inserted cells never collapse to zero-width and vanish.
    '[&_.tableWrapper]:my-4 [&_.tableWrapper]:max-w-full [&_.tableWrapper]:overflow-x-auto ' +
    '[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm ' +
    '[&_th]:border [&_th]:border-border [&_th]:bg-surface [&_th]:px-3 [&_th]:py-2 [&_th]:min-w-[3em] [&_th]:align-top [&_th]:text-left [&_th]:font-semibold ' +
    '[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:min-w-[3em] [&_td]:align-top'
