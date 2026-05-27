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
