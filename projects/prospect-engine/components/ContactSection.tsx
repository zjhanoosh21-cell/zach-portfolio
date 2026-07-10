import { ProspectConfig } from '@/lib/types'
import { TradeColors } from '@/lib/tradeConfig'

interface ContactSectionProps {
  prospect: ProspectConfig
  colors: TradeColors
}

export default function ContactSection({ prospect, colors }: ContactSectionProps) {
  return (
    <section
      id="contact"
      className="py-20 px-4"
      style={{ backgroundColor: colors.primary }}
    >
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4 text-white/70 border border-white/30">
          Get In Touch
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
          Ready to Get Started?
        </h2>
        <p className="text-white/75 text-sm mb-10 max-w-md mx-auto leading-relaxed">
          Whether it&apos;s an emergency or a planned project — reach out and we&apos;ll get back to you fast.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
          <a
            href={`tel:${prospect.phone.replace(/\D/g, '')}`}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-white text-sm border-2 border-white hover:bg-white/10 transition-colors"
          >
            📞 Call {prospect.phone}
          </a>
          {prospect.email && (
            <a
              href={`mailto:${prospect.email}`}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: colors.accent, color: '#fff' }}
            >
              ✉️ Email Us
            </a>
          )}
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-xl p-4 text-white">
            <p className="text-2xl mb-2">📍</p>
            <p className="font-bold text-sm">{prospect.city}, {prospect.state}</p>
            <p className="text-white/60 text-xs mt-1">{prospect.serviceArea}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-white">
            <p className="text-2xl mb-2">🕐</p>
            <p className="font-bold text-sm">Hours</p>
            <p className="text-white/60 text-xs mt-1">{prospect.hours}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-white">
            <p className="text-2xl mb-2">📞</p>
            <p className="font-bold text-sm">{prospect.email ? 'Email' : 'Call or Text'}</p>
            <p className="text-white/60 text-xs mt-1">{prospect.email || prospect.phone}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
