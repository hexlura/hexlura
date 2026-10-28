import { getStaticPageMetadata } from '@/lib/seo'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import ContactPageClient from './contact-client'
import { getWhatsAppSettings } from '@/lib/whatsapp'
import { formatWhatsAppNumber, whatsAppLink } from '@/lib/whatsapp-shared'

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
    return getStaticPageMetadata('/contact')
}

export default async function ContactPage() {
  // Company WhatsApp, if one is set (admin → Settings → WhatsApp). Only plain strings cross to the client.
  const wa = await getWhatsAppSettings()
  const whatsapp = wa ? { display: formatWhatsAppNumber(wa.number), href: whatsAppLink(wa.number, wa.message) } : null

  return (
    <Suspense fallback={null}>
      <ContactPageClient whatsapp={whatsapp} />
    </Suspense>
  )
}
