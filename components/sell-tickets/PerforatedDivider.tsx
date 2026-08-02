// Ticket-tear perforation divider — matches the reference design's .perf element.
// "variant" controls which background colour the punch-holes punch through.

type PerforatedDividerProps = {
  variant?: 'on-white' | 'on-surface' | 'on-ink' | 'on-accent'
}

export default function PerforatedDivider({ variant = 'on-surface' }: PerforatedDividerProps) {
  const holeColour =
    variant === 'on-white'
      ? '#FFFFFF'
      : variant === 'on-ink'
        ? '#0A0A0F'
        : variant === 'on-accent'
          ? 'var(--accent)'
          : '#d4d4d7'

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        height: 28,
        background: `radial-gradient(circle 7px, ${holeColour} 7px, transparent 7.5px) repeat-x center / 28px 28px`,
        overflow: 'visible',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          borderTop: '2px dashed var(--border)',
        }}
      />
    </div>
  )
}
