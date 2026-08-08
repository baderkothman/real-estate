'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/neon/server'
import {
  createTransactionTask,
  type TaskStatus,
  type TransactionStatus,
  transitionTransactionStatus,
  updateTaskStatus,
} from '@/services/transaction.service.server'

async function getAuthenticatedUserId() {
  const dbClient = await createClient()
  const {
    data: { user },
  } = await dbClient.auth.getUser()
  return user?.id ?? null
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export async function transitionTransactionStatusAction(
  transactionId: string,
  status: TransactionStatus
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    await transitionTransactionStatus(transactionId, status)
    revalidatePath(`/dashboard/transactions/${transactionId}`)
    return { success: true }
  } catch (err) {
    console.error('Transition transaction status error:', err)
    return { error: errorMessage(err, 'Failed to update transaction status') }
  }
}

export async function createTransactionTaskAction(
  transactionId: string,
  title: string,
  dueDate?: string
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  if (!title || title.trim().length === 0) {
    return { error: 'Task title is required' }
  }

  try {
    await createTransactionTask({ transactionId, title: title.trim(), dueDate })
    revalidatePath(`/dashboard/transactions/${transactionId}`)
    return { success: true }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to add task') }
  }
}

export async function updateTaskStatusAction(
  taskId: string,
  status: TaskStatus,
  transactionId: string
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    await updateTaskStatus(taskId, status)
    revalidatePath(`/dashboard/transactions/${transactionId}`)
    return { success: true }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to update task') }
  }
}
