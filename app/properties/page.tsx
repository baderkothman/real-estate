import { IconBuilding } from '@tabler/icons-react'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { Pagination } from '@/components/common/pagination'
import { PropertyCard } from '@/components/property/property-card'
import { PropertyFilters } from '@/components/property/property-filters'
import { ITEMS_PER_PAGE } from '@/lib/constants'
import { getProperties } from '@/services/property.service'
import type { PropertyFilters as Filters, ListingType } from '@/types'

export const metadata: Metadata = {
  title: 'Browse Properties',
  description:
    'Search and filter hundreds of properties for sale and rent across Lebanon.',
}

interface SearchParams {
  city?: string
  listingType?: string
  minPrice?: string
  maxPrice?: string
  page?: string
}

interface PropertiesPageProps {
  searchParams: Promise<SearchParams>
}

function PropertyCardSkeleton() {
  return (
    <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] overflow-hidden">
      <div className="aspect-[3/2] skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-20 rounded-full skeleton" />
        <div className="h-4 w-full rounded skeleton" />
        <div className="h-4 w-3/4 rounded skeleton" />
        <div className="h-6 w-28 rounded skeleton" />
        <div className="flex gap-4 pt-1">
          <div className="h-3 w-14 rounded skeleton" />
          <div className="h-3 w-14 rounded skeleton" />
          <div className="h-3 w-14 rounded skeleton" />
        </div>
      </div>
    </div>
  )
}

async function PropertiesList({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const page = parseInt(searchParams.page ?? '1', 10)

  const filters: Filters = {
    city: searchParams.city,
    listingType: (searchParams.listingType as ListingType) || undefined,
    minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
  }

  const result = await getProperties(filters, page, ITEMS_PER_PAGE)
  const hasActiveFilters = Object.values(filters).some(Boolean)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-[#8b8178]">
          <span className="text-[#181411] font-semibold">
            {result.total.toLocaleString()}
          </span>{' '}
          {result.total !== 1 ? 'properties' : 'property'}
          {hasActiveFilters && <span className="text-[#fa6b05]"> found</span>}
        </p>
      </div>

      {result.data.length === 0 ? (
        <EmptyState
          icon={IconBuilding}
          title="No properties found"
          description={
            hasActiveFilters
              ? 'Try adjusting your filters to see more results.'
              : 'No properties are listed at the moment. Check back soon.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
          actionHref={hasActiveFilters ? '/properties' : undefined}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {result.data.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>

          {result.totalPages > 1 && (
            <div className="mt-14">
              <Pagination page={result.page} totalPages={result.totalPages} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default async function PropertiesPage({
  searchParams,
}: PropertiesPageProps) {
  const resolvedParams = await searchParams

  return (
    <div className="min-h-screen bg-[#fcfaf7]">
      {/* Page Header */}
      <div className="relative border-b border-[rgba(34,24,18,0.08)] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#fef3e7_0%,_#fcfaf7_70%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px w-6 bg-[#fa6b05]/60" />
            <span className="text-[10px] font-semibold text-[#fa6b05] uppercase tracking-[0.2em]">
              Lebanon
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-[#181411] mb-3 tracking-wide">
            Browse Properties
          </h1>
          <p className="text-[#5f554d] text-base">
            Discover exceptional homes and commercial spaces across Lebanon.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="sticky top-24">
              <Suspense
                fallback={
                  <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] h-72 skeleton" />
                }
              >
                <PropertyFilters />
              </Suspense>
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1 min-w-0">
            <Suspense
              fallback={
                <div>
                  <div className="h-4 w-36 rounded skeleton mb-6" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <PropertyCardSkeleton key={i} />
                    ))}
                  </div>
                </div>
              }
            >
              <PropertiesList searchParams={resolvedParams} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
