import type { Metadata } from "next";
import NextTopLoader from 'nextjs-toploader'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import { Bebas_Neue, DM_Sans, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
          <SpeedInsights />
          <MobileBottomNav />
        </div>
      </body>
    </html>
  );
}
