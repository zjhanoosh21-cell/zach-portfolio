import { notFound } from 'next/navigation'
import { getAllSlugs, getProspect } from '@/lib/getProspect'
import { TRADE_CONFIG } from '@/lib/tradeConfig'
import PreviewBanner from '@/components/PreviewBanner'
import SiteNav from '@/components/SiteNav'
import HeroSection from '@/components/HeroSection'
import ValuesStrip from '@/components/ValuesStrip'
import ServicesSection from '@/components/ServicesSection'
import AboutSection from '@/components/AboutSection'
import TestimonialsSection from '@/components/TestimonialsSection'
import ContactSection from '@/components/ContactSection'
import SiteFooter from '@/components/SiteFooter'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const prospect = getProspect(slug)
  if (!prospect) return {}
  return {
    title: `${prospect.companyName} — ${prospect.trade.toUpperCase()} in ${prospect.city}, ${prospect.state}`,
    description: prospect.subTagline,
    robots: { index: false, follow: false }, // Don't index preview sites
  }
}

export default async function ProspectPage({ params }: PageProps) {
  const { slug } = await params
  const prospect = getProspect(slug)
  if (!prospect) notFound()

  const tradeDefaults = TRADE_CONFIG[prospect.trade]
  // Merge any per-prospect brand colors (sampled from their real logo) over the trade
  // palette, and prefer a prospect-specific hero image when one was found.
  const colors = { ...tradeDefaults.colors, ...(prospect.brandColors ?? {}) }
  const heroImage = prospect.heroImage ?? tradeDefaults.heroImage

  return (
    <>
      <PreviewBanner companyName={prospect.companyName} />
      <SiteNav prospect={prospect} colors={colors} />
      <main>
        <HeroSection
          prospect={prospect}
          colors={colors}
          heroImage={heroImage}
          badgeLabel={tradeDefaults.badgeLabel}
        />
        <ValuesStrip colors={colors} />
        <ServicesSection prospect={prospect} colors={colors} />
        <AboutSection
          prospect={prospect}
          colors={colors}
          licenseLabel={tradeDefaults.licenseLabel}
        />
        <TestimonialsSection prospect={prospect} colors={colors} />
        <ContactSection prospect={prospect} colors={colors} />
      </main>
      <SiteFooter
        prospect={prospect}
        colors={colors}
        licenseLabel={tradeDefaults.licenseLabel}
      />
    </>
  )
}
