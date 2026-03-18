import type { Plan, PlanLimits, PlanPricing } from '@/types'

export const APP_NAME = 'Othman Real Estate'
export const APP_DESCRIPTION =
  'Find your perfect property in Lebanon. Buy, sell, or rent premium real estate in Beirut and beyond.'

export const ITEMS_PER_PAGE = 12

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxProperties: 3,
    maxImages: 5,
  },
  pro: {
    maxProperties: 12,
    maxImages: 8,
  },
  agency: {
    maxProperties: 100,
    maxImages: 20,
  },
}

export const PLAN_PRICES: Record<Exclude<Plan, 'free'>, PlanPricing> = {
  pro: {
    month: 30,
    quarter: 60,
    year: 300,
  },
  agency: {
    month: 60,
    quarter: 120,
    year: 600,
  },
}

export const CITIES_LEBANON = [
  'Beirut',
  'Jounieh',
  'Byblos',
  'Tripoli',
  'Sidon',
  'Tyre',
  'Batroun',
  'Zahle',
  'Baalbek',
  'Nabatieh',
  'Jbeil',
  'Chouf',
  'Metn',
  'Keserwan',
  'Aley',
  'Baabda',
  'Zgharta',
  'Koura',
  'Akkar',
  'Hermel',
] as const

export const PLAN_FEATURES: Record<Plan, string[]> = {
  free: [
    'Up to 3 property listings',
    '5 images per listing',
    'Basic property details',
    'Email support',
  ],
  pro: [
    'Up to 12 property listings',
    '8 images per listing',
    'Featured listing option',
    'Priority support',
    'Analytics dashboard',
    'Contact form leads',
  ],
  agency: [
    'Up to 100 property listings',
    '20 images per listing',
    'Featured listings (unlimited)',
    'Dedicated account manager',
    'Advanced analytics',
    'Team management',
    'Custom branding',
    'API access',
  ],
}
