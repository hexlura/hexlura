import { NextResponse } from 'next/server'
import { getFeeConfig } from '@/lib/fees'

export const dynamic = 'force-dynamic'

export async function GET() {
    const config = await getFeeConfig()

    return NextResponse.json(config, {
        headers: {
            'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
        },
    })
}
