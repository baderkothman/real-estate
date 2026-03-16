import {
  Bath,
  Bed,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Heart,
  Mail,
  MapPin,
  Phone,
  Square,
  XCircle,
} from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PlanBadge } from '@/components/common/plan-badge'
import { PropertyCard } from '@/components/property/property-card'
import { PropertyGallery } from '@/components/property/property-gallery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import {
  cn,
  formatDate,
  formatPrice,
  formatRelativeDate,
  getInitials,
} from '@/lib/utils'
import {
  getPropertyById,
  getSimilarProperties,
} from '@/services/property.service'
import { getUserById } from '@/services/user.service'

interface PropertyPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: PropertyPageProps): Promise<Metadata> {
  const { id } = await params
  const property = await getPropertyById(id)
  if (!property) return { title: 'Property Not Found' }
  return {
    title: property.title,
    description: property.description.slice(0, 160),
  }
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const property = await getPropertyById(id, user?.id)
  if (!property) notFound()

  const owner = await getUserById(property.userId)
  const similar = await getSimilarProperties(id, property.city)

  const isOwner = user?.id === property.userId
  const isApproved = property.status === 'approved'

  return (
    <div className="min-h-screen bg-[#fcfaf7] pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Gallery */}
            <PropertyGallery images={property.images} title={property.title} />

            {/* Property Info */}
            <div className="mt-8">
              {/* Badges row */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border',
                    property.listingType === 'sale'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-violet-50 border-violet-200 text-violet-700'
                  )}
                >
                  {property.listingType === 'sale' ? 'For Sale' : 'For Rent'}
                </span>

                {property.isFeatured && (
                  <Badge variant="featured">Featured</Badge>
                )}

                {property.isSold && <Badge variant="sold">Sold</Badge>}

                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border',
                    property.status === 'approved' &&
                      'bg-emerald-50 border-emerald-200 text-emerald-700',
                    property.status === 'pending' &&
                      'bg-amber-50 border-amber-200 text-amber-700',
                    property.status === 'rejected' &&
                      'bg-red-50 border-red-200 text-red-700'
                  )}
                >
                  {property.status === 'approved' && (
                    <CheckCircle className="h-3 w-3" />
                  )}
                  {property.status === 'pending' && (
                    <Clock className="h-3 w-3" />
                  )}
                  {property.status === 'rejected' && (
                    <XCircle className="h-3 w-3" />
                  )}
                  {property.status.charAt(0).toUpperCase() +
                    property.status.slice(1)}
                </span>
              </div>

              {/* Title */}
              <h1 className="font-display text-3xl md:text-4xl font-semibold text-[#181411] tracking-wide mb-3">
                {property.title}
              </h1>

              {/* Location */}
              <div className="flex items-center gap-1.5 text-[#5f554d] mb-4">
                <MapPin className="h-4 w-4 text-[#fa6b05]" />
                <span>
                  {property.address ? `${property.address}, ` : ''}
                  {property.city}
                </span>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span className="font-mono text-4xl font-bold text-[#fa6b05]">
                  {formatPrice(property.price)}
                </span>
                {property.listingType === 'rent' && (
                  <span className="text-[#8b8178] text-base ml-2">/month</span>
                )}
              </div>

              {/* Specs */}
              {(property.bedrooms ||
                property.bathrooms ||
                property.areaSqM) && (
                <div className="flex flex-wrap gap-6 mb-8 p-4 rounded-xl bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_2px_8px_rgba(24,20,17,0.04)]">
                  {property.bedrooms !== undefined && property.bedrooms > 0 && (
                    <div className="flex items-center gap-2 text-[#5f554d]">
                      <Bed className="h-5 w-5 text-[#fa6b05]" />
                      <span>
                        <span className="font-semibold text-[#181411]">
                          {property.bedrooms}
                        </span>{' '}
                        Bedroom{property.bedrooms !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {property.bathrooms !== undefined &&
                    property.bathrooms > 0 && (
                      <div className="flex items-center gap-2 text-[#5f554d]">
                        <Bath className="h-5 w-5 text-[#fa6b05]" />
                        <span>
                          <span className="font-semibold text-[#181411]">
                            {property.bathrooms}
                          </span>{' '}
                          Bathroom{property.bathrooms !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  {property.areaSqM && (
                    <div className="flex items-center gap-2 text-[#5f554d]">
                      <Square className="h-5 w-5 text-[#fa6b05]" />
                      <span>
                        <span className="font-semibold text-[#181411]">
                          {property.areaSqM}
                        </span>{' '}
                        m²
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="mb-8">
                <h2 className="font-display text-xl font-semibold text-[#181411] mb-4">
                  About This Property
                </h2>
                <p className="text-[#5f554d] leading-relaxed whitespace-pre-line">
                  {property.description}
                </p>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-2 text-sm text-[#8b8178]">
                <Calendar className="h-4 w-4" />
                <span>
                  Listed {formatRelativeDate(property.createdAt)} &middot;{' '}
                  {formatDate(property.createdAt)}
                </span>
              </div>
              {property.isSold && property.soldAt && (
                <div className="flex items-center gap-2 text-sm text-[#964003] mt-1">
                  <CheckCircle className="h-4 w-4" />
                  <span>Sold on {formatDate(property.soldAt)}</span>
                </div>
              )}

              {/* Owner actions (if owner) */}
              {isOwner && (
                <div className="mt-6 flex gap-3">
                  <Button asChild variant="outline">
                    <Link href={`/dashboard/properties/${property.id}/edit`}>
                      Edit Listing
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Owner card */}
            {owner && (
              <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6">
                <h3 className="font-display text-lg font-semibold text-[#181411] mb-4">
                  Property Owner
                </h3>

                <Link
                  href={`/users/${owner.id}`}
                  className="flex items-center gap-3 mb-4 group"
                >
                  <div className="relative h-12 w-12 rounded-full overflow-hidden ring-2 ring-[#fa6b05]/15 group-hover:ring-[#fa6b05]/40 transition-all shrink-0">
                    {owner.profileImage ? (
                      <Image
                        src={owner.profileImage}
                        alt={owner.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="h-full w-full bg-[#fef0e6] flex items-center justify-center text-[#fa6b05] font-bold font-display">
                        {getInitials(owner.name)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[#181411] group-hover:text-[#fa6b05] transition-colors">
                      {owner.name}
                    </p>
                    <PlanBadge plan={owner.plan} size="sm" className="mt-1" />
                  </div>
                </Link>

                {owner.bio && (
                  <p className="text-xs text-[#8b8178] leading-relaxed mb-4 line-clamp-2">
                    {owner.bio}
                  </p>
                )}

                {/* Contact — only for approved properties */}
                {isApproved && (
                  <div className="space-y-2 border-t border-[rgba(34,24,18,0.08)] pt-4">
                    {user ? (
                      <>
                        <a
                          href={`mailto:${owner.email}`}
                          className="flex items-center gap-2 text-sm text-[#5f554d] hover:text-[#fa6b05] transition-colors"
                        >
                          <Mail className="h-4 w-4 shrink-0" />
                          <span className="truncate">{owner.email}</span>
                        </a>
                        {owner.phone && (
                          <a
                            href={`tel:${owner.phone}`}
                            className="flex items-center gap-2 text-sm text-[#5f554d] hover:text-[#fa6b05] transition-colors"
                          >
                            <Phone className="h-4 w-4 shrink-0" />
                            {owner.phone}
                          </a>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-2">
                        <p className="text-xs text-[#8b8178] mb-3">
                          Sign in to see contact details
                        </p>
                        <Button asChild size="sm" className="w-full">
                          <Link
                            href={`/auth/login?callbackUrl=/properties/${property.id}`}
                          >
                            Sign In to Contact
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  asChild
                  variant="secondary"
                  size="sm"
                  className="w-full mt-4"
                >
                  <Link href={`/users/${owner.id}`} className="gap-2">
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Profile
                  </Link>
                </Button>
              </div>
            )}

            {/* Save card */}
            <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-5 text-center">
              <Heart className="h-6 w-6 text-[#fa6b05] mx-auto mb-3" />
              <p className="text-sm text-[#5f554d] mb-4">
                {user
                  ? 'Save this property to revisit it later.'
                  : 'Sign in to save this property to your list.'}
              </p>
              {user ? (
                <p className="text-xs text-[#8b8178]">
                  Use the heart icon on the listing card to save.
                </p>
              ) : (
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/auth/login">Sign In to Save</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Similar properties */}
        {similar.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-2xl font-semibold text-[#181411] mb-6 tracking-wide">
              Similar Properties in {property.city}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {similar.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
