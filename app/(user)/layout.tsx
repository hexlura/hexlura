import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import MobileBottomNav from '@/components/layout/MobileBottomNav'

export default function UserLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="warm-theme min-h-screen">
            <Navbar />
            <main className="min-h-screen max-w-7xl mx-auto px-6 lg:px-10 py-10">
                {children}
            </main>
            <Footer />
            <MobileBottomNav role="user" />
        </div>
    )
}
