import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Door staff now sign in on the main login page; this keeps old links and bookmarks working.
export default function DoorStaffLoginPage() {
    redirect('/auth/login?next=/checkin')
}
