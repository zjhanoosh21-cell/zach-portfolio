import { ProspectConfig } from '@/lib/types'
import { TradeColors } from '@/lib/tradeConfig'

interface TestimonialsSectionProps {
  prospect: ProspectConfig
  colors: TradeColors
}

export default function TestimonialsSection({ prospect, colors }: TestimonialsSectionProps) {
  return (
    <section id="reviews" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div
            className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3"
            style={{ backgroundColor: colors.accentLight, color: colors.primary }}
          >
            Testimonials
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: colors.primaryDark }}>
            What Our Customers <span style={{ color: colors.accent }}>Say</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {prospect.testimonials.map((t, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col gap-3"
            >
              <div className="text-yellow-400 text-xl">★★★★★</div>
              <blockquote className="text-gray-600 text-sm leading-relaxed italic">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div>
                <p className="font-bold text-sm" style={{ color: colors.primaryDark }}>
                  {t.author}
                </p>
                <p className="text-xs text-gray-400">{t.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
