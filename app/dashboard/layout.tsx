import { IconUser } from '@tabler/icons-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserById } from '@/services/user.service'

const navItems = [
  { href: '/dashboard/profile', label: 'My Listings' },
  { href: '/dashboard/properties/create', label: 'Create Listing' },
  { href: '/dashboard/profile/edit', label: 'Edit Profile' },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/auth/login')
  }

  const profile = await getUserById(authUser.id)
  if (!profile) redirect('/auth/login')

  return (
    <div className="min-h-screen bg-[#fcfaf7]">
      <div className="border-b border-[rgba(34,24,18,0.08)] bg-[#faf7eb] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#fa6b05] flex items-center justify-center text-white font-bold shadow-[0_2px_8px_rgba(250,107,5,0.25)]">
              <IconUser className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold text-[#181411] tracking-wide">
                Dashboard
              </h1>
              <p className="text-[#8b8178] text-sm">
                Welcome back, {profile.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Nav */}
        <nav className="flex flex-wrap gap-1 mb-8 border-b border-[rgba(34,24,18,0.08)] pb-4">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-4 py-2 rounded-lg text-sm text-[#5f554d] hover:text-[#181411] hover:bg-white hover:shadow-[0_2px_8px_rgba(24,20,17,0.06)] transition-all duration-200"
            >
              {label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  )
}
