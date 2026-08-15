'use client'

import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'

// Tiptap's `editor` instance is a stable object reference across transactions, so
// components reading `editor.isActive(...)` directly at render time never re-render
// when the selection/cursor moves without a document change. useEditorState subscribes
// to the editor's transaction stream and only triggers a re-render when the selected
// slice actually changes, keeping every toolbar's active state in sync with the truth.
export function useToolbarState(editor: Editor) {
    return useEditorState({
        editor,
        selector: ({ editor }) => ({
            bold: editor.isActive('bold'),
            italic: editor.isActive('italic'),
            underline: editor.isActive('underline'),
            strike: editor.isActive('strike'),
            code: editor.isActive('code'),
            link: editor.isActive('link'),
            linkHref: editor.getAttributes('link').href as string | undefined,
            codeBlock: editor.isActive('codeBlock'),
            blockquote: editor.isActive('blockquote'),
            paragraph: editor.isActive('paragraph'),
            heading1: editor.isActive('heading', { level: 1 }),
            heading2: editor.isActive('heading', { level: 2 }),
            heading3: editor.isActive('heading', { level: 3 }),
            heading4: editor.isActive('heading', { level: 4 }),
            heading5: editor.isActive('heading', { level: 5 }),
            heading6: editor.isActive('heading', { level: 6 }),
            bulletList: editor.isActive('bulletList'),
            orderedList: editor.isActive('orderedList'),
            alignLeft: editor.isActive({ textAlign: 'left' }),
            alignCenter: editor.isActive({ textAlign: 'center' }),
            alignRight: editor.isActive({ textAlign: 'right' }),
            alignJustify: editor.isActive({ textAlign: 'justify' }),
            table: editor.isActive('table'),
            canUndo: editor.can().undo(),
            canRedo: editor.can().redo(),
            canSinkListItem: editor.can().sinkListItem('listItem'),
            canLiftListItem: editor.can().liftListItem('listItem'),
        }),
    })
}
