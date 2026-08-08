'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createDocument,
  createDocumentDownloadUrl,
  createDocumentUploadUrl,
  type DocType,
  declineDocument,
  getDocumentById,
  sendDocumentForSignature,
  signDocument,
  voidDocument,
} from '@/services/document.service'
import { getTransactionById } from '@/services/transaction.service.server'

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

export async function getDocumentUploadUrlAction(
  transactionId: string,
  filename: string
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  // getTransactionById is RLS-scoped to transaction parties — null here
  // means either the transaction doesn't exist or the caller isn't a party.
  const transaction = await getTransactionById(transactionId)
  if (!transaction) return { error: 'Transaction not found' }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${transactionId}/${crypto.randomUUID()}-${safeName}`

  try {
    const upload = await createDocumentUploadUrl(path)
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!publicKey) return { error: 'Storage is not configured' }

    return {
      ...upload,
      headers: {
        apikey: publicKey,
        Authorization: `Bearer ${publicKey}`,
        'x-upsert': 'false',
      },
    }
  } catch (err) {
    console.error('Create upload URL error:', err)
    return { error: errorMessage(err, 'Failed to prepare upload') }
  }
}

export async function createDocumentAction(input: {
  transactionId: string
  title: string
  docType: DocType
  storagePath: string
}) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  if (!input.title || input.title.trim().length === 0) {
    return { error: 'Document title is required' }
  }

  try {
    const documentId = await createDocument({ ...input, uploadedBy: userId })
    revalidatePath(`/dashboard/transactions/${input.transactionId}`)
    return { documentId }
  } catch (err) {
    console.error('Create document error:', err)
    return { error: errorMessage(err, 'Failed to save document') }
  }
}

export async function getDocumentDownloadUrlAction(documentId: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  // RLS on `documents` scopes this read to transaction parties/admin.
  const document = await getDocumentById(documentId)
  if (!document || !document.storagePath) return { error: 'Document not found' }

  try {
    const url = await createDocumentDownloadUrl(document.storagePath)
    return { url }
  } catch (err) {
    console.error('Create download URL error:', err)
    return { error: errorMessage(err, 'Failed to generate download link') }
  }
}

export async function sendDocumentForSignatureAction(
  documentId: string,
  title: string,
  transactionId: string
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    await sendDocumentForSignature(documentId, title)
    revalidatePath(`/dashboard/transactions/${transactionId}`)
    return { success: true }
  } catch (err) {
    console.error('Send document for signature error:', err)
    return { error: errorMessage(err, 'Failed to send for signature') }
  }
}

export async function signDocumentAction(
  documentSignerId: string,
  transactionId: string
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    await signDocument(documentSignerId)
    revalidatePath(`/dashboard/transactions/${transactionId}`)
    return { success: true }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to sign document') }
  }
}

export async function declineDocumentAction(
  documentSignerId: string,
  transactionId: string
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    await declineDocument(documentSignerId)
    revalidatePath(`/dashboard/transactions/${transactionId}`)
    return { success: true }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to decline document') }
  }
}

export async function voidDocumentAction(
  documentId: string,
  transactionId: string
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  try {
    await voidDocument(documentId)
    revalidatePath(`/dashboard/transactions/${transactionId}`)
    return { success: true }
  } catch (err) {
    return { error: errorMessage(err, 'Failed to void document') }
  }
}
