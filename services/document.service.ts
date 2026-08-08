import { getEsignProvider } from '@/lib/esign'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type EnvelopeStatus =
  | 'not_started'
  | 'draft'
  | 'sent'
  | 'partially_signed'
  | 'completed'
  | 'declined'
  | 'voided'

export type DocType =
  | 'agreement'
  | 'disclosure'
  | 'lease'
  | 'addendum'
  | 'other'

export interface DocumentSigner {
  id: string
  profileId?: string
  name?: string
  status: 'pending' | 'signed' | 'declined'
  signedAt?: Date
  orderIndex: number
}

export interface TransactionDocument {
  id: string
  transactionId: string
  title: string
  docType: DocType
  storagePath?: string
  uploadedBy: string
  envelopeProvider: string
  envelopeStatus: EnvelopeStatus
  createdAt: Date
  signers: DocumentSigner[]
}

interface SignerRow {
  id: string
  status: 'pending' | 'signed' | 'declined'
  signed_at: string | null
  order_index: number
  party_roles: { profile_id: string; profiles: { name: string } | null } | null
}

interface DocumentRow {
  id: string
  transaction_id: string
  title: string
  doc_type: DocType
  storage_path: string | null
  uploaded_by: string
  envelope_provider: string
  envelope_status: EnvelopeStatus
  created_at: string
  document_signers: SignerRow[]
}

const DOCUMENT_SELECT =
  '*, document_signers(id, status, signed_at, order_index, party_roles(profile_id, profiles(name)))'

function dbRowToDocument(row: DocumentRow): TransactionDocument {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    title: row.title,
    docType: row.doc_type,
    storagePath: row.storage_path ?? undefined,
    uploadedBy: row.uploaded_by,
    envelopeProvider: row.envelope_provider,
    envelopeStatus: row.envelope_status,
    createdAt: new Date(row.created_at),
    signers: (row.document_signers ?? [])
      .sort((a, b) => a.order_index - b.order_index)
      .map((s) => ({
        id: s.id,
        profileId: s.party_roles?.profile_id,
        name: s.party_roles?.profiles?.name,
        status: s.status,
        signedAt: s.signed_at ? new Date(s.signed_at) : undefined,
        orderIndex: s.order_index,
      })),
  }
}

export async function getDocumentById(
  id: string
): Promise<TransactionDocument | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_SELECT)
    .eq('id', id)
    .single()

  if (error || !data) return null
  return dbRowToDocument(data as unknown as DocumentRow)
}

export async function getDocumentsForTransaction(
  transactionId: string
): Promise<TransactionDocument[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_SELECT)
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as DocumentRow[]).map(dbRowToDocument)
}

export async function createDocument(input: {
  transactionId: string
  title: string
  docType: DocType
  storagePath: string
  uploadedBy: string
}): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('documents')
    .insert({
      transaction_id: input.transactionId,
      title: input.title,
      doc_type: input.docType,
      storage_path: input.storagePath,
      uploaded_by: input.uploadedBy,
    })
    .select('id')
    .single()

  if (error || !data)
    throw new Error(error?.message ?? 'Failed to create document')
  return data.id as string
}

export async function sendDocumentForSignature(
  documentId: string,
  documentTitle: string
): Promise<void> {
  const supabase = await createClient()
  const envelope = await getEsignProvider().createEnvelope({ documentTitle })

  const { error } = await supabase.rpc('send_document_for_signature', {
    p_document_id: documentId,
    p_envelope_id: envelope.envelopeId,
  })
  if (error) throw new Error(error.message)
}

export async function signDocument(documentSignerId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('sign_document', {
    p_document_signer_id: documentSignerId,
  })
  if (error) throw new Error(error.message)
}

export async function declineDocument(documentSignerId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('decline_document', {
    p_document_signer_id: documentSignerId,
  })
  if (error) throw new Error(error.message)
}

export async function voidDocument(documentId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('void_document', {
    p_document_id: documentId,
  })
  if (error) throw new Error(error.message)
}

// ─── Storage (private bucket, service-role-issued signed URLs only) ────────

export async function createDocumentUploadUrl(
  path: string
): Promise<{ signedUrl: string; token: string; path: string }> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('documents')
    .createSignedUploadUrl(path)
  if (error || !data)
    throw new Error(error?.message ?? 'Failed to create upload URL')
  return { signedUrl: data.signedUrl, token: data.token, path: data.path }
}

export async function createDocumentDownloadUrl(path: string): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('documents')
    .createSignedUrl(path, 60 * 5) // 5 minutes
  if (error || !data)
    throw new Error(error?.message ?? 'Failed to create download URL')
  return data.signedUrl
}
