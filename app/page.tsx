import { ArrowRight, Key, MessageCircle, Search, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { HeroSearch } from '@/components/common/hero-search'
import { SectionHeader } from '@/components/common/section-header'
import { PropertyCard } from '@/components/property/property-card'
import { Button } from '@/components/ui/button'
import { testimonials } from '@/data/testimonials'
import {
  getFeaturedProperties,
  getLatestProperties,
} from '@/services/property.service'

export default async function HomePage() {
  const [featured, latest] = await Promise.all([
    getFeaturedProperties(6),
    getLatestProperties(8),
  ])

  return (
    <div>
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-[#fcfaf7]">
        {/* Warm radial gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#fef3e7_0%,_#fcfaf7_65%)]" />
        {/* Subtle texture */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, #fa6b05 0, #fa6b05 1px, transparent 0, transparent 50%)`,
            backgroundSize: '24px 24px',
          }}
        />
        {/* Ambient glow blobs */}
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#fa6b05]/[0.06] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-[#379579]/[0.05] rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-24">
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#fa6b05]/20 bg-[#fef0e6] px-4 py-1.5 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-[#fa6b05]" />
              <span className="text-xs font-medium text-[#964003] tracking-widest uppercase">
                Lebanon&apos;s Premier Real Estate
              </span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-semibold text-[#181411] leading-[1.05] tracking-tight mb-6">
              Find Your{' '}
              <span className="text-gradient-brand italic">Perfect</span>
              <br />
              Property in Lebanon
            </h1>

            <p className="text-[#5f554d] text-lg md:text-xl leading-relaxed mb-10 max-w-xl">
              From the shores of Byblos to the heights of Faraya — discover
              exceptional homes, apartments, and commercial spaces across
              Lebanon&apos;s most coveted addresses.
            </p>

            {/* Search bar */}
            <HeroSearch />

            {/* Quick filters */}
            <div className="flex flex-wrap gap-2 mt-4">
              {['Beirut', 'Jounieh', 'Byblos', 'Tripoli', 'Batroun'].map(
                (city) => (
                  <Link
                    key={city}
                    href={`/properties?city=${city}`}
                    className="px-3 py-1 rounded-full bg-white border border-[rgba(34,24,18,0.10)] text-xs text-[#8b8178] hover:border-[#fa6b05]/30 hover:text-[#fa6b05] transition-colors shadow-[0_1px_4px_rgba(24,20,17,0.06)]"
                  >
                    {city}
                  </Link>
                )
              )}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-[rgba(34,24,18,0.08)] bg-white/70 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
            <div className="grid grid-cols-3 gap-6 sm:gap-12">
              {[
                { value: '500+', label: 'Properties Listed' },
                { value: '200+', label: 'Happy Clients' },
                { value: '15+', label: 'Lebanese Cities' },
              ].map((stat) => (
                <div key={stat.label} className="text-center sm:text-left">
                  <div className="font-display text-2xl sm:text-3xl font-bold text-[#fa6b05]">
                    {stat.value}
                  </div>
                  <div className="text-xs text-[#8b8178] mt-0.5">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Properties ─────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="py-20 bg-[#fcfaf7]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader
              title="Featured Properties"
              subtitle="Hand-picked premium listings from our most trusted agents and developers."
              viewAllHref="/properties?featured=1"
              className="mb-10"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Latest Properties ───────────────────────────────────────────────── */}
      <section className="py-20 bg-[#faf7eb]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Latest Listings"
            subtitle="Freshly listed properties across Lebanon, updated daily."
            viewAllHref="/properties"
            className="mb-10"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {latest.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
          <div className="text-center mt-12">
            <Button asChild size="lg" variant="outline">
              <Link href="/properties" className="gap-2">
                Browse All Properties
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#fcfaf7]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="How It Works"
            subtitle="Find or list your perfect property in three simple steps."
            centered
            className="mb-14"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Search,
                step: '01',
                title: 'Browse & Filter',
                description:
                  'Explore hundreds of verified listings across all Lebanese cities. Filter by location, price, type, and size to find exactly what you need.',
              },
              {
                icon: MessageCircle,
                step: '02',
                title: 'Connect Directly',
                description:
                  'Contact property owners and agents directly — no middlemen, no hidden fees. Get real information from real people who know their properties.',
              },
              {
                icon: Key,
                step: '03',
                title: 'Move In',
                description:
                  'Complete your transaction with confidence. Whether buying, renting, or selling, Othman Real Estate is with you every step of the way.',
              },
            ].map(({ icon: Icon, step, title, description }) => (
              <div
                key={step}
                className="relative rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] p-8 hover:border-[rgba(34,24,18,0.14)] hover:shadow-[0_14px_40px_rgba(24,20,17,0.08)] transition-all duration-300"
              >
                {/* Step number */}
                <div className="font-display text-5xl font-bold text-[#fa6b05]/8 absolute top-4 right-5 select-none">
                  {step}
                </div>
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#fef0e6] border border-[#fa6b05]/15">
                  <Icon className="h-6 w-6 text-[#fa6b05]" />
                </div>
                <h3 className="font-display text-xl font-semibold text-[#181411] mb-3">
                  {title}
                </h3>
                <p className="text-sm text-[#5f554d] leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#faf7eb]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="What Our Clients Say"
            subtitle="Real stories from buyers, sellers, and renters across Lebanon."
            centered
            className="mb-14"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.slice(0, 3).map((t) => (
              <div
                key={t.id}
                className="flex flex-col rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] p-6 hover:border-[rgba(34,24,18,0.14)] hover:shadow-[0_14px_40px_rgba(24,20,17,0.08)] transition-all duration-300"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < t.rating ? 'text-[#fa6b05] fill-[#fa6b05]' : 'text-[rgba(34,24,18,0.12)]'}`}
                    />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-sm text-[#5f554d] leading-relaxed flex-1 mb-6 italic font-display text-base">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-3 border-t border-[rgba(34,24,18,0.08)] pt-4">
                  <div className="relative h-10 w-10 rounded-full overflow-hidden shrink-0">
                    <Image
                      src={t.avatar}
                      alt={t.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#181411]">
                      {t.name}
                    </div>
                    <div className="text-xs text-[#8b8178]">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#14110f]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-[24px] bg-[#211c18] border border-white/5 overflow-hidden px-8 py-16 text-center">
            {/* Background decoration */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#fa6b05]/8 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-4xl md:text-5xl font-semibold text-[#fdfaf7] mb-4 tracking-wide">
                Ready to List Your Property?
              </h2>
              <p className="text-[#a09070] text-lg mb-8 max-w-xl mx-auto">
                Join hundreds of owners and agents on Lebanon&apos;s leading
                real estate platform. Start with a free account — no credit card
                required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="xl">
                  <Link href="/auth/register">
                    Create Free Account
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="secondary" asChild size="xl">
                  <Link href="/pricing">View Pricing Plans</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
