'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { unhideListingAction } from '@/app/actions/discovery'
import { Button } from '@/components/ui/button'
import type { HiddenListing } from '@/services/discovery.service'

export function HiddenListingsList({
  listings,
}: {
  listings: HiddenListing[]
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const unhide = async (listingId: string) => {
    setPendingId(listingId)
    try {
      await unhideListingAction(listingId)
      router.refresh()
    } finally {
      setPendingId(null)
    }
  }

  if (listings.length === 0) return null

  return (
    <div className="mt-8">
      <h3 className="font-display text-base font-semibold text-[#181411] mb-3">
        Hidden Listings ({listings.length})
      </h3>
      <div className="space-y-2">
        {listings.map((listing) => (
          <div
            key={listing.listingId}
            className="flex items-center justify-between p-3 rounded-lg bg-white border border-[rgba(34,24,18,0.08)]"
          >
            <Link
              href={`/properties/${listing.listingId}`}
              className="text-sm text-[#181411] hover:text-[#a34702] transition-colors"
            >
              {listing.title}
            </Link>
            <Button
              size="sm"
              variant="ghost"
              disabled={pendingId === listing.listingId}
              onClick={() => unhide(listing.listingId)}
            >
              Unhide
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
