import { Building2, Calendar, Mail, Phone } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { EmptyState } from '@/components/common/empty-state'
import { PlanBadge } from '@/components/common/plan-badge'
import { PropertyCard } from '@/components/property/property-card'
import { formatDate, getInitials } from '@/lib/utils'
import { getUserProperties } from '@/services/property.service'
import { getUserById } from '@/services/user.service'

interface UserPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: UserPageProps): Promise<Metadata> {
  const { id } = await params
  const user = await getUserById(id)
  if (!user) return { title: 'User Not Found' }
  return { title: user.name }
}

export default async function UserPage({ params }: UserPageProps) {
  const { id } = await params
  const user = await getUserById(id)
  if (!user || user.isBanned) notFound()

  const allProps = await getUserProperties(id)
  const approvedProps = allProps.filter((p) => p.status === 'approved')

  return (
    <div className="min-h-screen bg-[#fcfaf7] pb-16">
      {/* Header */}
      <div className="border-b border-[rgba(34,24,18,0.08)] bg-[#faf7eb] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div className="relative h-20 w-20 rounded-full overflow-hidden ring-2 ring-[#fa6b05]/20 shrink-0">
              {user.profileImage ? (
                <Image
                  src={user.profileImage}
                  alt={user.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="h-full w-full bg-[#fef0e6] flex items-center justify-center text-[#fa6b05] font-bold font-display text-2xl">
                  {getInitials(user.name)}
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="font-display text-3xl font-semibold text-[#181411] tracking-wide">
                  {user.name}
                </h1>
                <PlanBadge plan={user.plan} />
                {user.role === 'admin' && (
                  <span className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-sm font-medium text-violet-700">
                    Admin
                  </span>
                )}
              </div>

              {user.bio && (
                <p className="text-[#5f554d] max-w-2xl leading-relaxed mb-4">
                  {user.bio}
                </p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-[#8b8178]">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </span>
                {user.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4" />
                    {user.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Member since {formatDate(user.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {approvedProps.length} active listing
                  {approvedProps.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="font-display text-2xl font-semibold text-[#181411] mb-6 tracking-wide">
          Active Listings
        </h2>

        {approvedProps.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No listings yet"
            description={`${user.name} hasn't listed any properties yet.`}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {approvedProps.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
