'use client'

import {
  IconChevronLeft,
  IconChevronRight,
  IconPhoto,
} from '@tabler/icons-react'
import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface PropertyGalleryProps {
  images: string[]
  title: string
}

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  const validImages =
    images.length > 0 ? images : [`https://picsum.photos/seed/fallback/800/600`]

  const prev = () =>
    setActiveIndex((i) => (i === 0 ? validImages.length - 1 : i - 1))
  const next = () =>
    setActiveIndex((i) => (i === validImages.length - 1 ? 0 : i + 1))

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-[#faf7eb]">
        <Image
          src={validImages[activeIndex]}
          alt={`${title} — image ${activeIndex + 1}`}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 66vw"
        />

        {/* Navigation arrows */}
        {validImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 text-[#181411] hover:bg-white backdrop-blur-sm transition-colors shadow-[0_2px_8px_rgba(24,20,17,0.15)]"
              aria-label="Previous image"
            >
              <IconChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 text-[#181411] hover:bg-white backdrop-blur-sm transition-colors shadow-[0_2px_8px_rgba(24,20,17,0.15)]"
              aria-label="Next image"
            >
              <IconChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Counter */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm text-xs text-[#181411] shadow-[0_2px_8px_rgba(24,20,17,0.10)]">
          <IconPhoto className="h-3.5 w-3.5 text-[#fa6b05]" />
          {activeIndex + 1} / {validImages.length}
        </div>
      </div>

      {/* Thumbnails */}
      {validImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {validImages.map((img, idx) => (
            <button
              type="button"
              key={img || String(idx)}
              onClick={() => setActiveIndex(idx)}
              className={cn(
                'relative h-16 w-24 shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200',
                idx === activeIndex
                  ? 'border-[#fa6b05] opacity-100 shadow-[0_2px_8px_rgba(250,107,5,0.25)]'
                  : 'border-transparent opacity-60 hover:opacity-80 hover:border-[#fa6b05]/40'
              )}
              aria-label={`View image ${idx + 1}`}
            >
              <Image
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                fill
                className="object-cover"
                sizes="96px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
