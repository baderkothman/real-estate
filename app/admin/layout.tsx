import {
  IconBuilding,
  IconChartBar,
  IconLayoutDashboard,
  IconShield,
  IconUsers,
} from '@tabler/icons-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserById } from '@/services/user.service'

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: IconLayoutDashboard },
  { href: '/admin/properties', label: 'Properties', icon: IconBuilding },
  { href: '/admin/users', label: 'Users', icon: IconUsers },
  { href: '/admin/analytics', label: 'Analytics', icon: IconChartBar },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/auth/login')

  const profile = await getUserById(authUser.id)
  if (!profile || profile.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen bg-[#fcfaf7]">
      {/* Admin header */}
      <div className="border-b border-[rgba(34,24,18,0.08)] bg-[#faf7eb] py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#fa6b05] flex items-center justify-center shadow-[0_2px_8px_rgba(250,107,5,0.25)]">
                <IconShield className="h-4 w-4 text-white" />
              </div>
              <span className="font-display text-lg font-semibold text-[#181411]">
                Admin Panel
              </span>
            </div>
            <span className="text-xs text-[#8b8178]">
              Signed in as {profile.name}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Admin nav */}
        <nav className="flex flex-wrap gap-1 mb-8 border-b border-[rgba(34,24,18,0.08)] pb-4">
          {adminNavItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[#5f554d] hover:text-[#181411] hover:bg-white hover:shadow-[0_2px_8px_rgba(24,20,17,0.06)] transition-all duration-200"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        {children}
      </div>
    </div>
  )
}
