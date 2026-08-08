import type { MetadataRoute } from 'next'
import { getProperties } from '@/services/property.service'
import { getPublicUsers } from '@/services/user.service'

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
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency:
      path === '' || path === '/properties' ? 'hourly' : 'weekly',
    priority: path === '' ? 1 : 0.6,
  }))

  // Capped at a reasonable page size — this is a single-country listing
  // directory, not a multi-million-listing marketplace, so one sitemap
  // file is sufficient rather than a sitemap index with multiple children.
  const [properties, users] = await Promise.all([
    getProperties({ status: 'approved' }, 1, 1000),
    getPublicUsers(undefined, undefined, 1, 500),
  ])

  for (const property of properties.data) {
    entries.push({
      url: `${SITE_URL}/properties/${property.id}`,
      lastModified: property.createdAt,
      changeFrequency: 'daily',
      priority: 0.8,
    })
  }

  for (const user of users.data) {
    entries.push({
      url: `${SITE_URL}/users/${user.id}`,
      changeFrequency: 'weekly',
      priority: 0.4,
    })
  }

  return entries
}
