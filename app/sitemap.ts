import type { MetadataRoute } from 'next'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
  'http://localhost:3000'

const STATIC_ROUTES = [
  '',
  '/properties',
  '/users',
  '/pricing',
  '/about',
  '/privacy',
  '/terms',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency:
      path === '' || path === '/properties' ? 'hourly' : 'weekly',
    priority: path === '' ? 1 : 0.6,
  }))
}
