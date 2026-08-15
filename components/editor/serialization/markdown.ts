import TurndownService from 'turndown'
import type { Editor } from '@tiptap/react'
import { setHTML } from './html'

let turndownService: TurndownService | null = null

function getTurndown(): TurndownService {
    if (!turndownService) {
        turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
        turndownService.addRule('strikethrough', {
            filter: ['s', 'del'],
            replacement: (content) => `~~${content}~~`,
        })
    }
    return turndownService
}

export function getMarkdown(editor: Editor): string {
    return getTurndown().turndown(editor.getHTML())
}

/**
 * Minimal Markdown → HTML conversion covering the subset this editor produces
 * (headings, emphasis, lists, links, images, code, blockquotes, rules) — not a
 * general-purpose CommonMark parser.
 */
function markdownToHTML(markdown: string): string {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n')
    const html: string[] = []
    let inList: 'ul' | 'ol' | null = null
    let inCodeBlock = false
    let codeLang = ''
    let codeBuffer: string[] = []

    function closeList() {
        if (inList) {
            html.push(inList === 'ul' ? '</ul>' : '</ol>')
            inList = null
        }
    }

    function inlineMarkdown(text: string): string {
        return text
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" />')
            .replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/~~([^~]+)~~/g, '<s>$1</s>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
    }

    for (const rawLine of lines) {
        const fence = rawLine.match(/^```(\w*)\s*$/)
        if (fence) {
            if (!inCodeBlock) {
                inCodeBlock = true
                codeLang = fence[1] ?? ''
                codeBuffer = []
            } else {
                closeList()
                const cls = codeLang ? ` class="language-${codeLang}"` : ''
                html.push(`<pre><code${cls}>${codeBuffer.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`)
                inCodeBlock = false
            }
            continue
        }
        if (inCodeBlock) {
            codeBuffer.push(rawLine)
            continue
        }

        const line = rawLine.trimEnd()
        if (!line.trim()) { closeList(); continue }

        const heading = line.match(/^(#{1,6})\s+(.*)$/)
        if (heading) {
            closeList()
            const level = heading[1].length
            html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`)
            continue
        }
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
            closeList()
            html.push('<hr />')
            continue
        }
        const quote = line.match(/^>\s?(.*)$/)
        if (quote) {
            closeList()
            html.push(`<blockquote><p>${inlineMarkdown(quote[1])}</p></blockquote>`)
            continue
        }
        const bullet = line.match(/^[-*+]\s+(.*)$/)
        if (bullet) {
            if (inList !== 'ul') { closeList(); html.push('<ul>'); inList = 'ul' }
            html.push(`<li>${inlineMarkdown(bullet[1])}</li>`)
            continue
        }
        const ordered = line.match(/^\d+\.\s+(.*)$/)
        if (ordered) {
            if (inList !== 'ol') { closeList(); html.push('<ol>'); inList = 'ol' }
            html.push(`<li>${inlineMarkdown(ordered[1])}</li>`)
            continue
        }

        closeList()
        html.push(`<p>${inlineMarkdown(line)}</p>`)
    }
    closeList()
    return html.join('\n')
}

export function setMarkdown(editor: Editor, markdown: string): void {
    setHTML(editor, markdownToHTML(markdown))
}
