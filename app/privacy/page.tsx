import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Learn how Othman Real Estate handles your data and privacy.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#fcfaf7] py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[24px] border border-[rgba(34,24,18,0.08)] bg-white p-8 shadow-[0_6px_20px_rgba(24,20,17,0.06)] md:p-10">
          <h1 className="font-display text-4xl font-semibold text-[#181411] mb-6 tracking-wide">
            Privacy Policy
          </h1>
          <div className="space-y-5 text-sm leading-7 text-[#5f554d]">
            <p>
              Othman Real Estate collects the information you provide when you
              create an account, contact an agent, list a property, or subscribe
              to a paid plan.
            </p>
            <p>
              We use that information to operate the platform, manage your
              account, process billing, respond to support requests, and improve
              the product.
            </p>
            <p>
              We do not sell your personal data. We may share data with service
              providers such as Supabase for authentication and Stripe for
              payments when required to run the service.
            </p>
            <p>
              If you need your account data updated or removed, contact
              privacy@othmanre.com.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
