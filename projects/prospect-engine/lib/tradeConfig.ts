import { TradeType, BrandColors } from './types'

// The trade palette uses the same shape as a prospect's BrandColors, so a per-prospect
// override (ProspectConfig.brandColors) can be merged straight over these defaults.
export type TradeColors = BrandColors

export interface TradeDefaults {
  colors: TradeColors
  heroImage: string
  badgeLabel: string
  defaultTagline: string
  licenseLabel: string
}

export const TRADE_CONFIG: Record<TradeType, TradeDefaults> = {
  plumbing: {
    colors: {
      primary: '#1e3a8a',
      primaryDark: '#1e2d6b',
      accent: '#2563eb',
      accentLight: '#dbeafe',
      heroOverlay: 'rgba(30,58,138,0.72)',
    },
    heroImage:
      'https://images.unsplash.com/photo-1676210133055-eab6ef033ce3?w=1600&h=900&fit=crop&q=80',
    badgeLabel: 'Licensed Plumbers',
    defaultTagline: 'Fix It Right. The First Time.',
    licenseLabel: 'Licensed Master Plumber',
  },
  hvac: {
    colors: {
      primary: '#991b1b',
      primaryDark: '#7f1d1d',
      accent: '#dc2626',
      accentLight: '#fee2e2',
      heroOverlay: 'rgba(153,27,27,0.72)',
    },
    heroImage:
      'https://images.pexels.com/photos/32588555/pexels-photo-32588555/free-photo-of-technician-performing-air-conditioning-maintenance.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop',
    badgeLabel: 'Certified HVAC Techs',
    defaultTagline: 'Stay Comfortable. Year Round.',
    licenseLabel: 'Licensed HVAC Contractor',
  },
  roofing: {
    colors: {
      primary: '#78350f',
      primaryDark: '#5c2a09',
      accent: '#d97706',
      accentLight: '#fef3c7',
      heroOverlay: 'rgba(120,53,15,0.72)',
    },
    heroImage:
      'https://images.unsplash.com/photo-1635424709961-f3a150459ad4?w=1600&h=900&fit=crop&q=80',
    badgeLabel: 'Licensed Roofers',
    defaultTagline: 'Your Roof. Done Right.',
    licenseLabel: 'Licensed Roofing Contractor',
  },
  electrical: {
    colors: {
      primary: '#1c1917',
      primaryDark: '#0c0a09',
      accent: '#ca8a04',
      accentLight: '#fef9c3',
      heroOverlay: 'rgba(28,25,23,0.78)',
    },
    heroImage:
      'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=1600&h=900&fit=crop&q=80',
    badgeLabel: 'Licensed Electricians',
    defaultTagline: 'Safe, Reliable, On Time.',
    licenseLabel: 'Licensed Master Electrician',
  },
  landscaping: {
    colors: {
      primary: '#14532d',
      primaryDark: '#0f3d21',
      accent: '#16a34a',
      accentLight: '#dcfce7',
      heroOverlay: 'rgba(20,83,45,0.72)',
    },
    heroImage:
      'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=1600&h=900&fit=crop&q=80',
    badgeLabel: 'Certified Landscapers',
    defaultTagline: 'Your Property. Our Pride.',
    licenseLabel: 'Licensed Landscape Contractor',
  },
  general: {
    // Neutral ink/slate fallback — kept off our brand coral (#e8684a is the studio brand mark;
    // it shouldn't be painted onto a prospect's site as a button/fill). A sampled logo color
    // overrides this; this is only the last-resort default.
    colors: {
      primary: '#1e293b',
      primaryDark: '#0f172a',
      accent: '#0e7490',
      accentLight: '#cffafe',
      heroOverlay: 'rgba(30,41,59,0.78)',
    },
    heroImage:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&h=900&fit=crop&q=80',
    badgeLabel: 'Trusted Trade Pros',
    defaultTagline: 'Built to Last.',
    licenseLabel: 'Licensed & Insured',
  },
  tree: {
    colors: {
      primary: '#3f6212',
      primaryDark: '#365314',
      accent: '#65a30d',
      accentLight: '#ecfccb',
      heroOverlay: 'rgba(54,83,20,0.74)',
    },
    heroImage:
      'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=1600&h=900&fit=crop&q=80',
    badgeLabel: 'Insured Tree Care Pros',
    defaultTagline: 'Trees Done Right. Safely.',
    licenseLabel: 'Licensed & Insured Tree Service',
  },
  concrete: {
    colors: {
      primary: '#3f3f46',
      primaryDark: '#27272a',
      accent: '#ea580c',
      accentLight: '#ffedd5',
      heroOverlay: 'rgba(39,39,42,0.74)',
    },
    heroImage:
      'https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop',
    badgeLabel: 'Licensed Concrete Contractor',
    defaultTagline: 'Built Solid. Built to Last.',
    licenseLabel: 'Licensed & Insured Concrete Contractor',
  },
}
