import { SiteNavbar } from '@/components/layout/SiteNavbar'
import { Footer } from '@/components/layout/Footer'
import MobileBottomNav from '@/components/layout/MobileBottomNav'

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="warm-theme">
            <SiteNavbar />
            <main className="min-h-screen">{children}</main>
            <Footer />
            <MobileBottomNav role={null} />
        </div>
    )
}
