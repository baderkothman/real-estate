'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  closeInquiry,
  replyToInquiry,
  sendInquiry,
  sendMessage,
} from '@/services/messaging.service.server'
import { createNotification } from '@/services/notification.service.server'
import { getPropertyById } from '@/services/property.service'

async function getAuthenticatedUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export async function sendInquiryAction(listingId: string, message: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  if (!message || message.trim().length < 5) {
    return { error: 'Your message is too short' }
  }

  try {
    const listing = await getPropertyById(listingId)
    if (!listing) return { error: 'Listing not found' }
    if (listing.userId === userId) {
      return { error: "You can't send an inquiry about your own listing" }
    }

    const inquiry = await sendInquiry({
      listingId,
      fromProfileId: userId,
      message: message.trim(),
    })

    await createNotification({
      profileId: listing.userId,
      type: 'inquiry_received',
      title: `New question about "${listing.title}"`,
      linkHref: '/dashboard/messages',
    })

    revalidatePath('/dashboard/messages')
    revalidatePath(`/properties/${listingId}`)
    return { inquiry }
  } catch (err) {
    console.error('Send inquiry error:', err)
    return { error: errorMessage(err, 'Failed to send your question') }
  }
}

export async function replyToInquiryAction(inquiryId: string, reply: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  if (!reply || reply.trim().length < 1) {
    return { error: 'Write a reply first' }
  }

  try {
    const supabase = await createClient()
    const { data: inquiry } = await supabase
      .from('inquiries')
      .select('from_profile_id, listings(title)')
      .eq('id', inquiryId)
      .single()

    const conversationId = await replyToInquiry(inquiryId, reply.trim())

    const listingTitle = (
      inquiry as unknown as { listings: { title: string } | null } | null
    )?.listings?.title
    if (inquiry?.from_profile_id) {
      await createNotification({
        profileId: inquiry.from_profile_id,
        type: 'inquiry_replied',
        title: `You got a reply about "${listingTitle ?? 'your question'}"`,
        linkHref: `/dashboard/messages/${conversationId}`,
      })
    }

    revalidatePath('/dashboard/messages')
    return { conversationId }
  } catch (err) {
    console.error('Reply to inquiry error:', err)
    return { error: errorMessage(err, 'Failed to send reply') }
  }
}

export async function closeInquiryAction(inquiryId: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    await closeInquiry(inquiryId)
    revalidatePath('/dashboard/messages')
    return { success: true }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to close inquiry') }
  }
}

export async function sendMessageAction(conversationId: string, body: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  if (!body || body.trim().length < 1) {
    return { error: 'Message cannot be empty' }
  }

  try {
    await sendMessage(conversationId, userId, body.trim())

    const supabase = await createClient()
    const { data: otherParticipants } = await supabase
      .from('conversation_participants')
      .select('profile_id')
      .eq('conversation_id', conversationId)
      .neq('profile_id', userId)

    await Promise.all(
      (otherParticipants ?? []).map((p) =>
        createNotification({
          profileId: p.profile_id,
          type: 'message_received',
          title: 'You have a new message',
          linkHref: `/dashboard/messages/${conversationId}`,
        })
      )
    )

    revalidatePath(`/dashboard/messages/${conversationId}`)
    return { success: true }
  } catch (err) {
    console.error('Send message error:', err)
    return { error: errorMessage(err, 'Failed to send message') }
  }
}
