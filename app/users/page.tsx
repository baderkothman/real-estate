import { IconUsers } from '@tabler/icons-react'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { Pagination } from '@/components/common/pagination'
import { UserCard } from '@/components/user/user-card'
import { getUserProperties } from '@/services/property.service'
import { getPublicUsers } from '@/services/user.service'

export const metadata: Metadata = {
  title: 'Agents & Owners',
  description: 'Browse agents and property owners on Othman Real Estate.',
}

interface SearchParams {
  search?: string
  plan?: string
  page?: string
}

interface UsersPageProps {
  searchParams: Promise<SearchParams>
}

async function UsersList({ searchParams }: { searchParams: SearchParams }) {
  const page = parseInt(searchParams.page ?? '1', 10)
  const result = await getPublicUsers(
    searchParams.search,
    searchParams.plan,
    page,
    12
  )

  // Fetch property counts for each user
  const usersWithCounts = await Promise.all(
    result.data.map(async (user) => {
      const props = await getUserProperties(user.id)
      return {
        user,
        propertyCount: props.filter((p) => p.status === 'approved').length,
      }
    })
  )

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={IconUsers}
        title="No users found"
        description="Try adjusting your search or filter criteria."
      />
    )
  }

  return (
    <div>
      <p className="text-sm text-[#8b8178] mb-6">
        <span className="text-[#181411] font-medium">{result.total}</span> agent
        {result.total !== 1 ? 's' : ''} found
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {usersWithCounts.map(({ user, propertyCount }) => (
          <UserCard key={user.id} user={user} propertyCount={propertyCount} />
        ))}
      </div>
      {result.totalPages > 1 && (
        <div className="mt-12">
          <Pagination page={result.page} totalPages={result.totalPages} />
        </div>
      )}
    </div>
  )
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const resolvedParams = await searchParams

  return (
    <div className="min-h-screen bg-[#fcfaf7]">
      <div className="border-b border-[rgba(34,24,18,0.08)] bg-[#faf7eb] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-[#181411] mb-2 tracking-wide">
            Agents & Owners
          </h1>
          <p className="text-[#5f554d]">
            Connect with property professionals across Lebanon.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <form
            className="flex flex-col sm:flex-row gap-3 w-full sm:max-w-lg"
            method="GET"
          >
            <input
              name="search"
              defaultValue={resolvedParams.search ?? ''}
              placeholder="Search by name or email..."
              className="flex-1 h-10 px-3 rounded-lg bg-white border border-[rgba(34,24,18,0.14)] text-[#181411] placeholder:text-[#8b8178] text-sm focus:outline-none focus:ring-2 focus:ring-[#fa6b05]/30 focus:border-[#fa6b05] transition-colors"
            />
            <select
              name="plan"
              defaultValue={resolvedParams.plan ?? 'all'}
              className="h-10 px-3 rounded-lg bg-white border border-[rgba(34,24,18,0.14)] text-[#181411] text-sm focus:outline-none focus:ring-2 focus:ring-[#fa6b05]/30 focus:border-[#fa6b05] transition-colors"
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="agency">Agency</option>
            </select>
            <button
              type="submit"
              className="h-10 px-4 rounded-lg bg-[#fa6b05] text-white text-sm font-semibold hover:bg-[#c85604] transition-colors shadow-[0_2px_8px_rgba(250,107,5,0.20)]"
            >
              Search
            </button>
          </form>
        </div>

        <Suspense
          fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-48 rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] animate-pulse"
                />
              ))}
            </div>
          }
        >
          <UsersList searchParams={resolvedParams} />
        </Suspense>
      </div>
    </div>
  )
}
