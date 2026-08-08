import 'server-only'

import { createClient } from '@/lib/supabase/server'

// Server-only data access: callers authenticate before these RLS-protected writes.

export type RentalApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'conditionally_approved'
  | 'rejected'
  | 'withdrawn'

export interface RentalApplication {
  id: string
  listingId: string
  applicantProfileId: string
  applicantName?: string
  applicantImage?: string
  status: RentalApplicationStatus
  monthlyIncome?: number
  employmentNote?: string
  occupantsCount?: number
  hasPets: boolean
  moveInDate?: string
  notes?: string
  createdAt: Date
  listingTitle?: string
  listingCity?: string
  listingCoverImage?: string
}

interface ProfileJoin {
  name: string
  profile_image: string | null
}

interface ApplicationRow {
  id: string
  listing_id: string
  status: RentalApplicationStatus
  monthly_income: number | null
  employment_note: string | null
  occupants_count: number | null
  has_pets: boolean
  move_in_date: string | null
  notes: string | null
  created_at: string
  listings: {
    title: string
    properties: { city: string; cover_image: string | null } | null
  } | null
  applicant: { profile_id: string; profiles: ProfileJoin | null } | null
}

const APPLICATION_SELECT =
  '*, listings(title, properties(city, cover_image)), applicant:party_roles!applicant_party_id(profile_id, profiles(name, profile_image))'

function dbRowToApplication(row: ApplicationRow): RentalApplication {
  return {
    id: row.id,
    listingId: row.listing_id,
    applicantProfileId: row.applicant?.profile_id ?? '',
    applicantName: row.applicant?.profiles?.name,
    applicantImage: row.applicant?.profiles?.profile_image ?? undefined,
    status: row.status,
    monthlyIncome: row.monthly_income ?? undefined,
    employmentNote: row.employment_note ?? undefined,
    occupantsCount: row.occupants_count ?? undefined,
    hasPets: row.has_pets,
    moveInDate: row.move_in_date ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: new Date(row.created_at),
    listingTitle: row.listings?.title,
    listingCity: row.listings?.properties?.city,
    listingCoverImage: row.listings?.properties?.cover_image ?? undefined,
  }
}

export async function getApplicationById(
  id: string
): Promise<RentalApplication | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rental_applications')
    .select(APPLICATION_SELECT)
    .eq('id', id)
    .single()

  if (error || !data) return null
  return dbRowToApplication(data as unknown as ApplicationRow)
}

export async function submitRentalApplication(input: {
  listingId: string
  monthlyIncome?: number
  employmentNote?: string
  occupantsCount?: number
  hasPets: boolean
  moveInDate?: string
  notes?: string
}): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('submit_rental_application', {
    p_listing_id: input.listingId,
    p_monthly_income: input.monthlyIncome ?? null,
    p_employment_note: input.employmentNote ?? null,
    p_occupants_count: input.occupantsCount ?? null,
    p_has_pets: input.hasPets,
    p_move_in_date: input.moveInDate ?? null,
    p_notes: input.notes ?? null,
  })
  if (error || !data)
    throw new Error(error?.message ?? 'Failed to submit application')
  return data as string
}

export async function markApplicationUnderReview(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('rental_applications')
    .update({ status: 'under_review' })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function approveRentalApplication(id: string): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('approve_rental_application', {
    p_application_id: id,
  })
  if (error || !data)
    throw new Error(error?.message ?? 'Failed to approve application')
  return data as string
}

export async function conditionallyApproveApplication(
  id: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('rental_applications')
    .update({ status: 'conditionally_approved' })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function rejectRentalApplication(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('rental_applications')
    .update({ status: 'rejected' })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function withdrawRentalApplication(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('rental_applications')
    .update({ status: 'withdrawn' })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** Applications where the given profile is the applicant — "Your Applications". */
export async function getApplicationsSubmitted(
  userId: string
): Promise<RentalApplication[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rental_applications')
    .select(
      `${APPLICATION_SELECT.replace('applicant:party_roles!applicant_party_id', 'applicant:party_roles!applicant_party_id!inner')}`
    )
    .eq('applicant.profile_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as ApplicationRow[]).map(dbRowToApplication)
}

/** Applications received on listings the given profile owns — "Applications to Review". */
export async function getApplicationsForOwner(
  ownerId: string
): Promise<RentalApplication[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rental_applications')
    .select(
      `${APPLICATION_SELECT}, listings!inner(title, listed_by, properties(city, cover_image))`
    )
    .eq('listings.listed_by', ownerId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as ApplicationRow[]).map(dbRowToApplication)
}
