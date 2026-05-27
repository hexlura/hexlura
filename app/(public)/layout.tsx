import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import MobileBottomNav from '@/components/layout/MobileBottomNav'

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <Navbar />
            <main className="min-h-screen">{children}</main>
            <Footer />
            <MobileBottomNav role={null} />
        </>
    )
}
