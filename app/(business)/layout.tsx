import { Inter } from 'next/font/google'

const fontSelling = Inter({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700', '800', '900'],
    variable: '--font-selling',
})

export default function SellingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <div className={`${fontSelling.variable} font-selling`}>{children}</div>
}
