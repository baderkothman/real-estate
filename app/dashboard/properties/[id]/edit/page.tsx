'use client'

import {
  IconCirclePlus,
  IconDeviceFloppy,
  IconTag,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { use, useEffect, useState } from 'react'
import { z } from 'zod'
import {
  deletePropertyAction,
  getPropertyAction,
  toggleSoldPropertyAction,
  updatePropertyAction,
} from '@/app/actions/properties'
import { useNeon } from '@/components/providers/neon-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CITIES_LEBANON, PLAN_LIMITS } from '@/lib/constants'
import type { Property } from '@/types'

const propertySchema = z.object({
  title: z.string().min(5),
  city: z.string().min(1),
  address: z.string().optional(),
  listingType: z.enum(['sale', 'rent']),
  price: z.number().min(1),
  bedrooms: z.number().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  areaSqM: z.number().min(1).optional(),
  description: z.string().min(20),
  images: z.array(z.string().url()).min(1),
})

interface EditPropertyPageProps {
  params: Promise<{ id: string }>
}

type EditForm = {
  title: string
  city: string
  address: string
  listingType: 'sale' | 'rent'
  price: string
  bedrooms: string
  bathrooms: string
  areaSqM: string
  description: string
}

function BasicInfoFields({
  form,
  errors,
  setField,
}: {
  form: EditForm
  errors: Record<string, string>
  setField: (field: string, value: string) => void
}) {
  return (
    <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6 space-y-4">
      <h3 className="font-display text-lg font-semibold text-[#181411]">
        Basic Information
      </h3>
      <div className="space-y-1.5">
        <Label htmlFor="edit-title">Title *</Label>
        <Input
          id="edit-title"
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          error={errors.title}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-city">City *</Label>
          <Select value={form.city} onValueChange={(v) => setField('city', v)}>
            <SelectTrigger id="edit-city">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CITIES_LEBANON.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-listing-type">Type *</Label>
          <Select
            value={form.listingType}
            onValueChange={(v: 'sale' | 'rent') => setField('listingType', v)}
          >
            <SelectTrigger id="edit-listing-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sale">For Sale</SelectItem>
              <SelectItem value="rent">For Rent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-address">Address</Label>
        <Input
          id="edit-address"
          value={form.address}
          onChange={(e) => setField('address', e.target.value)}
        />
      </div>
    </div>
  )
}

function PricingSpecsFields({
  form,
  errors,
  setField,
}: {
  form: EditForm
  errors: Record<string, string>
  setField: (field: string, value: string) => void
}) {
  return (
    <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6 space-y-4">
      <h3 className="font-display text-lg font-semibold text-[#181411]">
        Pricing & Specs
      </h3>
      <div className="space-y-1.5">
        <Label htmlFor="edit-price">Price (USD) *</Label>
        <Input
          id="edit-price"
          type="number"
          value={form.price}
          onChange={(e) => setField('price', e.target.value)}
          error={errors.price}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-bedrooms">Bedrooms</Label>
          <Input
            id="edit-bedrooms"
            type="number"
            value={form.bedrooms}
            onChange={(e) => setField('bedrooms', e.target.value)}
            min={0}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-bathrooms">Bathrooms</Label>
          <Input
            id="edit-bathrooms"
            type="number"
            value={form.bathrooms}
            onChange={(e) => setField('bathrooms', e.target.value)}
            min={0}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-area">Area (sq m)</Label>
          <Input
            id="edit-area"
            type="number"
            value={form.areaSqM}
            onChange={(e) => setField('areaSqM', e.target.value)}
            min={0}
          />
        </div>
      </div>
    </div>
  )
}

function DescriptionField({
  description,
  error,
  setField,
}: {
  description: string
  error?: string
  setField: (field: string, value: string) => void
}) {
  return (
    <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6 space-y-4">
      <h3
        id="edit-description-label"
        className="font-display text-lg font-semibold text-[#181411]"
      >
        Description *
      </h3>
      <textarea
        id="edit-description"
        rows={6}
        value={description}
        onChange={(e) => setField('description', e.target.value)}
        aria-labelledby="edit-description-label"
        aria-invalid={!!error}
        aria-describedby={error ? 'edit-description-error' : undefined}
        className="flex w-full rounded-lg border border-[rgba(34,24,18,0.14)] bg-white px-3 py-2 text-sm text-[#181411] placeholder:text-[#5f554d] focus:outline-none focus:ring-2 focus:ring-[#fa6b05]/30 focus:border-[#fa6b05] transition-colors resize-none"
      />
      {error && (
        <p id="edit-description-error" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

function PhotosField({
  imageUrls,
  setImageUrls,
  maxImages,
}: {
  imageUrls: { id: string; url: string }[]
  setImageUrls: React.Dispatch<
    React.SetStateAction<{ id: string; url: string }[]>
  >
  maxImages: number
}) {
  return (
    <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6 space-y-4">
      <h3 className="font-display text-lg font-semibold text-[#181411]">
        Photos
      </h3>
      <div className="space-y-2">
        {imageUrls.map((row, idx) => (
          <div key={row.id} className="flex gap-2">
            <Input
              placeholder={`Image URL ${idx + 1}`}
              value={row.url}
              onChange={(e) => {
                const newUrls = [...imageUrls]
                newUrls[idx] = { ...row, url: e.target.value }
                setImageUrls(newUrls)
              }}
              className="flex-1"
            />
            {imageUrls.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  setImageUrls((prev) => prev.filter((r) => r.id !== row.id))
                }
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                aria-label={`Remove image ${idx + 1}`}
              >
                <IconX className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {imageUrls.length < maxImages && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            setImageUrls((prev) => [
              ...prev,
              { id: crypto.randomUUID(), url: '' },
            ])
          }
          className="gap-2"
        >
          <IconCirclePlus className="h-4 w-4" />
          Add Image
        </Button>
      )}
    </div>
  )
}

function ListingActionsCard({
  isSold,
  isTogglingSold,
  isDeleting,
  onToggleSold,
  onDelete,
}: {
  isSold: boolean
  isTogglingSold: boolean
  isDeleting: boolean
  onToggleSold: () => void
  onDelete: () => void
}) {
  return (
    <div className="mt-8 rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6 space-y-4">
      <h3 className="font-display text-lg font-semibold text-[#181411]">
        Listing Actions
      </h3>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          className="gap-2"
          disabled={isTogglingSold}
          onClick={onToggleSold}
        >
          <IconTag className="h-4 w-4" />
          {isTogglingSold
            ? 'Updating...'
            : isSold
              ? 'Mark as Available'
              : 'Mark as Sold'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          disabled={isDeleting}
          onClick={onDelete}
        >
          <IconTrash className="h-4 w-4" />
          {isDeleting ? 'Deleting...' : 'Delete Listing'}
        </Button>
      </div>
    </div>
  )
}

export default function EditPropertyPage({ params }: EditPropertyPageProps) {
  const { id } = use(params)
  const { user } = useNeon()
  const router = useRouter()

  const [property, setProperty] = useState<Property | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [form, setForm] = useState({
    title: '',
    city: '',
    address: '',
    listingType: 'sale' as 'sale' | 'rent',
    price: '',
    bedrooms: '',
    bathrooms: '',
    areaSqM: '',
    description: '',
  })
  const [imageUrls, setImageUrls] = useState<{ id: string; url: string }[]>(
    () => [{ id: crypto.randomUUID(), url: '' }]
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTogglingSold, setIsTogglingSold] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let isActive = true

    setIsLoading(true)
    getPropertyAction(id)
      .then((result) => {
        if (!isActive) return
        if (!result.property) {
          setProperty(null)
          return
        }

        const data = result.property
        setProperty(data)
        setForm({
          title: data.title,
          city: data.city,
          address: data.address ?? '',
          listingType: data.listingType,
          price: String(data.price),
          bedrooms: data.bedrooms !== undefined ? String(data.bedrooms) : '',
          bathrooms: data.bathrooms !== undefined ? String(data.bathrooms) : '',
          areaSqM: data.areaSqM !== undefined ? String(data.areaSqM) : '',
          description: data.description,
        })
        setImageUrls(
          data.images.length > 0
            ? data.images.map((url) => ({ id: crypto.randomUUID(), url }))
            : [{ id: crypto.randomUUID(), url: '' }]
        )
      })
      .catch(() => null)
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [id])

  const planLimit = user?.plan ? PLAN_LIMITS[user.plan] : PLAN_LIMITS.free

  const setField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field])
      setErrors((prev) => {
        const n = { ...prev }
        delete n[field]
        return n
      })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')

    if (user?.id !== property?.userId) {
      setServerError('You do not have permission to edit this listing.')
      return
    }

    const validImages = imageUrls.flatMap((row) =>
      row.url.trim() !== '' ? [row.url] : []
    )
    const parsed = propertySchema.safeParse({
      ...form,
      price: form.price ? Number(form.price) : undefined,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
      areaSqM: form.areaSqM ? Number(form.areaSqM) : undefined,
      images: validImages,
    })

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      parsed.error.errors.forEach((err) => {
        fieldErrors[err.path.join('.')] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const data = await updatePropertyAction(id, {
        ...parsed.data,
        status: 'pending',
      })
      if ('error' in data) {
        setServerError(data.error ?? 'Failed to update')
        return
      }
      router.push('/dashboard/profile')
    } catch {
      setServerError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleSold = async () => {
    setServerError('')
    setIsTogglingSold(true)
    try {
      const result = await toggleSoldPropertyAction(id)
      if ('error' in result) {
        setServerError(result.error ?? 'Failed to update sold status')
        return
      }
      setProperty((prev) => (prev ? { ...prev, isSold: result.isSold } : prev))
    } finally {
      setIsTogglingSold(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this listing? This cannot be undone.')) return

    setServerError('')
    setIsDeleting(true)
    try {
      const result = await deletePropertyAction(id)
      if ('error' in result) {
        setServerError(result.error ?? 'Failed to delete listing')
        return
      }
      router.push('/dashboard/profile')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl">
        <div className="h-8 w-48 bg-white border border-[rgba(34,24,18,0.08)] rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 bg-white border border-[rgba(34,24,18,0.08)] rounded-[20px] animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="text-center py-16">
        <p className="text-[#5f554d]">Property not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-2xl font-semibold text-[#181411] mb-2 tracking-wide">
        Edit Listing
      </h2>
      <p className="text-[#5f554d] text-sm mb-8">
        Edits will reset the listing status to &ldquo;pending&rdquo; for review.
      </p>

      {serverError && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          {serverError}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
        <BasicInfoFields form={form} errors={errors} setField={setField} />
        <PricingSpecsFields form={form} errors={errors} setField={setField} />
        <DescriptionField
          description={form.description}
          error={errors.description}
          setField={setField}
        />
        <PhotosField
          imageUrls={imageUrls}
          setImageUrls={setImageUrls}
          maxImages={planLimit.maxImages}
        />

        <div className="flex gap-3">
          <Button
            type="submit"
            size="lg"
            className="gap-2 flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Saving...
              </span>
            ) : (
              <>
                <IconDeviceFloppy className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>

      <ListingActionsCard
        isSold={property.isSold}
        isTogglingSold={isTogglingSold}
        isDeleting={isDeleting}
        onToggleSold={() => void handleToggleSold()}
        onDelete={() => void handleDelete()}
      />
    </div>
  )
}
