import { Suspense } from 'react'
import { CheckoutProvider } from '@/lib/checkout-context'
import { getFeeConfig } from '@/lib/fees'
import CheckoutFlow from './checkout-flow'

export default async function CheckoutPage() {
    const feeConfig = await getFeeConfig()

    return (
        <CheckoutProvider initialFeeConfig={feeConfig}>
            <Suspense fallback={
                <div className="max-w-3xl mx-auto py-12 text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full mx-auto" />
                    <p className="text-muted mt-4">Loading checkout...</p>
                </div>
            }>
                <CheckoutFlow />
            </Suspense>
        </CheckoutProvider>
    )
}
