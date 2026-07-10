export type TradeType = 'plumbing' | 'hvac' | 'roofing' | 'electrical' | 'landscaping' | 'tree' | 'concrete' | 'general'

/**
 * The site's color palette. Trade defaults live in tradeConfig.ts; a prospect can
 * override any subset of these (via ProspectConfig.brandColors) so the site matches
 * the colors in their real logo/branding instead of the generic trade palette.
 */
export interface BrandColors {
  primary: string
  primaryDark: string
  accent: string
  accentLight: string
  heroOverlay: string
}

export interface ProspectService {
  name: string
  description: string
  imageUrl: string
}

export interface ProspectTestimonial {
  quote: string
  author: string
  location: string
}

export interface ProspectConfig {
  slug: string
  companyName: string
  trade: TradeType
  tagline: string
  subTagline: string
  city: string
  state: string
  serviceArea: string
  phone: string
  email?: string
  hours: string
  licenseInfo?: string
  founded?: string
  about: string
  services: ProspectService[]
  testimonials: ProspectTestimonial[]
  generatedAt: string

  /**
   * Per-prospect branding pulled from their real online presence. All optional —
   * when omitted, the site falls back to the generic trade defaults in tradeConfig.ts.
   */
  logoUrl?: string // their real logo (GBP photo / website / Clearbit), shown in the nav + footer
  brandColors?: Partial<BrandColors> // colors sampled from their logo, override the trade palette
  heroImage?: string // hero photo that actually represents their work (override trade default)
  aboutImageUrl?: string // about-section photo that represents their work (override trade default)
}
