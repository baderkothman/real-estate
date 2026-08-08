'use client'

import { IconDownload, IconFileText } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import {
  createDocumentAction,
  declineDocumentAction,
  getDocumentDownloadUrlAction,
  getDocumentUploadUrlAction,
  sendDocumentForSignatureAction,
  signDocumentAction,
  voidDocumentAction,
} from '@/app/actions/documents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { DocType, TransactionDocument } from '@/services/document.service'

const STATUS_STYLES: Record<string, string> = {
  not_started: 'bg-[#f5f0e8] border-[rgba(34,24,18,0.14)] text-[#5f554d]',
  sent: 'bg-amber-50 border-amber-200 text-amber-700',
  partially_signed: 'bg-blue-50 border-blue-200 text-blue-700',
  completed: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  declined: 'bg-red-50 border-red-200 text-red-700',
  voided: 'bg-[#f5f0e8] border-[rgba(34,24,18,0.14)] text-[#5f554d]',
}

function DocumentRow({
  document,
  transactionId,
  currentUserId,
}: {
  document: TransactionDocument
  transactionId: string
  currentUserId: string
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mySigner = document.signers.find((s) => s.profileId === currentUserId)
  const isUploader = document.uploadedBy === currentUserId

  const run = async (fn: () => Promise<{ error?: string }>) => {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await fn()
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  const download = async () => {
    setError(null)
    const result = await getDocumentDownloadUrlAction(document.id)
    if ('error' in result && result.error) {
      setError(result.error)
      return
    }
    if ('url' in result)
      window.open(result.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="p-4 rounded-xl bg-white border border-[rgba(34,24,18,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <IconFileText className="h-4 w-4 text-[#a34702]" />
          <span className="text-sm font-medium text-[#181411]">
            {document.title}
          </span>
          <span className="text-xs text-[#5f554d] capitalize">
            ({document.docType})
          </span>
        </div>
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
            STATUS_STYLES[document.envelopeStatus]
          )}
        >
          {document.envelopeStatus.replace(/_/g, ' ')}
        </span>
      </div>

      {document.signers.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#5f554d] mb-2">
          {document.signers.map((s) => (
            <span key={s.id} className="capitalize">
              {s.name ?? 'Signer'}: {s.status}
            </span>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 mb-2" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {document.storagePath && (
          <Button
            size="sm"
            variant="ghost"
            onClick={download}
            disabled={isSubmitting}
          >
            <IconDownload className="h-3.5 w-3.5" />
            Download
          </Button>
        )}
        {isUploader && document.envelopeStatus === 'not_started' && (
          <Button
            size="sm"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() =>
              run(() =>
                sendDocumentForSignatureAction(
                  document.id,
                  document.title,
                  transactionId
                )
              )
            }
          >
            Send for Signature
          </Button>
        )}
        {mySigner?.status === 'pending' && (
          <>
            <Button
              size="sm"
              disabled={isSubmitting}
              onClick={() =>
                run(() => signDocumentAction(mySigner.id, transactionId))
              }
            >
              Sign
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() =>
                run(() => declineDocumentAction(mySigner.id, transactionId))
              }
            >
              Decline
            </Button>
          </>
        )}
        {isUploader &&
          (document.envelopeStatus === 'sent' ||
            document.envelopeStatus === 'partially_signed') && (
            <Button
              size="sm"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() =>
                run(() => voidDocumentAction(document.id, transactionId))
              }
            >
              Void
            </Button>
          )}
      </div>
    </div>
  )
}

export function DocumentList({
  transactionId,
  documents,
  currentUserId,
}: {
  transactionId: string
  documents: TransactionDocument[]
  currentUserId: string
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [docType, setDocType] = useState<DocType>('other')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setError('Choose a file')
      return
    }
    if (!title.trim()) {
      setError('Enter a document title')
      return
    }

    setError(null)
    setIsUploading(true)
    try {
      const upload = await getDocumentUploadUrlAction(transactionId, file.name)
      if (!('signedUrl' in upload)) {
        setError(upload.error ?? 'Failed to prepare upload')
        return
      }

      const uploadBody = new FormData()
      uploadBody.set('cacheControl', '3600')
      uploadBody.set('', file)
      const uploadResponse = await fetch(upload.signedUrl, {
        method: 'PUT',
        headers: upload.headers,
        body: uploadBody,
      })
      if (!uploadResponse.ok) {
        const uploadError = (await uploadResponse.json().catch(() => null)) as {
          message?: string
          error?: string
        } | null
        setError(
          uploadError?.message ??
            uploadError?.error ??
            'Failed to upload document'
        )
        return
      }

      const result = await createDocumentAction({
        transactionId,
        title: title.trim(),
        docType,
        storagePath: upload.path,
      })
      if ('error' in result) {
        setError(result.error ?? 'Failed to save document')
        return
      }

      setTitle('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      router.refresh()
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      {documents.length === 0 ? (
        <p className="text-sm text-[#5f554d] py-4">No documents yet.</p>
      ) : (
        <div className="space-y-3 mb-5">
          {documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              document={doc}
              transactionId={transactionId}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}

      <div className="p-4 rounded-xl bg-[#faf7eb] space-y-2">
        <p className="text-xs font-semibold text-[#5f554d] uppercase tracking-[0.15em]">
          Upload a Document
        </p>
        <Input
          placeholder="Document title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={docType}
            onValueChange={(v) => setDocType(v as DocType)}
          >
            <SelectTrigger aria-label="Document type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agreement">Agreement</SelectItem>
              <SelectItem value="disclosure">Disclosure</SelectItem>
              <SelectItem value="lease">Lease</SelectItem>
              <SelectItem value="addendum">Addendum</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <input
            ref={fileInputRef}
            type="file"
            aria-label="Document file"
            className="flex h-10 w-full rounded-lg border border-[rgba(34,24,18,0.14)] bg-white px-3 py-2 text-sm text-[#181411] file:mr-2 file:rounded-md file:border-0 file:bg-[#fef0e6] file:px-2 file:py-1 file:text-xs file:text-[#a34702]"
          />
        </div>
        {error && (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
        <Button size="sm" disabled={isUploading} onClick={upload}>
          {isUploading ? 'Uploading...' : 'Upload'}
        </Button>
      </div>

      <p className="text-xs text-[#5f554d] mt-3">
        Development mode — signatures are simulated, not legally binding.
      </p>
    </div>
  )
}
