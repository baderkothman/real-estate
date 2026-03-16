import { Home, Search } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="font-display text-[120px] font-bold leading-none text-[#fa6b05]/15 select-none">
          404
        </div>
        <h1 className="font-display text-3xl font-semibold text-[#181411] -mt-4 mb-4">
          Page Not Found
        </h1>
        <p className="text-[#5f554d] mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or may have been
          moved. Let&apos;s get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link href="/" className="gap-2">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button variant="secondary" asChild size="lg">
            <Link href="/properties" className="gap-2">
              <Search className="h-4 w-4" />
              Browse Properties
            </Link>
          </Button>
        </div>

        {/* Decorative */}
        <div className="mt-16 text-[#8b8178] text-sm font-display italic">
          &ldquo;Every door unlocked is a new beginning.&rdquo;
        </div>
      </div>
    </div>
  )
}
