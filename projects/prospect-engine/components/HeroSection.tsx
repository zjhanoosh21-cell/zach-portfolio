import { ProspectConfig } from '@/lib/types'
import { TradeColors } from '@/lib/tradeConfig'

interface HeroSectionProps {
  prospect: ProspectConfig
  colors: TradeColors
  heroImage: string
  badgeLabel: string
}

export default function HeroSection({ prospect, colors, heroImage, badgeLabel }: HeroSectionProps) {
  return (
    <section
      id="home"
      className="relative min-h-[560px] flex items-center"
      style={{
        backgroundImage: `url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay — slightly lighter so the background photo reads through */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: colors.heroOverlay, opacity: 0.82 }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 w-full">
        <div className="max-w-2xl">
          <div
            className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
            style={{ backgroundColor: colors.accent, color: '#fff' }}
          >
            {prospect.serviceArea}&apos;s Trusted {badgeLabel}
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4">
            {prospect.tagline}
          </h1>

          <p className="text-white/85 text-lg md:text-xl leading-relaxed mb-8 max-w-xl">
            {prospect.subTagline}
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href="#contact"
              className="px-6 py-3 rounded-full font-bold text-white text-sm shadow-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: colors.accent }}
            >
              Request Service
            </a>
            <a
              href="#services"
              className="px-6 py-3 rounded-full font-bold text-sm border-2 border-white text-white hover:bg-white/10 transition-colors"
            >
              Explore Services
            </a>
          </div>
        </div>
      </div>

      {/* Location badge */}
      <div className="absolute bottom-6 right-6 hidden md:flex flex-col items-center text-center p-4 rounded-xl shadow-xl max-w-[160px] bg-white">
        <span className="text-2xl mb-1">📍</span>
        <p className="font-bold text-sm" style={{ color: colors.primary }}>{prospect.city}, {prospect.state}</p>
        <p className="text-xs mt-1 text-gray-500">Proudly serving {prospect.serviceArea}</p>
      </div>
    </section>
  )
}
