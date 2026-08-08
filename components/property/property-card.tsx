'use client'

import {
  IconBath,
  IconBed,
  IconCircleCheck,
  IconClock,
  IconEyeOff,
  IconHeart,
  IconMapPin,
  IconPhoto,
  IconScale,
  IconSquare,
  IconStar,
} from '@tabler/icons-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { hideListingAction } from '@/app/actions/discovery'
import { useCompare } from '@/hooks/use-compare'
import { useSaveProperty } from '@/hooks/use-save-property'
import { cn, formatPrice, getInitials } from '@/lib/utils'
import type { Property } from '@/types'

interface PropertyCardProps {
  property: Property
  showStatus?: boolean
  showHide?: boolean
  className?: string
}

export function PropertyCard({
  property,
  showStatus = false,
  showHide = false,
  className,
}: PropertyCardProps) {
  const router = useRouter()
  const { isSaved, isLoading, toggle } = useSaveProperty(
    property.id,
    property.savedByCurrentUser ?? false
  )
  const { ids: compareIds, toggle: toggleCompare, isFull } = useCompare()
  const isComparing = compareIds.includes(property.id)
  const [isHiding, setIsHiding] = useState(false)

  const hide = async () => {
    setIsHiding(true)
    try {
      await hideListingAction(property.id)
      router.refresh()
    } finally {
      setIsHiding(false)
    }
  }

  const coverUrl =
    property.coverImage ||
    property.images[0] ||
    `https://picsum.photos/seed/${property.id}/800/600`

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] overflow-hidden',
        'transition-all duration-300 ease-out',
        'hover:border-[rgba(34,24,18,0.14)] hover:shadow-[0_14px_40px_rgba(24,20,17,0.10)] hover:-translate-y-1',
        className
      )}
    >
      <Link
        href={`/properties/${property.id}`}
        className="relative block aspect-[3/2] overflow-hidden"
      >
        <Image
          src={coverUrl}
          alt={property.title}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#181411]/65 via-[#181411]/10 to-transparent" />

        {property.isSold && (
          <div className="absolute inset-0 bg-[#181411]/70 flex items-center justify-center backdrop-blur-[1px]">
            <div className="bg-[#181411] text-white font-display text-xl font-bold tracking-[0.2em] px-8 py-2.5 rotate-[-12deg] shadow-xl border-2 border-white/15">
              SOLD
            </div>
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {property.isFeatured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#a34702] px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_2px_8px_rgba(250,107,5,0.35)]">
              <IconStar className="h-2.5 w-2.5 fill-current" />
              Featured
            </span>
          )}
          {showStatus && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm',
                property.status === 'approved' &&
                  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
                property.status === 'pending' &&
                  'bg-amber-500/20 text-amber-400 border border-amber-500/30',
                property.status === 'rejected' &&
                  'bg-red-500/20 text-red-400 border border-red-500/30'
              )}
            >
              {property.status === 'approved' && (
                <IconCircleCheck className="h-2.5 w-2.5" />
              )}
              {property.status === 'pending' && (
                <IconClock className="h-2.5 w-2.5" />
              )}
              {property.status.charAt(0).toUpperCase() +
                property.status.slice(1)}
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {showHide && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                void hide()
              }}
              disabled={isHiding}
              className="p-2 rounded-full backdrop-blur-md transition-[color,background-color,transform] duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.4)] bg-white/80 text-[#5f554d] hover:bg-[#181411] hover:text-white hover:scale-110"
              aria-label="Hide this listing"
            >
              <IconEyeOff className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              if (!isComparing && isFull) return
              toggleCompare(property.id)
            }}
            disabled={!isComparing && isFull}
            className={cn(
              'p-2 rounded-full backdrop-blur-md transition-all duration-200',
              'shadow-[0_2px_8px_rgba(0,0,0,0.4)] disabled:opacity-40 disabled:cursor-not-allowed',
              isComparing
                ? 'bg-[#181411] text-white scale-110'
                : 'bg-white/80 text-[#5f554d] hover:bg-[#181411] hover:text-white hover:scale-110'
            )}
            aria-label={
              isComparing ? 'Remove from comparison' : 'Add to comparison'
            }
          >
            <IconScale className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              void toggle()
            }}
            disabled={isLoading}
            className={cn(
              'p-2 rounded-full backdrop-blur-md transition-all duration-200',
              'shadow-[0_2px_8px_rgba(0,0,0,0.4)]',
              isSaved
                ? 'bg-[#a34702] text-white scale-110'
                : 'bg-white/80 text-[#5f554d] hover:bg-[#a34702] hover:text-white hover:scale-110'
            )}
            aria-label={isSaved ? 'Remove from saved' : 'Save property'}
          >
            <IconHeart
              className={cn('h-3.5 w-3.5', isSaved && 'fill-current')}
            />
          </button>
        </div>

        <div className="absolute bottom-3 inset-x-3 flex items-end justify-between">
          {property.images.length > 1 && (
            <span className="flex items-center gap-1 rounded-full bg-[#181411]/50 backdrop-blur-sm px-2 py-1 text-[10px] text-white">
              <IconPhoto className="h-3 w-3" />
              {property.images.length}
            </span>
          )}
          <span
            className={cn(
              'ml-auto rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm',
              property.listingType === 'sale'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
            )}
          >
            {property.listingType === 'sale' ? 'For Sale' : 'For Rent'}
          </span>
        </div>
      </Link>

      <div className="flex flex-col flex-1 p-4 pt-3.5">
        <div className="flex items-center gap-1 text-[#5f554d] mb-1.5">
          <IconMapPin className="h-3 w-3 shrink-0" />
          <span className="text-xs tracking-wide truncate">
            {property.city}
          </span>
        </div>

        <Link href={`/properties/${property.id}`}>
          <h3 className="font-display text-[#181411] font-medium text-[1.05rem] leading-snug line-clamp-2 hover:text-[#a34702] transition-colors duration-200 mb-2.5">
            {property.title}
          </h3>
        </Link>

        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="font-mono text-[1.3rem] font-semibold text-[#a34702] leading-none">
            {formatPrice(property.price)}
          </span>
          {property.listingType === 'rent' && (
            <span className="text-xs text-[#5f554d]">/mo</span>
          )}
        </div>

        {(property.bedrooms || property.bathrooms || property.areaSqM) && (
          <div className="flex items-center gap-3 text-[#5f554d] text-xs pb-3.5 mb-3 border-b border-[rgba(34,24,18,0.08)]">
            {property.bedrooms !== undefined && property.bedrooms > 0 && (
              <span className="flex items-center gap-1">
                <IconBed className="h-3.5 w-3.5" />
                {property.bedrooms} bd
              </span>
            )}
            {property.bathrooms !== undefined && property.bathrooms > 0 && (
              <span className="flex items-center gap-1">
                <IconBath className="h-3.5 w-3.5" />
                {property.bathrooms} ba
              </span>
            )}
            {property.areaSqM && (
              <span className="flex items-center gap-1">
                <IconSquare className="h-3.5 w-3.5" />
                {property.areaSqM.toLocaleString()} sq m
              </span>
            )}
          </div>
        )}

        {property.ownerName && (
          <div className="mt-auto flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-[#faf7eb] overflow-hidden shrink-0 ring-1 ring-[rgba(34,24,18,0.08)]">
              {property.ownerImage ? (
                <Image
                  src={property.ownerImage}
                  alt={property.ownerName}
                  width={24}
                  height={24}
                  className="object-cover h-full w-full"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-[8px] text-[#a34702] font-bold">
                  {getInitials(property.ownerName)}
                </div>
              )}
            </div>
            <span className="text-xs text-[#5f554d] truncate flex-1">
              {property.ownerName}
            </span>
            {property.ownerPlan && property.ownerPlan !== 'free' && (
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 uppercase tracking-wide',
                  property.ownerPlan === 'agency'
                    ? 'bg-[#ecf8f5] text-[#1c4a3c]'
                    : 'bg-[#fef0e6] text-[#964003]'
                )}
              >
                {property.ownerPlan}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
