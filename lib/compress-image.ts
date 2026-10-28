// Browser-only — uses Canvas API. Never import in server components or API routes.

export function compressImage(
    file: File,
    maxPx = 1200,
    quality = 0.82,
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const objectUrl = URL.createObjectURL(file)
        img.onload = () => {
            URL.revokeObjectURL(objectUrl)
            let { width, height } = img
            if (width > maxPx || height > maxPx) {
                if (width > height) {
                    height = Math.round((height * maxPx) / width)
                    width = maxPx
                } else {
                    width = Math.round((width * maxPx) / height)
                    height = maxPx
                }
            }
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) { reject(new Error('Canvas not supported')); return }
            ctx.drawImage(img, 0, 0, width, height)
            canvas.toBlob(
                blob => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
                'image/webp',
                quality,
            )
        }
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl)
            reject(new Error('Could not load image'))
        }
        img.src = objectUrl
    })
}

// ── Shared upload helpers (profile logo/cover/avatar/portfolio) ────────────────

export const IMAGE_MAX_ORIGINAL_BYTES = 15 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Returns an organiser-readable message if the file must not be uploaded, else null.
export function validateImageFile(file: File): string | null {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Only JPG, PNG or WEBP files are allowed.'
    if (file.size > IMAGE_MAX_ORIGINAL_BYTES) return `That image is ${(file.size / 1048576).toFixed(1)}MB — please choose one under 15MB.`
    return null
}

// Compress, then label the result with what it really is (Safari can't encode webp and hands back a PNG).
// If compression fails the original file is used — only after validateImageFile, so it is still a real image.
export async function prepareImage(file: File, maxPx: number): Promise<{ blob: Blob; mime: string; ext: string }> {
    let blob: Blob
    try { blob = await compressImage(file, maxPx) } catch { blob = file }
    const mime = blob.type === 'image/png' ? 'image/png' : blob.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp'
    const ext = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : 'webp'
    return { blob, mime, ext }
}

// Path inside a public bucket, from its public URL (null if the URL isn't from that bucket).
export function storagePathFromUrl(url: string | null | undefined, bucket: string): string | null {
    if (!url) return null
    const marker = `/object/public/${bucket}/`
    const i = url.indexOf(marker)
    return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split('?')[0])
}

export function friendlyUploadError(error: { message?: string; statusCode?: string | number } | null | undefined): string {
    const msg = (error?.message || '').toLowerCase()
    const status = String(error?.statusCode ?? '')
    if (msg.includes('row-level security') || msg.includes('unauthorized') || status === '401' || status === '403')
        return 'Upload not allowed — your session may have expired. Refresh the page, sign in again and retry.'
    if (msg.includes('exceeded the maximum') || msg.includes('too large') || status === '413')
        return 'That image is too large. Please choose a smaller one (under 15MB).'
    if (msg.includes('failed to fetch') || msg.includes('network'))
        return 'Upload failed — check your internet connection and try again.'
    if (msg.includes('bucket not found') || status === '404')
        return 'Image storage is not available right now. Please contact support@hexlura.com.'
    return `Upload failed: ${error?.message || 'unexpected error'}. Please try again.`
}
