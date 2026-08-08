import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { PropertyFilters } from '@/types'

// Server-only data access: callers authenticate before these RLS-protected writes.

// ─── Saved searches & alerts ─────────────────────────────────────────────────
//
// Separate from `saved_properties`: a saved property is "I'm interested in
// this specific listing"; a saved search is "notify me about new listings
// matching this criteria" — different intentions, different lifecycles.

export interface SavedSearch {
  id: string
  name: string
  filters: PropertyFilters
  createdAt: Date
  alertActive: boolean
  alertFrequency?: 'instant' | 'daily' | 'weekly'
}

interface SavedSearchRow {
  id: string
  name: string
  filters: PropertyFilters
  created_at: string
  search_alerts: {
    is_active: boolean
    frequency: 'instant' | 'daily' | 'weekly'
  }[]
}

export async function saveSearch(input: {
  profileId: string
  name: string
  filters: PropertyFilters
}): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      profile_id: input.profileId,
      name: input.name,
      filters: input.filters,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to save search')

  await supabase.from('search_alerts').insert({ saved_search_id: data.id })

  return data.id as string
}

export async function getSavedSearches(userId: string): Promise<SavedSearch[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*, search_alerts(is_active, frequency)')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as SavedSearchRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    filters: row.filters,
    createdAt: new Date(row.created_at),
    alertActive: row.search_alerts[0]?.is_active ?? false,
    alertFrequency: row.search_alerts[0]?.frequency,
  }))
}

export async function deleteSavedSearch(
  id: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('saved_searches')
    .delete()
    .eq('id', id)
    .eq('profile_id', userId)
}

export async function setSearchAlertActive(
  savedSearchId: string,
  isActive: boolean
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('search_alerts')
    .update({ is_active: isActive })
    .eq('saved_search_id', savedSearchId)
}

/** Admin/service-role read used only by the alert-dispatch cron route. */
export async function getActiveSearchAlerts(): Promise<
  {
    alertId: string
    savedSearchId: string
    profileId: string
    filters: PropertyFilters
    lastRunAt: Date | null
  }[]
> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('search_alerts')
    .select('id, last_run_at, saved_searches(id, profile_id, filters)')
    .eq('is_active', true)

  if (error || !data) return []

  return (
    data as unknown as {
      id: string
      last_run_at: string | null
      saved_searches: {
        id: string
        profile_id: string
        filters: PropertyFilters
      } | null
    }[]
  )
    .filter((row) => row.saved_searches !== null)
    .map((row) => ({
      alertId: row.id,
      savedSearchId: row.saved_searches?.id as string,
      profileId: row.saved_searches?.profile_id as string,
      filters: row.saved_searches?.filters as PropertyFilters,
      lastRunAt: row.last_run_at ? new Date(row.last_run_at) : null,
    }))
}

export async function markAlertRun(alertId: string): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('search_alerts')
    .update({ last_run_at: new Date().toISOString() })
    .eq('id', alertId)
}

// ─── Property notes ────────────────────────────────────────────────────────

export interface PropertyNote {
  id: string
  listingId: string
  body: string
  createdAt: Date
  updatedAt: Date
}

interface PropertyNoteRow {
  id: string
  listing_id: string
  body: string
  created_at: string
  updated_at: string
}

export async function getNotesForListing(
  listingId: string,
  userId: string
): Promise<PropertyNote[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('property_notes')
    .select('*')
    .eq('listing_id', listingId)
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as PropertyNoteRow[]).map((row) => ({
    id: row.id,
    listingId: row.listing_id,
    body: row.body,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }))
}

export async function addPropertyNote(input: {
  profileId: string
  listingId: string
  body: string
}): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('property_notes').insert({
    profile_id: input.profileId,
    listing_id: input.listingId,
    body: input.body,
  })
  if (error) throw new Error(error.message)
}

export async function deletePropertyNote(
  id: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('property_notes')
    .delete()
    .eq('id', id)
    .eq('profile_id', userId)
}

// ─── Hidden listings ────────────────────────────────────────────────────────

export interface HiddenListing {
  listingId: string
  title: string
  hiddenAt: Date
}

export async function getHiddenListings(
  userId: string
): Promise<HiddenListing[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hidden_listings')
    .select('listing_id, hidden_at, listings(title)')
    .eq('profile_id', userId)
    .order('hidden_at', { ascending: false })

  if (error || !data) return []
  return (
    data as unknown as {
      listing_id: string
      hidden_at: string
      listings: { title: string } | null
    }[]
  ).map((row) => ({
    listingId: row.listing_id,
    title: row.listings?.title ?? 'Listing',
    hiddenAt: new Date(row.hidden_at),
  }))
}

export async function hideListing(
  listingId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('hidden_listings')
    .insert({ profile_id: userId, listing_id: listingId })
  if (error) throw new Error(error.message)
}

export async function unhideListing(
  listingId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('hidden_listings')
    .delete()
    .eq('profile_id', userId)
    .eq('listing_id', listingId)
}
