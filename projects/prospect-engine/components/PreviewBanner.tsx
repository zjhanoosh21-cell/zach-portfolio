'use client'

interface PreviewBannerProps {
  companyName: string
}

// Always coral — this is a studio-brand element, not the prospect’s brand
export default function PreviewBanner({ companyName }: PreviewBannerProps) {
  return (
    <div
      style={{ backgroundColor: '#e8684a' }}
      className="w-full text-white text-center py-3 px-4 text-sm font-medium z-50 relative"
    >
      <span className="opacity-90">
        This is a <strong>free preview site</strong> built for{' '}
        <strong>{companyName}</strong> — site preview —{' '}
      </span>
      <a
        href="https://zjhanoosh21-cell.github.io/zach-portfolio/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-semibold hover:opacity-80 transition-opacity"
      >
        Contact us to claim it →
      </a>
    </div>
  )
}
