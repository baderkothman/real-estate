import { IconArrowLeft } from '@tabler/icons-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { MessageComposer } from '@/components/messaging/message-composer'
import { createClient } from '@/lib/supabase/server'
import { cn, formatRelativeDate } from '@/lib/utils'
import {
  getConversationById,
  getMessagesForConversation,
  markConversationRead,
} from '@/services/messaging.service'

export const metadata: Metadata = { title: 'Conversation' }

interface ConversationPageProps {
  params: Promise<{ id: string }>
}

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // RLS scopes conversations to participants only — a non-participant (or a
  // conversation that doesn't exist) resolves to null here, not a 403 with
  // information about the conversation's existence.
  const conversation = await getConversationById(id)
  if (!conversation) notFound()

  const messages = await getMessagesForConversation(id)
  await markConversationRead(id, user.id)

  return (
    <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[rgba(34,24,18,0.08)] bg-[#faf7eb]">
        <Link
          href="/dashboard/messages"
          className="text-[#5f554d] hover:text-[#181411] transition-colors"
        >
          <IconArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="font-display text-sm font-semibold text-[#181411]">
            {conversation.listingTitle ?? 'Listing'}
          </p>
          <Link
            href={`/properties/${conversation.listingId}`}
            className="text-xs text-[#a34702] hover:underline"
          >
            View listing
          </Link>
        </div>
      </div>

      <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-[#5f554d] text-center py-8">
            No messages yet.
          </p>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === user.id
            return (
              <div
                key={message.id}
                className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-2.5',
                    isMine
                      ? 'bg-[#a34702] text-white'
                      : 'bg-[#faf7eb] text-[#181411]'
                  )}
                >
                  {!isMine && (
                    <p className="text-[10px] font-semibold text-[#a34702] mb-0.5">
                      {message.senderName ?? 'Them'}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-line">{message.body}</p>
                  <p
                    className={cn(
                      'text-[10px] mt-1',
                      isMine ? 'text-white/70' : 'text-[#5f554d]'
                    )}
                  >
                    {formatRelativeDate(message.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <MessageComposer conversationId={id} />
    </div>
  )
}
