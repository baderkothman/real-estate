'use client'

import {
  IconCirclePlus,
  IconCompass,
  IconHome,
  IconUser,
  IconUsers,
} from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSupabase } from '@/components/providers/supabase-provider'
import { cn } from '@/lib/utils'

const baseItems = [
  {
    href: '/',
    label: 'Home',
    icon: IconHome,
    exact: true,
  },
  {
    href: '/properties',
    label: 'Explore',
    icon: IconCompass,
    exact: false,
  },
]

const rightItems = [
  {
    href: '/users',
    label: 'Agents',
    icon: IconUsers,
    exact: false,
  },
]

export function MobileNav() {
  const pathname = usePathname()
  const { user } = useSupabase()

  const profileHref = user ? '/dashboard/profile' : '/auth/login'
  const createHref = user ? '/dashboard/properties/create' : '/auth/register'

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const profileActive =
    pathname.startsWith('/dashboard') || pathname.startsWith('/auth')

  return (
    <nav
      className={cn(
        'fixed bottom-0 inset-x-0 z-50 md:hidden',
        'bg-white/95 backdrop-blur-xl',
        'border-t border-[rgba(34,24,18,0.08)]',
        'shadow-[0_-4px_24px_rgba(24,20,17,0.08)]',
        'safe-bottom'
      )}
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-[60px] px-2">
        {/* Home */}
        {baseItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 group"
            aria-label={label}
          >
            <Icon
              className={cn(
                'h-6 w-6 transition-all duration-200',
                isActive(href, exact)
                  ? 'text-[#fa6b05] scale-110'
                  : 'text-[#8b8178] group-hover:text-[#5f554d] group-hover:scale-105'
              )}
              stroke={isActive(href, exact) ? 2 : 1.75}
            />
            <span
              className={cn(
                'text-[9px] font-semibold tracking-wide transition-colors duration-200',
                isActive(href, exact) ? 'text-[#fa6b05]' : 'text-[#8b8178]'
              )}
            >
              {label}
            </span>
            {isActive(href, exact) && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-[#fa6b05]" />
            )}
          </Link>
        ))}

        {/* Create — elevated center button */}
        <Link
          href={createHref}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 -mt-4 group"
          aria-label="Create listing"
        >
          <div
            className={cn(
              'h-12 w-12 rounded-full flex items-center justify-center',
              'bg-[#fa6b05] shadow-[0_4px_16px_rgba(250,107,5,0.40)]',
              'transition-all duration-200',
              'group-hover:bg-[#c85604] group-hover:shadow-[0_6px_20px_rgba(250,107,5,0.50)] group-hover:scale-105',
              'group-active:scale-95',
              pathname === createHref &&
                'ring-2 ring-[#fa6b05]/30 ring-offset-2'
            )}
          >
            <IconCirclePlus className="h-6 w-6 text-white" stroke={2} />
          </div>
          <span className="text-[9px] font-semibold tracking-wide text-[#8b8178] mt-1">
            List
          </span>
        </Link>

        {/* Agents */}
        {rightItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 relative group"
            aria-label={label}
          >
            <Icon
              className={cn(
                'h-6 w-6 transition-all duration-200',
                isActive(href, exact)
                  ? 'text-[#fa6b05] scale-110'
                  : 'text-[#8b8178] group-hover:text-[#5f554d] group-hover:scale-105'
              )}
              stroke={isActive(href, exact) ? 2 : 1.75}
            />
            <span
              className={cn(
                'text-[9px] font-semibold tracking-wide transition-colors duration-200',
                isActive(href, exact) ? 'text-[#fa6b05]' : 'text-[#8b8178]'
              )}
            >
              {label}
            </span>
            {isActive(href, exact) && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-[#fa6b05]" />
            )}
          </Link>
        ))}

        {/* Profile */}
        <Link
          href={profileHref}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 relative group"
          aria-label={user ? 'My Profile' : 'Sign In'}
        >
          {user?.profileImage ? (
            // biome-ignore lint/performance/noImgElement: user avatar, domain unknown
            <img
              src={user.profileImage}
              alt={user.name}
              className={cn(
                'h-6 w-6 rounded-full object-cover transition-all duration-200',
                profileActive
                  ? 'ring-2 ring-[#fa6b05] scale-110'
                  : 'group-hover:scale-105'
              )}
            />
          ) : (
            <div
              className={cn(
                'h-6 w-6 rounded-full transition-all duration-200 flex items-center justify-center',
                profileActive
                  ? 'bg-[#fa6b05] text-white scale-110'
                  : 'bg-[#faf7eb] group-hover:scale-105'
              )}
            >
              {user ? (
                <span className="text-[9px] font-bold text-[#fa6b05]">
                  {user.name[0]?.toUpperCase()}
                </span>
              ) : (
                <IconUser
                  className={cn(
                    'h-4 w-4',
                    profileActive ? 'text-white' : 'text-[#8b8178]'
                  )}
                  stroke={1.75}
                />
              )}
            </div>
          )}
          <span
            className={cn(
              'text-[9px] font-semibold tracking-wide transition-colors duration-200',
              profileActive ? 'text-[#fa6b05]' : 'text-[#8b8178]'
            )}
          >
            {user ? 'Me' : 'Sign In'}
          </span>
          {profileActive && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-[#fa6b05]" />
          )}
        </Link>
      </div>
    </nav>
  )
}
