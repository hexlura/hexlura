import { OrganiserSidebar } from '@/components/layout/OrganiserSidebar'

export default function OrganiserLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen">
            <OrganiserSidebar />
            <main className="flex-1 p-8">{children}</main>
        </div>
    )
}
