'use client'

import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { GripVertical } from 'lucide-react'

interface HandleRect {
    top: number
    height: number
}

interface DragHandlePluginProps {
    editor: Editor
    /** The positioned wrapper element that contains the editor content — handle coordinates are relative to it. */
    containerRef: React.RefObject<HTMLDivElement>
}

/**
 * Custom drag-to-reorder for top-level blocks. TipTap has no first-party drag-handle
 * extension, so this tracks the hovered top-level node via posAtCoords, renders a grip
 * handle aligned to it, and moves the node on native HTML5 drag/drop.
 */
export function DragHandlePlugin({ editor, containerRef }: DragHandlePluginProps) {
    const [handleRect, setHandleRect] = useState<HandleRect | null>(null)
    const [dropLine, setDropLine] = useState<number | null>(null)
    const [dragging, setDragging] = useState(false)
    const sourcePosRef = useRef<number | null>(null)

    function resolveTopLevel(clientX: number, clientY: number) {
        const coords = editor.view.posAtCoords({ left: clientX, top: clientY })
        if (!coords) return null
        const $pos = editor.state.doc.resolve(coords.pos)
        if ($pos.depth < 1) return null
        const before = $pos.before(1)
        const after = $pos.after(1)
        const index = $pos.index(0)
        const node = editor.state.doc.maybeChild(index)
        if (!node) return null
        return { before, after, node }
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        const containerEl: HTMLDivElement = container

        function handleMouseMove(e: MouseEvent) {
            if (dragging) return
            const target = resolveTopLevel(e.clientX, e.clientY)
            if (!target) { setHandleRect(null); return }
            const dom = editor.view.nodeDOM(target.before) as HTMLElement | null
            if (!dom || !(dom instanceof HTMLElement)) { setHandleRect(null); return }
            const containerRect = containerEl.getBoundingClientRect()
            const domRect = dom.getBoundingClientRect()
            setHandleRect({ top: domRect.top - containerRect.top, height: domRect.height })
        }

        function handleMouseLeave() {
            if (!dragging) setHandleRect(null)
        }

        container.addEventListener('mousemove', handleMouseMove)
        container.addEventListener('mouseleave', handleMouseLeave)
        return () => {
            container.removeEventListener('mousemove', handleMouseMove)
            container.removeEventListener('mouseleave', handleMouseLeave)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, containerRef, dragging])

    function handleDragStart(e: React.DragEvent) {
        if (!handleRect) return
        const target = resolveTopLevel(e.clientX, e.clientY + handleRect.height / 2)
        if (!target) { e.preventDefault(); return }
        sourcePosRef.current = target.before
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', 'block-drag')
        setDragging(true)
    }

    function handleDragOver(e: React.DragEvent) {
        if (sourcePosRef.current === null) return
        e.preventDefault()
        const container = containerRef.current
        if (!container) return
        const target = resolveTopLevel(e.clientX, e.clientY)
        if (!target) return
        const dom = editor.view.nodeDOM(target.before) as HTMLElement | null
        if (!dom) return
        const containerRect = container.getBoundingClientRect()
        const domRect = dom.getBoundingClientRect()
        const midpoint = domRect.top + domRect.height / 2
        const dropAt = e.clientY < midpoint ? target.before : target.after
        setDropLine(dropAt === target.before ? domRect.top - containerRect.top : domRect.bottom - containerRect.top)
    }

    function finishDrag() {
        setDragging(false)
        setDropLine(null)
        setHandleRect(null)
        sourcePosRef.current = null
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault()
        const sourcePos = sourcePosRef.current
        if (sourcePos === null) { finishDrag(); return }
        const target = resolveTopLevel(e.clientX, e.clientY)
        if (!target) { finishDrag(); return }

        const { state, dispatch } = editor.view
        const node = state.doc.nodeAt(sourcePos)
        if (!node) { finishDrag(); return }

        const dom = editor.view.nodeDOM(target.before) as HTMLElement | null
        const midpoint = dom ? dom.getBoundingClientRect().top + dom.getBoundingClientRect().height / 2 : e.clientY
        const targetPos = e.clientY < midpoint ? target.before : target.after

        if (targetPos >= sourcePos && targetPos <= sourcePos + node.nodeSize) { finishDrag(); return }

        const tr = state.tr
        tr.delete(sourcePos, sourcePos + node.nodeSize)
        const mappedTarget = tr.mapping.map(targetPos)
        tr.insert(mappedTarget, node)
        dispatch(tr)
        finishDrag()
    }

    return (
        <>
            {handleRect && !dragging && (
                <button
                    type="button"
                    draggable
                    aria-label="Drag to reorder"
                    title="Drag to reorder"
                    onDragStart={handleDragStart}
                    onDragEnd={finishDrag}
                    style={{ top: handleRect.top + handleRect.height / 2 - 12, left: 4 }}
                    className="absolute z-20 flex items-center justify-center h-6 w-6 rounded text-muted/70 hover:text-text hover:bg-surface cursor-grab active:cursor-grabbing"
                >
                    <GripVertical size={14} />
                </button>
            )}
            {dragging && (
                <div
                    className="absolute inset-0 z-10"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={finishDrag}
                >
                    {dropLine !== null && (
                        <div className="absolute left-4 right-4 h-0.5 bg-accent rounded-full" style={{ top: dropLine }} />
                    )}
                </div>
            )}
        </>
    )
}
