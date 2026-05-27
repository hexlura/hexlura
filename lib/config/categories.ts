export const CATEGORIES = [
    'Club Nights',
    'Gigs & Live Music',
    'Comedy',
    'Theatre & Arts',
    'Festivals',
    'Food & Drink',
    'Sports & Fitness',
    'Business & Networking',
    'Family & Kids',
    'Classes & Workshops',
    'Dating & Social',
    'Culture & Heritage',
] as const

export type Category = typeof CATEGORIES[number]
