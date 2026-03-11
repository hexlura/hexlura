import { Navbar } from '@/components/layout/Navbar'

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
        </>
    )
}
