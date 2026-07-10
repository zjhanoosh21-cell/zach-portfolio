import { ProspectConfig } from '@/lib/types'
import { TradeColors } from '@/lib/tradeConfig'

interface ServicesSectionProps {
  prospect: ProspectConfig
  colors: TradeColors
}

export default function ServicesSection({ prospect, colors }: ServicesSectionProps) {
  return (
    <section id="services" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <div
            className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3"
            style={{ backgroundColor: colors.accentLight, color: colors.primary }}
          >
            What We Do
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: colors.primaryDark }}>
            Our <span style={{ color: colors.accent }}>Services</span>
          </h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto text-sm leading-relaxed">
            One licensed team, end to end. Click any service to learn more.
          </p>
        </div>

        {/* Alternating rows */}
        <div className="flex flex-col gap-16">
          {prospect.services.map((service, i) => (
            <div
              key={service.name}
              className={`flex flex-col md:flex-row items-center gap-8 ${
                i % 2 === 1 ? 'md:flex-row-reverse' : ''
              }`}
            >
              <img
                src={service.imageUrl}
                alt={service.name}
                className="w-full md:w-1/2 h-64 object-cover rounded-2xl shadow-lg"
              />
              <div className="md:w-1/2">
                <h3
                  className="text-xl md:text-2xl font-bold mb-3"
                  style={{ color: colors.primaryDark }}
                >
                  {service.name}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">{service.description}</p>
                <a
                  href="#contact"
                  className="inline-block mt-4 text-sm font-semibold transition-opacity hover:opacity-75"
                  style={{ color: colors.accent }}
                >
                  Get a Quote →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
