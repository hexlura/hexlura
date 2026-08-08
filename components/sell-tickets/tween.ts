export function tweenValue(
    from: number,
    to: number,
    onFrame: (value: number) => void,
    duration = 500
): () => void {
    const start = performance.now()
    let raf = 0
    function frame(now: number) {
        const t = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - t, 3)
        onFrame(from + (to - from) * eased)
        if (t < 1) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
}

export const gbpFormatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
})
