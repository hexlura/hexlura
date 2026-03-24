import type { Metadata } from "next";
import NavigationProgress from '@/components/ui/ProgressBar'
import { Bebas_Neue, DM_Sans, JetBrains_Mono } from "next/font/google";
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
        className={`${fontBody.variable} ${fontHeading.variable} ${fontMono.variable} font-sans antialiased`}
      >
        {children}
        <NavigationProgress />
      </body>
    </html>
  );
}
