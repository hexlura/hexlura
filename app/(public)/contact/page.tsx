import { getStaticPageMetadata } from '@/lib/seo'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import ContactPageClient from './contact-client'

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
    return getStaticPageMetadata('/contact')
}

export default function ContactPage() {
  return (
    <Suspense fallback={null}>
      <ContactPageClient />
    </Suspense>
  )
}
