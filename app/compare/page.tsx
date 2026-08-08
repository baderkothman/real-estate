import { IconScale } from '@tabler/icons-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { EmptyState } from '@/components/common/empty-state'
import { formatPrice } from '@/lib/utils'
import { getPropertyById } from '@/services/property.service'
import type { Property } from '@/types'

export const metadata: Metadata = { title: 'Compare Properties' }

interface ComparePageProps {
  searchParams: Promise<{ ids?: string }>
}

const ROWS: { label: string; render: (p: Property) => React.ReactNode }[] = [
  {
    label: 'Price',
    render: (p) =>
      formatPrice(p.price) + (p.listingType === 'rent' ? '/mo' : ''),
  },
  {
    label: 'Type',
    render: (p) => (p.listingType === 'sale' ? 'For Sale' : 'For Rent'),
  },
  { label: 'City', render: (p) => p.city },
  { label: 'Address', render: (p) => p.address ?? '—' },
  { label: 'Bedrooms', render: (p) => p.bedrooms ?? '—' },
  { label: 'Bathrooms', render: (p) => p.bathrooms ?? '—' },
  {
    label: 'Area',
    render: (p) => (p.areaSqM ? `${p.areaSqM.toLocaleString()} sq m` : '—'),
  },
  { label: 'Status', render: (p) => (p.isSold ? 'Sold' : 'Available') },
  { label: 'Featured', render: (p) => (p.isFeatured ? 'Yes' : 'No') },
]

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { ids: idsParam } = await searchParams
  const ids = (idsParam ?? '').split(',').filter(Boolean).slice(0, 4)

  const properties = (
    await Promise.all(ids.map((id) => getPropertyById(id).catch(() => null)))
  ).filter((p): p is Property => p !== null)

  return (
    <div className="min-h-screen bg-[#fcfaf7]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-display text-3xl font-semibold text-[#181411] mb-6 tracking-wide">
          Compare Properties
        </h1>

        {properties.length === 0 ? (
          <EmptyState
            icon={IconScale}
            title="Nothing to compare"
            description="Use the compare tray while browsing properties to add up to 4 listings here."
            actionLabel="Browse Properties"
            actionHref="/properties"
          />
        ) : (
          <div className="overflow-x-auto rounded-[20px] border border-[rgba(34,24,18,0.08)] bg-white shadow-[0_6px_20px_rgba(24,20,17,0.06)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(34,24,18,0.08)]">
                  <th className="p-4 text-left text-[#5f554d] font-normal w-32" />
                  {properties.map((p) => (
                    <th
                      key={p.id}
                      className="p-4 text-left align-top min-w-[180px]"
                    >
                      <Link
                        href={`/properties/${p.id}`}
                        className="block group"
                      >
                        <div className="relative h-28 w-full rounded-lg overflow-hidden mb-2">
                          <Image
                            src={
                              p.coverImage ??
                              p.images[0] ??
                              `https://picsum.photos/seed/${p.id}/400/300`
                            }
                            alt={p.title}
                            fill
                            className="object-cover"
                            sizes="200px"
                          />
                        </div>
                        <span className="font-display font-medium text-[#181411] group-hover:text-[#a34702] transition-colors line-clamp-2">
                          {p.title}
                        </span>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-[rgba(34,24,18,0.06)] last:border-0"
                  >
                    <td className="p-4 text-xs font-semibold text-[#5f554d] uppercase tracking-[0.1em]">
                      {row.label}
                    </td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-4 text-[#181411]">
                        {row.render(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
