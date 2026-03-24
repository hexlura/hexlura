'use client'
import { Suspense } from 'react'
import { AppProgressBar as ProgressBar } from 'next-nprogress-bar'

function ProgressBarInner() {
    return (
        <ProgressBar
            height="3px"
            color="#E63950"
            options={{ showSpinner: false }}
            shallowRouting
        />
    )
}

export default function NavigationProgress() {
    return (
        <Suspense fallback={null}>
            <ProgressBarInner />
        </Suspense>
    )
}
