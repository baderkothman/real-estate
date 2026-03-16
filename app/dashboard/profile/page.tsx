import {
  Building2,
  CheckCircle,
  Clock,
  DollarSign,
  Edit,
  Heart,
  XCircle,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/components/common/empty-state'
import { PlanBadge } from '@/components/common/plan-badge'
import { PropertyCard } from '@/components/property/property-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { auth } from '@/lib/auth'
import { PLAN_LIMITS } from '@/lib/constants'
import { cn, formatPrice, getInitials } from '@/lib/utils'
import {
  getSavedProperties,
  getUserProperties,
} from '@/services/property.service'
import { getUserById } from '@/services/user.service'
import type { Property } from '@/types'

function PropertyRow({ property }: { property: Property }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-[rgba(34,24,18,0.08)] hover:border-[rgba(34,24,18,0.14)] hover:shadow-[0_4px_12px_rgba(24,20,17,0.08)] transition-all duration-200">
      <div className="relative h-16 w-24 rounded-lg overflow-hidden shrink-0">
        <Image
          src={
            property.coverImage ??
            property.images[0] ??
            `https://picsum.photos/seed/${property.id}/400/300`
          }
          alt={property.title}
          fill
          className="object-cover"
          sizes="96px"
        />
      </div>
      <div className="flex-1 min-w-0">
        <Link
          href={`/properties/${property.id}`}
          className="font-display text-base font-medium text-[#181411] hover:text-[#fa6b05] transition-colors line-clamp-1"
        >
          {property.title}
        </Link>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-xs text-[#8b8178]">{property.city}</span>
          <span className="text-xs font-mono text-[#fa6b05]">
            {formatPrice(property.price)}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border',
              property.status === 'approved' &&
                'text-emerald-700 border-emerald-200 bg-emerald-50',
              property.status === 'pending' &&
                'text-amber-700 border-amber-200 bg-amber-50',
              property.status === 'rejected' &&
                'text-red-700 border-red-200 bg-red-50'
            )}
          >
            {property.status === 'approved' && (
              <CheckCircle className="h-3 w-3" />
            )}
            {property.status === 'pending' && <Clock className="h-3 w-3" />}
            {property.status === 'rejected' && <XCircle className="h-3 w-3" />}
            {property.status}
          </span>
          {property.isFeatured && (
            <Badge variant="featured" className="text-[10px] px-1.5 py-0">
              Featured
            </Badge>
          )}
          {property.isSold && (
            <Badge variant="sold" className="text-[10px] px-1.5 py-0">
              Sold
            </Badge>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon-sm" asChild>
        <Link href={`/dashboard/properties/${property.id}/edit`}>
          <Edit className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  )
}

export default async function DashboardProfilePage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')

  const user = await getUserById(session.user.id)
  if (!user) redirect('/auth/login')

  const [allProperties, savedProperties] = await Promise.all([
    getUserProperties(user.id, true),
    getSavedProperties(user.id),
  ])

  const activeListings = allProperties.filter(
    (p) => p.status !== 'rejected' && !p.isSold
  )
  const soldListings = allProperties.filter((p) => p.isSold)
  const planLimit = PLAN_LIMITS[user.plan]
  const activeCount = activeListings.filter(
    (p) => p.status === 'approved'
  ).length

  return (
    <div>
      {/* Profile summary */}
      <div className="flex flex-col sm:flex-row items-start gap-6 mb-8 p-6 rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)]">
        <div className="relative h-16 w-16 rounded-full overflow-hidden ring-2 ring-[#fa6b05]/15 shrink-0">
          {user.profileImage ? (
            <Image
              src={user.profileImage}
              alt={user.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="h-full w-full bg-[#fef0e6] flex items-center justify-center text-[#fa6b05] font-bold font-display text-xl">
              {getInitials(user.name)}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h2 className="font-display text-xl font-semibold text-[#181411]">
              {user.name}
            </h2>
            <PlanBadge plan={user.plan} size="sm" />
          </div>
          <p className="text-sm text-[#8b8178] mb-3">{user.email}</p>
          {/* Plan usage */}
          <div className="flex items-center gap-3">
            <div className="flex-1 max-w-xs">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#5f554d]">Active listings</span>
                <span className="text-[#fa6b05] font-medium">
                  {activeCount} / {planLimit.maxProperties}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#fef0e6] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#fa6b05] transition-all"
                  style={{
                    width: `${Math.min(100, (activeCount / planLimit.maxProperties) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/pricing">Upgrade Plan</Link>
            </Button>
          </div>
        </div>
        <Button asChild size="sm" variant="secondary">
          <Link href="/dashboard/profile/edit">Edit Profile</Link>
        </Button>
      </div>

      <Tabs defaultValue="listings">
        <TabsList className="mb-6">
          <TabsTrigger value="listings">
            My Listings ({activeListings.length})
          </TabsTrigger>
          <TabsTrigger value="sold">Sold ({soldListings.length})</TabsTrigger>
          <TabsTrigger value="saved">
            Saved ({savedProperties.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-[#181411]">
              Active Listings
            </h3>
            <Button asChild size="sm">
              <Link href="/dashboard/properties/create">+ New Listing</Link>
            </Button>
          </div>
          {activeListings.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No listings yet"
              description="Create your first property listing to start connecting with buyers and renters."
              actionLabel="Create Listing"
              actionHref="/dashboard/properties/create"
            />
          ) : (
            <div className="space-y-3">
              {activeListings.map((p) => (
                <PropertyRow key={p.id} property={p} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sold">
          {soldListings.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No sold properties"
              description="Mark a property as sold from your listings."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {soldListings.map((p) => (
                <PropertyCard key={p.id} property={p} showStatus />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved">
          {savedProperties.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="No saved properties"
              description="Save properties you love by clicking the heart icon on any listing."
              actionLabel="Browse Properties"
              actionHref="/properties"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {savedProperties.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={{ ...p, savedByCurrentUser: true }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
