'use client'

import { IconAlertTriangle, IconCirclePlus, IconX } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
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

const propertySchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  city: z.string().min(1, 'Please select a city'),
  address: z.string().optional(),
  listingType: z.enum(['sale', 'rent']),
  price: z.number().min(1, 'Price is required'),
  bedrooms: z.number().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  areaSqM: z.number().min(1).optional(),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  images: z
    .array(z.string().url('Invalid image URL'))
    .min(1, 'At least one image is required'),
})

type FieldErrors = Partial<Record<string, string>>

export default function CreatePropertyPage() {
  const { user } = useSupabase()
  const router = useRouter()

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
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const planLimit = user?.plan ? PLAN_LIMITS[user.plan] : PLAN_LIMITS.free

  const setField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const addImageField = () => {
    if (imageUrls.length < planLimit.maxImages) {
      setImageUrls((prev) => [...prev, ''])
    }
  }

  const removeImageField = (idx: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateImageUrl = (idx: number, val: string) => {
    setImageUrls((prev) => prev.map((url, i) => (i === idx ? val : url)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')

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
      const fieldErrors: FieldErrors = {}
      parsed.error.errors.forEach((err) => {
        const key = err.path.join('.')
        fieldErrors[key] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })

      const data = (await res.json()) as { id?: string; error?: string }
      if (!res.ok) {
        setServerError(data.error ?? 'Failed to create listing')
        return
      }

      router.push('/dashboard/profile')
    } catch {
      setServerError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-2xl font-semibold text-[#181411] mb-2 tracking-wide">
        Create New Listing
      </h2>
      <p className="text-[#5f554d] text-sm mb-8">
        New listings are reviewed by our team before going live. Typically
        within 24 hours.
      </p>

      {serverError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
        {/* Basic Info */}
        <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-[#181411]">
            Basic Information
          </h3>

          <div className="space-y-1.5">
            <Label htmlFor="title">Property Title *</Label>
            <Input
              id="title"
              placeholder="e.g. Luxury Apartment in Achrafieh"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              error={errors.title}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>City *</Label>
              <Select
                value={form.city}
                onValueChange={(v) => setField('city', v)}
              >
                <SelectTrigger className={errors.city ? 'border-red-400' : ''}>
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES_LEBANON.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.city && (
                <p className="text-xs text-red-600">{errors.city}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Listing Type *</Label>
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
            <Label htmlFor="address">Full Address (optional)</Label>
            <Input
              id="address"
              placeholder="Street, neighbourhood, etc."
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
            />
          </div>
        </div>

        {/* Pricing & Specs */}
        <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-[#181411]">
            Pricing & Specs
          </h3>

          <div className="space-y-1.5">
            <Label htmlFor="price">
              Price (USD) * {form.listingType === 'rent' && '- per month'}
            </Label>
            <Input
              id="price"
              type="number"
              placeholder="e.g. 250000"
              value={form.price}
              onChange={(e) => setField('price', e.target.value)}
              error={errors.price}
              min={0}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                placeholder="0"
                value={form.bedrooms}
                onChange={(e) => setField('bedrooms', e.target.value)}
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                placeholder="0"
                value={form.bathrooms}
                onChange={(e) => setField('bathrooms', e.target.value)}
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="area">Area (sq m)</Label>
              <Input
                id="area"
                type="number"
                placeholder="0"
                value={form.areaSqM}
                onChange={(e) => setField('areaSqM', e.target.value)}
                min={0}
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-[#181411]">
            Description
          </h3>
          <div className="space-y-1.5">
            <Label htmlFor="description">Property Description *</Label>
            <textarea
              id="description"
              rows={6}
              placeholder="Describe the property in detail - location, features, nearby amenities..."
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              className={`flex w-full rounded-lg border bg-white px-3 py-2 text-sm text-[#181411] placeholder:text-[#8b8178] focus:outline-none focus:ring-2 transition-colors resize-none ${
                errors.description
                  ? 'border-red-400 focus:ring-red-400/30 focus:border-red-400'
                  : 'border-[rgba(34,24,18,0.14)] focus:ring-[#fa6b05]/30 focus:border-[#fa6b05]'
              }`}
            />
            {errors.description && (
              <p className="text-xs text-red-600">{errors.description}</p>
            )}
          </div>
        </div>

        {/* Photos */}
        <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-[#181411]">
              Photos
            </h3>
            <span className="text-xs text-[#8b8178]">
              {imageUrls.filter((u) => u.trim()).length} / {planLimit.maxImages}{' '}
              max
            </span>
          </div>

          {errors.images && (
            <p className="text-xs text-red-600">{errors.images}</p>
          )}

          <div className="space-y-2">
            {imageUrls.map((url, idx) => (
              <div key={url || String(idx)} className="flex gap-2">
                <Input
                  placeholder={`Image URL ${idx + 1} (e.g. https://picsum.photos/seed/${idx}/800/600)`}
                  value={url}
                  onChange={(e) => updateImageUrl(idx, e.target.value)}
                  className="flex-1"
                />
                {imageUrls.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeImageField(idx)}
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
              onClick={addImageField}
              className="gap-2"
            >
              <IconCirclePlus className="h-4 w-4" />
              Add Image URL
            </Button>
          )}

          {imageUrls.length >= planLimit.maxImages && (
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <IconAlertTriangle className="h-3.5 w-3.5" />
              Maximum images reached for your plan.{' '}
              <a href="/pricing" className="underline">
                Upgrade
              </a>{' '}
              for more.
            </div>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full gap-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Submitting...
            </span>
          ) : (
            <>
              <IconCirclePlus className="h-4 w-4" />
              Submit Listing for Review
            </>
          )}
        </Button>
      </form>
    </div>
  )
}




