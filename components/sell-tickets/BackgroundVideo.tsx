export default function BackgroundVideo({
  webmSrc,
  mp4Src,
  poster,
  className,
}: {
  webmSrc: string
  mp4Src: string
  poster: string
  className?: string
}) {
  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      poster={poster}
      className={className}
    >
      <source src={webmSrc} type="video/webm" />
      <source src={mp4Src} type="video/mp4" />
    </video>
  )
}
