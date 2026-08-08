import { IconArrowLeft } from '@tabler/icons-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { DocumentList } from '@/components/transaction/document-list'
import { PaymentList } from '@/components/transaction/payment-list'
import { TaskList } from '@/components/transaction/task-list'
import { TransactionStatusActions } from '@/components/transaction/transaction-status-actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/neon/server'
import { cn, formatDate, getInitials } from '@/lib/utils'
import { getDocumentsForTransaction } from '@/services/document.service'
import { getPaymentIntentsForTransaction } from '@/services/payment.service'
import {
  getTransactionById,
  getTransactionParticipants,
  getTransactionTasks,
} from '@/services/transaction.service.server'

export const metadata: Metadata = { title: 'Transaction' }

interface TransactionPageProps {
  params: Promise<{ id: string }>
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-blue-50 border-blue-200 text-blue-700',
  pending_closing: 'bg-amber-50 border-amber-200 text-amber-700',
  completed: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  cancelled: 'bg-[#f5f0e8] border-[rgba(34,24,18,0.14)] text-[#5f554d]',
  terminated: 'bg-red-50 border-red-200 text-red-700',
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[rgba(34,24,18,0.06)] last:border-0">
      <span className="text-sm text-[#5f554d]">{label}</span>
      <span className="text-sm font-medium text-[#181411] capitalize">
        {value.replace(/_/g, ' ')}
      </span>
    </div>
  )
}

function nextActionFor(status: string, openTaskTitle?: string) {
  if (status === 'completed') return 'This transaction is complete.'
  if (status === 'cancelled' || status === 'terminated') {
    return `This transaction was ${status}.`
  }
  if (openTaskTitle) return openTaskTitle
  if (status === 'pending_closing') return 'Finalize closing.'
  return 'No open tasks — add one below, or move this transaction forward when ready.'
}

export default async function TransactionPage({
  params,
}: TransactionPageProps) {
  const [{ id }, dbClient] = await Promise.all([params, createClient()])
  const {
    data: { user },
  } = await dbClient.auth.getUser()
  if (!user) redirect('/auth/login')

  // RLS (is_transaction_party) scopes this to the listing owner and the
  // offer/application's parties — a non-party or nonexistent id resolves
  // to null here, not a 403 leaking the transaction's existence.
  const transaction = await getTransactionById(id)
  if (!transaction) notFound()

  const [participants, tasks, documents, paymentIntents] = await Promise.all([
    getTransactionParticipants(transaction),
    getTransactionTasks(transaction.id),
    getDocumentsForTransaction(transaction.id),
    getPaymentIntentsForTransaction(transaction.id),
  ])

  const nextOpenTask = tasks.find(
    (t) => t.status === 'open' || t.status === 'in_progress'
  )
  const doneCount = tasks.filter(
    (t) => t.status === 'done' || t.status === 'skipped'
  ).length

  return (
    <div className="max-w-3xl">
      <Link
        href={
          transaction.sourceType === 'offer'
            ? '/dashboard/offers'
            : '/dashboard/applications'
        }
        className="inline-flex items-center gap-1.5 text-sm text-[#5f554d] hover:text-[#181411] transition-colors mb-4"
      >
        <IconArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>

      <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6 mb-5">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display text-xl font-semibold text-[#181411]">
            {transaction.listingTitle ?? 'Transaction'}
          </h1>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize',
              STATUS_STYLES[transaction.status]
            )}
          >
            {transaction.status.replace(/_/g, ' ')}
          </span>
        </div>
        {transaction.listingCity && (
          <p className="text-sm text-[#5f554d] mb-4">
            {transaction.listingCity}
          </p>
        )}

        {tasks.length > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#5f554d]">Progress</span>
              <span className="text-[#a34702] font-medium">
                {doneCount} / {tasks.length}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[#fef0e6] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#fa6b05] transition-[width]"
                style={{
                  width: `${Math.min(100, (doneCount / tasks.length) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="rounded-lg bg-[#faf7eb] px-4 py-3 mb-4">
          <p className="text-[10px] font-semibold text-[#5f554d] uppercase tracking-[0.15em] mb-1">
            Next Action
          </p>
          <p className="text-sm text-[#181411]">
            {nextActionFor(transaction.status, nextOpenTask?.title)}
          </p>
        </div>

        <TransactionStatusActions
          transactionId={transaction.id}
          currentStatus={transaction.status}
        />
      </div>

      <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] overflow-hidden">
        <Tabs defaultValue="overview">
          <TabsList className="px-6 pt-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="overview">
              <StatusRow label="Contract" value={transaction.contractStatus} />
              <StatusRow label="Payment" value={transaction.paymentStatus} />
              <StatusRow label="Payout" value={transaction.payoutStatus} />
              <StatusRow label="Dispute" value={transaction.disputeStatus} />
              <p className="text-xs text-[#5f554d] mt-4">
                Created {formatDate(transaction.createdAt)}
                {transaction.targetCloseDate &&
                  ` · Target close: ${transaction.targetCloseDate}`}
                {transaction.closedAt &&
                  ` · Closed: ${formatDate(transaction.closedAt)}`}
              </p>
              <Link
                href={`/properties/${transaction.listingId}`}
                className="inline-block mt-3 text-sm text-[#a34702] hover:underline"
              >
                View listing
              </Link>
            </TabsContent>

            <TabsContent value="participants">
              <div className="space-y-3">
                {participants.map((p) => (
                  <div
                    key={`${p.role}-${p.profileId}`}
                    className="flex items-center gap-3"
                  >
                    <div className="relative h-9 w-9 rounded-full overflow-hidden ring-2 ring-[#fa6b05]/15 shrink-0 bg-[#fef0e6] flex items-center justify-center text-[#a34702] font-bold text-xs">
                      {p.image ? (
                        <Image
                          src={p.image}
                          alt={p.name ?? p.role}
                          fill
                          className="object-cover"
                          sizes="36px"
                        />
                      ) : (
                        getInitials(p.name ?? p.role)
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#181411]">
                        {p.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-[#5f554d]">{p.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="tasks">
              <TaskList transactionId={transaction.id} tasks={tasks} />
            </TabsContent>

            <TabsContent value="documents">
              <DocumentList
                transactionId={transaction.id}
                documents={documents}
                currentUserId={user.id}
              />
            </TabsContent>

            <TabsContent value="payments">
              <PaymentList
                transactionId={transaction.id}
                paymentIntents={paymentIntents}
                commissionAmount={transaction.commissionAmount}
                commissionRatePercent={transaction.commissionRatePercent}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
