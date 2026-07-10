'use client'

import { useState } from 'react'
import { ProspectConfig } from '@/lib/types'
import { TradeColors } from '@/lib/tradeConfig'

interface SiteNavProps {
  prospect: ProspectConfig
  colors: TradeColors
}

export default function SiteNav({ prospect, colors }: SiteNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <nav
      className="sticky top-0 z-40 shadow-md"
      style={{ backgroundColor: colors.primaryDark }}
    >
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo / Name — show their real logo when we found one, else the name */}
        <a href="#home" className="flex items-center gap-2.5 text-white font-bold text-lg leading-tight">
          {prospect.logoUrl && (
            <img
              src={prospect.logoUrl}
              alt={`${prospect.companyName} logo`}
              className="h-9 w-auto max-w-[160px] object-contain"
            />
          )}
          <span className={prospect.logoUrl ? 'sr-only sm:not-sr-only' : ''}>
            {prospect.companyName}
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6 text-sm text-white/80">
          <a href="#services" className="hover:text-white transition-colors">Services</a>
          <a href="#about" className="hover:text-white transition-colors">About</a>
          <a href="#reviews" className="hover:text-white transition-colors">Reviews</a>
          <a href="#contact" className="hover:text-white transition-colors">Contact</a>
        </div>

        {/* CTA */}
        <a
          href={`tel:${prospect.phone.replace(/\D/g, '')}`}
          className="hidden md:inline-flex items-center gap-2 text-white font-semibold text-sm px-4 py-2 rounded-full transition-opacity hover:opacity-80"
          style={{ backgroundColor: colors.accent }}
        >
          📞 {prospect.phone}
        </a>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-white text-2xl"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden px-4 pb-4 flex flex-col gap-3 text-white/90 text-sm"
          style={{ backgroundColor: colors.primaryDark }}
        >
          <a href="#services" onClick={() => setOpen(false)} className="hover:text-white">Services</a>
          <a href="#about" onClick={() => setOpen(false)} className="hover:text-white">About</a>
          <a href="#reviews" onClick={() => setOpen(false)} className="hover:text-white">Reviews</a>
          <a href="#contact" onClick={() => setOpen(false)} className="hover:text-white">Contact</a>
          <a
            href={`tel:${prospect.phone.replace(/\D/g, '')}`}
            className="font-semibold"
            style={{ color: colors.accent }}
          >
            📞 {prospect.phone}
          </a>
        </div>
      )}
    </nav>
  )
}
