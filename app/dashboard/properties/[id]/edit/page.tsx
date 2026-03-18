'use client'

import { IconCirclePlus, IconDeviceFloppy, IconX } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { use, useEffect, useState } from 'react'
import { z } from 'zod'
import { useSupabase } from '@/components/providers/supabase-provider'
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

export default function EditPropertyPage({ params }: EditPropertyPageProps) {
  const { id } = use(params)
  const { user } = useSupabase()
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
  const [imageUrls, setImageUrls] = useState<string[]>([''])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/properties/${id}`)
      .then((r) => r.json())
      .then((data: Property) => {
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
        setImageUrls(data.images.length > 0 ? data.images : [''])
      })
      .catch(() => null)
      .finally(() => setIsLoading(false))
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

    const validImages = imageUrls.filter((u) => u.trim() !== '')
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
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsed.data, status: 'pending' }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
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
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
        <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-[#181411]">
            Basic Information
          </h3>
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              error={errors.title}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>City *</Label>
              <Select
                value={form.city}
                onValueChange={(v) => setField('city', v)}
              >
                <SelectTrigger>
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
              <Label>Type *</Label>
              <Select
                value={form.listingType}
                onValueChange={(v: 'sale' | 'rent') =>
                  setField('listingType', v)
                }
              >
                <SelectTrigger>
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
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-[#181411]">
            Pricing & Specs
          </h3>
          <div className="space-y-1.5">
            <Label>Price (USD) *</Label>
            <Input
              type="number"
              value={form.price}
              onChange={(e) => setField('price', e.target.value)}
              error={errors.price}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Bedrooms</Label>
              <Input
                type="number"
                value={form.bedrooms}
                onChange={(e) => setField('bedrooms', e.target.value)}
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bathrooms</Label>
              <Input
                type="number"
                value={form.bathrooms}
                onChange={(e) => setField('bathrooms', e.target.value)}
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Area (m²)</Label>
              <Input
                type="number"
                value={form.areaSqM}
                onChange={(e) => setField('areaSqM', e.target.value)}
                min={0}
              />
            </div>
          </div>
        </div>

        <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-[#181411]">
            Description *
          </h3>
          <textarea
            rows={6}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            className="flex w-full rounded-lg border border-[rgba(34,24,18,0.14)] bg-white px-3 py-2 text-sm text-[#181411] placeholder:text-[#8b8178] focus:outline-none focus:ring-2 focus:ring-[#fa6b05]/30 focus:border-[#fa6b05] transition-colors resize-none"
          />
          {errors.description && (
            <p className="text-xs text-red-600">{errors.description}</p>
          )}
        </div>

        <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-[#181411]">
            IconPhoto
          </h3>
          <div className="space-y-2">
            {imageUrls.map((url, idx) => (
              <div key={url || String(idx)} className="flex gap-2">
                <Input
                  placeholder={`Image URL ${idx + 1}`}
                  value={url}
                  onChange={(e) => {
                    const newUrls = [...imageUrls]
                    newUrls[idx] = e.target.value
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
                      setImageUrls((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <IconX className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {imageUrls.length < planLimit.maxImages && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setImageUrls((prev) => [...prev, ''])}
              className="gap-2"
            >
              <IconCirclePlus className="h-4 w-4" />
              Add Image
            </Button>
          )}
        </div>

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
    </div>
  )
}
