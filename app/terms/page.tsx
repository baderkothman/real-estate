import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions for using Othman Real Estate.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#fcfaf7] py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[24px] border border-[rgba(34,24,18,0.08)] bg-white p-8 shadow-[0_6px_20px_rgba(24,20,17,0.06)] md:p-10">
          <h1 className="font-display text-4xl font-semibold text-[#181411] mb-6 tracking-wide">
            Terms of Service
          </h1>
          <div className="space-y-5 text-sm leading-7 text-[#5f554d]">
            <p>
              By using Othman Real Estate, you agree to provide accurate account
              and listing information and to use the platform in compliance with
              applicable laws.
            </p>
            <p>
              You are responsible for the content you publish, including
              property details, pricing, and media. We may review, reject, or
              remove listings that violate platform rules.
            </p>
            <p>
              Paid plans and billing are processed by third-party providers.
              Subscription fees, renewals, and cancellations are subject to the
              terms shown during checkout.
            </p>
            <p>
              Questions about these terms can be sent to
              support@othmanre.com.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
