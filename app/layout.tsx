import type { Metadata } from "next";
import { Suspense } from "react";
import NextTopLoader from 'nextjs-toploader'
import { Bebas_Neue, DM_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { MetaPixelInit } from '@/components/analytics/MetaPixel'
import { CookieConsent } from '@/components/analytics/CookieConsent'
import { CrispChat } from '@/components/support/CrispChat'
import { DesignTokens } from '@/components/DesignTokens'
import { createServiceClient } from '@/lib/supabase/service'
import "./globals.css";

const fontHeading = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
});

const fontBody = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.hexlura.com"),
  title: "Hexlura | Discover Events",
  description: "Find and book the hottest events near you.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const serviceClient = createServiceClient()
  const { data: pixelSetting } = await serviceClient
    .from('platform_settings')
    .select('value')
    .eq('key', 'meta_pixel_id')
    .single()
  const platformPixelId = pixelSetting?.value || ''

  return (
    <html lang="en">
      <head>
        <Suspense fallback={null}>
          <DesignTokens />
        </Suspense>
      </head>
      <body
        className={`${fontBody.variable} ${fontHeading.variable} ${fontMono.variable} font-sans antialiased pb-16 md:pb-0`}
      >
        <div className="overflow-x-hidden">
          <NextTopLoader
            color="#E63950"
            height={3}
            showSpinner={false}
            easing="ease"
            speed={200}
            shadow="0 0 10px #E63950, 0 0 5px #E63950"
          />
          {children}
          <Analytics />
          <SpeedInsights />
          <Suspense fallback={null}>
            <GoogleAnalytics />
          </Suspense>
          <CookieConsent />
          <MetaPixelInit pixelId={platformPixelId} />
          <CrispChat />
        </div>
      </body>
    </html>
  );
}
