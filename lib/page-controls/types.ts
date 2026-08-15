export interface PageControl {
    id: string
    page_key: string
    section_key: string
    display_name: string
    is_visible: boolean
    sort_order: number
    updated_at: string
    updated_by: string | null
}

export type UpdatePageControlResult =
    | { success: true }
    | {
        success: false
        code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'INVALID_INPUT' | 'NOT_FOUND' | 'DATABASE_ERROR'
        message: string
    }
