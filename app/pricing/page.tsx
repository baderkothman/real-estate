'use client'

import {
  IconBolt,
  IconBuilding,
  IconCheck,
  IconStar,
} from '@tabler/icons-react'
import Link from 'next/link'
import { useState } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Button } from '@/components/ui/button'
import { PLAN_FEATURES, PLAN_PRICES } from '@/lib/constants'
import { cn } from '@/lib/utils'

type Billing = 'month' | 'quarter' | 'year'

const billingLabels: Record<Billing, string> = {
  month: 'Monthly',
  quarter: 'Quarterly',
  year: 'Yearly',
}

const billingDiscount: Record<Billing, string | null> = {
  month: null,
  quarter: 'Save 33%',
  year: 'Save 17%',
}

export default function PricingPage() {
  const { user } = useSupabase()
  const [billing, setBilling] = useState<Billing>('month')

  const handleCheckout = async (plan: 'pro' | 'agency') => {
    if (!user) {
      window.location.href = '/auth/login?callbackUrl=/pricing'
      return
    }

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billing }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(
          data.error ??
            'Checkout unavailable in demo mode. Configure Stripe keys to enable.'
        )
      }
    } catch {
      alert('Checkout unavailable in demo mode.')
    }
  }

  const plans = [
    {
      id: 'free' as const,
      name: 'Free',
      icon: IconStar,
      description: 'Perfect for individual owners listing a few properties.',
      price: 0,
      priceLabel: 'Free forever',
      features: PLAN_FEATURES.free,
      cta: 'Get Started',
      href: '/auth/register',
      highlighted: false,
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      icon: IconBolt,
      description: 'For active agents managing multiple listings and leads.',
      price: PLAN_PRICES.pro[billing],
      priceLabel: null,
      features: PLAN_FEATURES.pro,
      cta: 'Upgrade to Pro',
      href: null,
      highlighted: true,
    },
    {
      id: 'agency' as const,
      name: 'Agency',
      icon: IconBuilding,
      description: 'For agencies and developers with large portfolios.',
      price: PLAN_PRICES.agency[billing],
      priceLabel: null,
      features: PLAN_FEATURES.agency,
      cta: 'Upgrade to Agency',
      href: null,
      highlighted: false,
    },
  ]

  return (
    <div className="min-h-screen bg-[#fcfaf7]">
      {/* Header */}
      <section className="py-20 text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-[#fa6b05]/70" />
            <span className="text-[10px] font-semibold text-[#fa6b05] uppercase tracking-[0.2em]">
              Plans
            </span>
            <span className="h-px w-6 bg-gradient-to-l from-transparent to-[#fa6b05]/70" />
          </div>
          <h1 className="font-display text-5xl font-semibold text-[#181411] mb-4 tracking-wide">
            Simple, Transparent Pricing
          </h1>
          <p className="text-[#5f554d] text-lg max-w-xl mx-auto mb-10">
            Start free, upgrade when you need more. No contracts, cancel
            anytime.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center rounded-xl bg-white border border-[rgba(34,24,18,0.10)] shadow-[0_2px_8px_rgba(24,20,17,0.06)] p-1">
            {(['month', 'quarter', 'year'] as Billing[]).map((b) => (
              <button
                type="button"
                key={b}
                onClick={() => setBilling(b)}
                className={cn(
                  'relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                  billing === b
                    ? 'bg-[#fa6b05] text-white font-semibold shadow-[0_2px_8px_rgba(250,107,5,0.25)]'
                    : 'text-[#8b8178] hover:text-[#181411]'
                )}
              >
                {billingLabels[b]}
                {billingDiscount[b] && (
                  <span
                    className={cn(
                      'absolute -top-2 -right-1 text-[9px] font-bold px-1 py-0.5 rounded-full',
                      billing === b
                        ? 'bg-[#964003] text-white'
                        : 'bg-[#fef0e6] text-[#fa6b05]'
                    )}
                  >
                    {billingDiscount[b]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = user?.plan === plan.id
              const Icon = plan.icon
              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative rounded-[20px] border p-8 flex flex-col transition-all duration-300',
                    plan.highlighted
                      ? 'bg-white border-[#fa6b05]/30 shadow-[0_14px_40px_rgba(250,107,5,0.12)]'
                      : 'bg-white border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] hover:border-[rgba(34,24,18,0.14)] hover:shadow-[0_14px_40px_rgba(24,20,17,0.10)]'
                  )}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-[#fa6b05] text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-[0_2px_8px_rgba(250,107,5,0.30)]">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-6">
                      <span className="bg-[#379579] text-white text-xs font-bold px-3 py-1 rounded-full">
                        Current Plan
                      </span>
                    </div>
                  )}

                  {/* Icon & Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center',
                        plan.highlighted
                          ? 'bg-[#fa6b05] text-white shadow-[0_2px_8px_rgba(250,107,5,0.25)]'
                          : 'bg-[#fef0e6] text-[#fa6b05]'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="font-display text-2xl font-semibold text-[#181411]">
                      {plan.name}
                    </h2>
                  </div>

                  {/* Price */}
                  <div className="mb-3">
                    {plan.priceLabel ? (
                      <div className="font-mono text-4xl font-bold text-[#181411]">
                        {plan.priceLabel}
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-4xl font-bold text-[#fa6b05]">
                          ${plan.price}
                        </span>
                        <span className="text-[#8b8178] text-sm">
                          /
                          {billing === 'month'
                            ? 'mo'
                            : billing === 'quarter'
                              ? 'qtr'
                              : 'yr'}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-[#5f554d] mb-6 leading-relaxed">
                    {plan.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm text-[#5f554d]"
                      >
                        <IconCheck
                          className={cn(
                            'h-4 w-4 shrink-0 mt-0.5',
                            plan.highlighted
                              ? 'text-[#fa6b05]'
                              : 'text-[#379579]'
                          )}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isCurrentPlan ? (
                    <Button variant="secondary" disabled className="w-full">
                      Current Plan
                    </Button>
                  ) : plan.href ? (
                    <Button
                      asChild
                      className="w-full"
                      variant={plan.highlighted ? 'default' : 'outline'}
                    >
                      <Link href={plan.href}>{plan.cta}</Link>
                    </Button>
                  ) : (
                    <Button
                      onClick={() =>
                        void handleCheckout(plan.id as 'pro' | 'agency')
                      }
                      className="w-full"
                      variant={plan.highlighted ? 'default' : 'outline'}
                    >
                      {plan.cta}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Feature comparison */}
      <section className="pb-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-[#181411] text-center mb-10 tracking-wide">
            Compare Plans
          </h2>

          <div className="rounded-[20px] border border-[rgba(34,24,18,0.08)] bg-white shadow-[0_6px_20px_rgba(24,20,17,0.06)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(34,24,18,0.08)] bg-[#faf7eb]">
                  <th className="text-left p-4 text-sm text-[#8b8178] font-normal">
                    Feature
                  </th>
                  {['Free', 'Pro', 'Agency'].map((p) => (
                    <th
                      key={p}
                      className="p-4 text-sm font-semibold text-[#181411] text-center"
                    >
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Max Listings', '3', '12', '100'],
                  ['Photos per Listing', '5', '8', '20'],
                  ['Featured Listings', '✗', '✓', 'Unlimited'],
                  ['Analytics Dashboard', '✗', '✓', '✓'],
                  ['Priority Support', '✗', '✓', '✓'],
                  ['Dedicated Manager', '✗', '✗', '✓'],
                  ['API Access', '✗', '✗', '✓'],
                ].map(([feature, free, pro, agency], idx) => (
                  <tr
                    key={feature}
                    className={cn(
                      'border-b border-[rgba(34,24,18,0.05)]',
                      idx % 2 === 1 && 'bg-[#faf7eb]/50'
                    )}
                  >
                    <td className="p-4 text-sm text-[#5f554d]">{feature}</td>
                    {[free, pro, agency].map((val, i) => (
                      <td key={i} className="p-4 text-sm text-center">
                        {val === '✓' ? (
                          <IconCheck className="h-4 w-4 text-[#379579] mx-auto" />
                        ) : val === '✗' ? (
                          <span className="text-[#8b8178]">—</span>
                        ) : (
                          <span className="text-[#fa6b05] font-medium">
                            {val}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
