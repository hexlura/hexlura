import Link from 'next/link';
import Image from 'next/image';

const organiserTypeLabels: Record<string, string> = {
    club_venue: 'Club & Venue',
    individual: 'Individual Organiser',
    artist: 'Artist',
    event_company: 'Event Company',
    charity: 'Charity',
    education: 'Education',
};

interface OrganiserCardProps {
    organiser: {
        id: string;
        org_name: string;
        slug: string;
        logo_url: string | null;
        organiser_type: string;
    };
}

export default function OrganiserCard({ organiser }: OrganiserCardProps) {
    return (
        <Link
            href={`/organisers/${organiser.slug}`}
            className="group flex flex-col items-center bg-white overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] hover:border-l-[3px] hover:border-l-[#E63950]"
            style={{
                width: '100%',
                border: '1px solid #E0E0E0',
                borderRadius: 0,
                cursor: 'pointer',
                borderLeft: '3px solid transparent',
                padding: '24px 12px',
                textDecoration: 'none',
                color: 'inherit',
            }}
        >
            {/* Avatar */}
            <div
                className="rounded-full overflow-hidden relative shrink-0 flex items-center justify-center"
                style={{ width: '64px', height: '64px', background: '#C0C0C8', marginBottom: '12px' }}
            >
                {organiser.logo_url ? (
                    <Image src={organiser.logo_url} alt={organiser.org_name} fill className="object-cover" />
                ) : (
                    <span style={{ fontSize: '24px', fontWeight: 700, color: '#0A0A0F' }}>
                        {organiser.org_name.charAt(0).toUpperCase()}
                    </span>
                )}
            </div>

            {/* Name */}
            <p
                style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0A0A0F',
                    lineHeight: 1.3,
                    textAlign: 'center',
                    marginBottom: '4px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                } as React.CSSProperties}
            >
                {organiser.org_name}
            </p>

            {/* Type */}
            <p style={{ fontSize: '12px', color: '#666677', textAlign: 'center' }}>
                {organiserTypeLabels[organiser.organiser_type] ?? organiser.organiser_type}
            </p>
        </Link>
    );
}
