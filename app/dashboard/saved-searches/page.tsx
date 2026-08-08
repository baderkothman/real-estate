import { IconBookmark } from '@tabler/icons-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/components/common/empty-state'
import { HiddenListingsList } from '@/components/property/hidden-listings-list'
import { SavedSearchCard } from '@/components/property/saved-search-card'
import { createClient } from '@/lib/supabase/server'
import {
  getHiddenListings,
  getSavedSearches,
} from '@/services/discovery.service'

export const metadata: Metadata = { title: 'Saved Searches' }

export default async function SavedSearchesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [searches, hiddenListings] = await Promise.all([
    getSavedSearches(user.id),
    getHiddenListings(user.id),
  ])

  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-[#181411] mb-4">
        Saved Searches
      </h2>
      {searches.length === 0 ? (
        <EmptyState
          icon={IconBookmark}
          title="No saved searches"
          description="Apply filters on the Properties page and save the search to get notified about new matches."
          actionLabel="Browse Properties"
          actionHref="/properties"
        />
      ) : (
        <div className="space-y-3">
          {searches.map((search) => (
            <SavedSearchCard key={search.id} search={search} />
          ))}
        </div>
      )}

      <HiddenListingsList listings={hiddenListings} />
    </div>
  )
}
