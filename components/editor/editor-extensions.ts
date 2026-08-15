import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { createLowlight, common } from 'lowlight'

const lowlight = createLowlight(common)

export function createEditorExtensions(placeholder?: string) {
    return [
        StarterKit.configure({
            heading: { levels: [1, 2, 3, 4, 5, 6] },
            link: false,
            underline: false,
            codeBlock: false,
        }),
        Underline,
        TextStyle,
        Link.configure({
            openOnClick: false,
            autolink: true,
            HTMLAttributes: { class: 'text-accent underline' },
        }),
        Image.configure({
            HTMLAttributes: { class: 'rounded-lg' },
        }),
        // renderWrapper keeps the exported HTML (used by Preview) wrapped in the same
        // .tableWrapper div the live editor NodeView already uses, so overflow handling
        // is identical in both places.
        Table.configure({ resizable: true, renderWrapper: true }),
        TableRow,
        TableHeader,
        TableCell,
        TextAlign.configure({
            types: ['heading', 'paragraph'],
        }),
        Placeholder.configure({
            placeholder: placeholder ?? 'Start writing…',
        }),
        CodeBlockLowlight.configure({ lowlight }),
    ]
}
