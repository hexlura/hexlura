import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import MobileBottomNav from '@/components/layout/MobileBottomNav'

export default function UserLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <Navbar />
            <main className="min-h-screen container mx-auto px-4 py-8">
                {children}
            </main>
            <Footer />
            <MobileBottomNav role="user" />
        </>
    )
}
