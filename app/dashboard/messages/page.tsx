import { IconMessageCircle2 } from '@tabler/icons-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/components/common/empty-state'
import { InquiryReplyForm } from '@/components/messaging/inquiry-reply-form'
import { createClient } from '@/lib/neon/server'
import { cn, formatRelativeDate } from '@/lib/utils'
import {
  getConversationsForUser,
  getInquiriesForOwner,
  getInquiriesSentByUser,
} from '@/services/messaging.service.server'

export const metadata: Metadata = { title: 'Messages' }

export default async function DashboardMessagesPage() {
  const dbClient = await createClient()
  const {
    data: { user },
  } = await dbClient.auth.getUser()
  if (!user) redirect('/auth/login')

  const [receivedInquiries, sentInquiries, conversations] = await Promise.all([
    getInquiriesForOwner(user.id),
    getInquiriesSentByUser(user.id),
    getConversationsForUser(user.id),
  ])

  const newInquiries = receivedInquiries.filter((i) => i.status === 'new')
  const pendingSent = sentInquiries.filter((i) => i.status === 'new')

  return (
    <div className="space-y-10">
      {newInquiries.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold text-[#181411] mb-4">
            New Questions About Your Listings ({newInquiries.length})
          </h2>
          <div className="space-y-3">
            {newInquiries.map((inquiry) => (
              <div
                key={inquiry.id}
                className="p-4 rounded-xl bg-white border border-[rgba(34,24,18,0.08)]"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-sm font-medium text-[#181411]">
                    {inquiry.fromName ?? 'A prospective buyer'} asked about{' '}
                    <span className="text-[#a34702]">
                      {inquiry.listingTitle ?? 'your listing'}
                    </span>
                  </p>
                  <span className="text-xs text-[#5f554d] shrink-0">
                    {formatRelativeDate(inquiry.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-[#5f554d]">{inquiry.message}</p>
                <InquiryReplyForm inquiryId={inquiry.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-lg font-semibold text-[#181411] mb-4">
          Conversations ({conversations.length})
        </h2>
        {conversations.length === 0 ? (
          <EmptyState
            icon={IconMessageCircle2}
            title="No conversations yet"
            description="Once an inquiry is replied to, or a conversation starts, it will show up here."
          />
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/messages/${c.id}`}
                className={cn(
                  'flex items-center justify-between gap-3 p-4 rounded-xl bg-white border transition-colors',
                  c.unread
                    ? 'border-[#fa6b05]/30 bg-[#fef0e6]/40'
                    : 'border-[rgba(34,24,18,0.08)] hover:border-[rgba(34,24,18,0.14)]'
                )}
              >
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-sm truncate',
                      c.unread
                        ? 'font-semibold text-[#181411]'
                        : 'font-medium text-[#181411]'
                    )}
                  >
                    {c.otherParticipantName ?? 'Conversation'} &middot;{' '}
                    <span className="text-[#5f554d] font-normal">
                      {c.listingTitle ?? 'Listing'}
                    </span>
                  </p>
                  {c.lastMessage && (
                    <p className="text-xs text-[#5f554d] truncate mt-0.5">
                      {c.lastMessage}
                    </p>
                  )}
                </div>
                {c.unread && (
                  <span className="h-2 w-2 rounded-full bg-[#fa6b05] shrink-0" />
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {pendingSent.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold text-[#181411] mb-4">
            Your Questions Awaiting a Reply ({pendingSent.length})
          </h2>
          <div className="space-y-2">
            {pendingSent.map((inquiry) => (
              <div
                key={inquiry.id}
                className="p-4 rounded-xl bg-white border border-[rgba(34,24,18,0.08)]"
              >
                <p className="text-sm font-medium text-[#181411]">
                  {inquiry.listingTitle ?? 'Listing'}
                </p>
                <p className="text-sm text-[#5f554d] mt-1">{inquiry.message}</p>
                <p className="text-xs text-[#5f554d] mt-1.5">
                  Sent {formatRelativeDate(inquiry.createdAt)} &middot; awaiting
                  reply
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
