'use client'
import { AppProgressBar as ProgressBar } from 'next-nprogress-bar'

export default function NavigationProgress() {
    return (
        <ProgressBar
            height="3px"
            color="#E63950"
            options={{ showSpinner: false }}
            shallowRouting
        />
    )
}
