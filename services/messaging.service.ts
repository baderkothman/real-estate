import { createClient } from '@/lib/supabase/server'

export type InquiryStatus = 'new' | 'replied' | 'closed'

export interface Inquiry {
  id: string
  listingId: string
  fromProfileId: string
  message: string
  conversationId?: string
  status: InquiryStatus
  createdAt: Date
  listingTitle?: string
  fromName?: string
  fromImage?: string
}

export interface ConversationMessage {
  id: string
  conversationId: string
  senderId: string
  body: string
  attachmentUrl?: string
  createdAt: Date
  senderName?: string
  senderImage?: string
}

export interface ConversationSummary {
  id: string
  listingId: string
  listingTitle?: string
  otherParticipantId?: string
  otherParticipantName?: string
  otherParticipantImage?: string
  lastMessage?: string
  lastMessageAt?: Date
  unread: boolean
}

interface ProfileJoin {
  name: string
  profile_image: string | null
}

interface InquiryRow {
  id: string
  listing_id: string
  from_profile_id: string
  message: string
  conversation_id: string | null
  status: InquiryStatus
  created_at: string
  listings: { title: string } | null
  profiles?: ProfileJoin | null
}

const INQUIRY_SELECT =
  '*, listings(title), profiles!from_profile_id(name, profile_image)'

function dbRowToInquiry(row: InquiryRow): Inquiry {
  return {
    id: row.id,
    listingId: row.listing_id,
    fromProfileId: row.from_profile_id,
    message: row.message,
    conversationId: row.conversation_id ?? undefined,
    status: row.status,
    createdAt: new Date(row.created_at),
    listingTitle: row.listings?.title,
    fromName: row.profiles?.name,
    fromImage: row.profiles?.profile_image ?? undefined,
  }
}

export async function sendInquiry(input: {
  listingId: string
  fromProfileId: string
  message: string
}): Promise<Inquiry> {
  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('inquiries')
    .insert({
      listing_id: input.listingId,
      from_profile_id: input.fromProfileId,
      message: input.message,
    })
    .select(INQUIRY_SELECT)
    .single()

  if (error || !row) throw new Error(error?.message ?? 'Failed to send inquiry')
  return dbRowToInquiry(row as unknown as InquiryRow)
}

/**
 * Received inquiries for listings the given profile owns — the owner's
 * inbox. Filters via a listings join since `inquiries` itself has no
 * owner column (ownership is derived from the listing).
 */
export async function getInquiriesForOwner(
  ownerId: string
): Promise<Inquiry[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inquiries')
    .select(`${INQUIRY_SELECT}, listings!inner(title, listed_by)`)
    .eq('listings.listed_by', ownerId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as InquiryRow[]).map(dbRowToInquiry)
}

export async function getInquiriesSentByUser(
  userId: string
): Promise<Inquiry[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inquiries')
    .select(INQUIRY_SELECT)
    .eq('from_profile_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as InquiryRow[]).map(dbRowToInquiry)
}

/**
 * Promotes an inquiry into a real conversation (creates the conversation,
 * adds both parties, carries the original question over as the thread's
 * first message, appends the reply as the second). See the
 * `reply_to_inquiry` SQL function in
 * supabase/migrations/012_conversations_messages_inquiries.sql for the
 * authorization/atomicity details — this is a thin RPC wrapper.
 */
export async function replyToInquiry(
  inquiryId: string,
  replyBody: string
): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('reply_to_inquiry', {
    p_inquiry_id: inquiryId,
    p_reply_body: replyBody,
  })

  if (error || !data)
    throw new Error(error?.message ?? 'Failed to reply to inquiry')
  return data as string
}

export async function closeInquiry(inquiryId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('inquiries')
    .update({ status: 'closed' })
    .eq('id', inquiryId)

  if (error) throw new Error(error.message)
}

export async function getConversationsForUser(
  userId: string
): Promise<ConversationSummary[]> {
  const supabase = await createClient()

  const { data: participantRows, error: participantError } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('profile_id', userId)

  if (participantError || !participantRows || participantRows.length === 0) {
    return []
  }

  const conversationIds = participantRows.map((r) => r.conversation_id)
  const lastReadByConversation = new Map(
    participantRows.map((r) => [r.conversation_id, r.last_read_at])
  )

  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select('id, listing_id, listings(title), created_at')
    .in('id', conversationIds)

  if (conversationsError || !conversations) return []

  const [{ data: allParticipants }, { data: allMessages }] = await Promise.all([
    supabase
      .from('conversation_participants')
      .select('conversation_id, profile_id, profiles(name, profile_image)')
      .in('conversation_id', conversationIds),
    supabase
      .from('messages')
      .select('conversation_id, body, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false }),
  ])

  const lastMessageByConversation = new Map<
    string,
    { body: string; created_at: string }
  >()
  for (const m of allMessages ?? []) {
    if (!lastMessageByConversation.has(m.conversation_id)) {
      lastMessageByConversation.set(m.conversation_id, m)
    }
  }

  const otherParticipantByConversation = new Map<
    string,
    { profile_id: string; profiles: ProfileJoin | null }
  >()
  for (const p of (allParticipants ?? []) as unknown as {
    conversation_id: string
    profile_id: string
    profiles: ProfileJoin | null
  }[]) {
    if (p.profile_id !== userId) {
      otherParticipantByConversation.set(p.conversation_id, p)
    }
  }

  return (
    conversations as unknown as {
      id: string
      listing_id: string
      listings: { title: string } | null
      created_at: string
    }[]
  )
    .map((c): ConversationSummary => {
      const other = otherParticipantByConversation.get(c.id)
      const lastMessage = lastMessageByConversation.get(c.id)
      const lastReadAt = lastReadByConversation.get(c.id)
      return {
        id: c.id,
        listingId: c.listing_id,
        listingTitle: c.listings?.title,
        otherParticipantId: other?.profile_id,
        otherParticipantName: other?.profiles?.name,
        otherParticipantImage: other?.profiles?.profile_image ?? undefined,
        lastMessage: lastMessage?.body,
        lastMessageAt: lastMessage
          ? new Date(lastMessage.created_at)
          : undefined,
        unread: lastMessage
          ? !lastReadAt ||
            new Date(lastMessage.created_at) > new Date(lastReadAt)
          : false,
      }
    })
    .sort((a, b) => {
      const aTime = a.lastMessageAt?.getTime() ?? 0
      const bTime = b.lastMessageAt?.getTime() ?? 0
      return bTime - aTime
    })
}

export async function getConversationById(
  id: string
): Promise<{ id: string; listingId: string; listingTitle?: string } | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('conversations')
    .select('id, listing_id, listings(title)')
    .eq('id', id)
    .single()

  if (error || !data) return null
  const row = data as unknown as {
    id: string
    listing_id: string
    listings: { title: string } | null
  }
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listings?.title,
  }
}

export async function getMessagesForConversation(
  conversationId: string
): Promise<ConversationMessage[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles!sender_id(name, profile_image)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return (
    data as unknown as {
      id: string
      conversation_id: string
      sender_id: string
      body: string
      attachment_url: string | null
      created_at: string
      profiles: ProfileJoin | null
    }[]
  ).map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    attachmentUrl: row.attachment_url ?? undefined,
    createdAt: new Date(row.created_at),
    senderName: row.profiles?.name,
    senderImage: row.profiles?.profile_image ?? undefined,
  }))
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    body,
  })
  if (error) throw new Error(error.message)
}

export async function markConversationRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('profile_id', userId)
}
