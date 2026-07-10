import { ProspectConfig } from '@/lib/types'
import { TradeColors } from '@/lib/tradeConfig'

interface AboutSectionProps {
  prospect: ProspectConfig
  colors: TradeColors
  licenseLabel: string
}

export default function AboutSection({ prospect, colors, licenseLabel }: AboutSectionProps) {
  const checks = [
    `${licenseLabel} — ${prospect.state} Licensed`,
    'Fully Insured — Liability & Workers\' Comp',
    'Flat-Rate, Upfront Pricing',
    'Same-Day Service Available',
    '100% Satisfaction Guarantee',
    `Locally Owned & Operated in ${prospect.city}`,
  ]

  return (
    <section id="about" className="py-20 px-4" style={{ backgroundColor: colors.accentLight }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
        {/* Text */}
        <div className="md:w-1/2">
          <div
            className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3"
            style={{ backgroundColor: colors.primary, color: '#fff' }}
          >
            About Us
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: colors.primaryDark }}>
            Our <span style={{ color: colors.accent }}>Story</span>
          </h2>
          <p className="text-gray-600 leading-relaxed text-sm mb-6">{prospect.about}</p>

          <ul className="flex flex-col gap-2">
            {checks.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                <span
                  className="mt-0.5 font-bold text-base"
                  style={{ color: colors.accent }}
                >
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Image */}
        <div className="md:w-1/2">
          <img
            src={
              prospect.aboutImageUrl ??
              'https://images.unsplash.com/photo-1676210134190-3f2c0d5cf58d?w=800&h=600&fit=crop&q=80'
            }
            alt={`${prospect.companyName} at work`}
            className="w-full h-80 object-cover rounded-2xl shadow-lg"
          />
          {prospect.founded && (
            <div
              className="mt-4 text-center text-sm font-semibold py-2 rounded-xl text-white"
              style={{ backgroundColor: colors.primary }}
            >
              Proudly serving {prospect.serviceArea} since {prospect.founded}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
