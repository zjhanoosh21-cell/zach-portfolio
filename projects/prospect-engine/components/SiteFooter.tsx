import { ProspectConfig } from '@/lib/types'
import { TradeColors } from '@/lib/tradeConfig'

interface SiteFooterProps {
  prospect: ProspectConfig
  colors: TradeColors
  licenseLabel: string
}

export default function SiteFooter({ prospect, colors, licenseLabel }: SiteFooterProps) {
  return (
    <footer className="py-12 px-4" style={{ backgroundColor: colors.primaryDark }}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-white/80 text-sm">
        {/* Brand */}
        <div>
          {prospect.logoUrl && (
            <img
              src={prospect.logoUrl}
              alt={`${prospect.companyName} logo`}
              className="h-10 w-auto max-w-[180px] object-contain mb-3"
            />
          )}
          <p className="font-bold text-white text-base mb-2">{prospect.companyName}</p>
          <p className="leading-relaxed text-white/60 text-xs">
            {licenseLabel} serving {prospect.serviceArea}. Locally owned, community trusted.
          </p>
          {prospect.licenseInfo && (
            <p className="mt-3 text-white/40 text-xs">{prospect.licenseInfo}</p>
          )}
        </div>

        {/* Services */}
        <div>
          <p className="font-bold text-white mb-2">Services</p>
          <ul className="flex flex-col gap-1.5 text-xs text-white/60">
            {prospect.services.map((s) => (
              <li key={s.name}>
                <a href="#services" className="hover:text-white transition-colors">
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <p className="font-bold text-white mb-2">Contact</p>
          <ul className="flex flex-col gap-1.5 text-xs text-white/60">
            <li>{prospect.phone}</li>
            {prospect.email && <li>{prospect.email}</li>}
            <li>{prospect.city}, {prospect.state}</li>
            <li>{prospect.hours}</li>
          </ul>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-white/30">
        <span>&copy; {new Date().getFullYear()} {prospect.companyName}. All rights reserved.</span>
        <span>
          Website built by{' '}
          <a
            href="https://adaptiveaiservices.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/50 hover:text-white transition-colors"
          >
            Adaptive AI Services
          </a>
        </span>
      </div>
    </footer>
  )
}
