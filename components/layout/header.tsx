'use client'

import {
  IconChevronDown,
  IconCirclePlus,
  IconLayoutDashboard,
  IconLogout,
  IconSearch,
  IconSettings,
  IconShield,
} from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Button } from '@/components/ui/button'
import { cn, getInitials } from '@/lib/utils'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/properties', label: 'Properties' },
  { href: '/users', label: 'Agents' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
]

export function Header() {
  const { user, supabase } = useSupabase()
  const pathname = usePathname()
  const router = useRouter()
  const [profileOpen, setProfileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSignOut = async () => {
    setProfileOpen(false)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-500',
        scrolled
          ? 'border-b border-[rgba(34,24,18,0.08)] bg-white/98 backdrop-blur-xl shadow-[0_4px_24px_rgba(24,20,17,0.06)]'
          : 'border-b border-transparent bg-[#fcfaf7]/80 backdrop-blur-sm'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[60px] md:h-[68px] items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="shrink-0 rounded-[7px] overflow-hidden shadow-[0_2px_8px_rgba(250,107,5,0.25)] group-hover:shadow-[0_4px_16px_rgba(250,107,5,0.35)] transition-shadow duration-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 32 32"
                width="30"
                height="30"
                aria-hidden="true"
              >
                <rect width="32" height="32" rx="7" fill="#fa6b05" />
                <path d="M16 4.5 L29 16 L3 16 Z" fill="white" />
                <rect
                  x="8"
                  y="14.5"
                  width="16"
                  height="13"
                  rx="1.5"
                  fill="white"
                />
                <path
                  d="M13.5 27.5 L13.5 22 Q13.5 19 16 19 Q18.5 19 18.5 22 L18.5 27.5 Z"
                  fill="#fa6b05"
                />
              </svg>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[1.05rem] font-semibold text-[#fa6b05] tracking-wide">
                Othman
              </span>
              <span className="hidden sm:block font-display text-[1.05rem] font-light text-[#5f554d] tracking-wide">
                Real Estate
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                  pathname === link.href
                    ? 'text-[#fa6b05]'
                    : 'text-[#5f554d] hover:text-[#181411] hover:bg-[#faf7eb]'
                )}
              >
                {link.label}
                {pathname === link.href && (
                  <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-0.5 w-3 rounded-full bg-[#fa6b05]" />
                )}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Mobile search shortcut — visible only on mobile */}
            <Link
              href="/properties"
              className="md:hidden p-2 rounded-xl text-[#5f554d] hover:text-[#181411] hover:bg-[#faf7eb] transition-all duration-200"
              aria-label="Search properties"
            >
              <IconSearch className="h-5 w-5" stroke={1.75} />
            </Link>

            {/* Desktop auth controls */}
            {user ? (
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-sm text-[#181411] hover:bg-[#faf7eb] transition-all duration-200 border border-transparent hover:border-[rgba(34,24,18,0.12)]"
                >
                  <div className="h-7 w-7 rounded-full bg-[#fa6b05] flex items-center justify-center text-white font-bold text-xs overflow-hidden ring-2 ring-[#fa6b05]/20">
                    {user.profileImage ? (
                      // biome-ignore lint/performance/noImgElement: user-supplied URL, domain unknown
                      <img
                        src={user.profileImage}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(user.name)
                    )}
                  </div>
                  <span className="max-w-[100px] truncate font-medium text-[#181411]">
                    {user.name}
                  </span>
                  <IconChevronDown
                    className={cn(
                      'h-3.5 w-3.5 text-[#8b8178] transition-transform duration-200',
                      profileOpen && 'rotate-180'
                    )}
                    stroke={2}
                  />
                </button>

                {profileOpen && (
                  <>
                    <div
                      role="presentation"
                      aria-hidden="true"
                      className="fixed inset-0 z-10"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-[rgba(34,24,18,0.10)] bg-white/98 backdrop-blur-xl shadow-[0_14px_40px_rgba(24,20,17,0.12)] z-20 overflow-hidden animate-scale-in">
                      <div className="px-4 py-3.5 border-b border-[rgba(34,24,18,0.08)] bg-[#faf7eb]">
                        <p className="text-sm font-semibold text-[#181411] truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-[#8b8178] truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>
                      <div className="py-1.5">
                        {user.role === 'admin' && (
                          <Link
                            href="/admin"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#fa6b05] hover:bg-[#fef0e6] transition-colors duration-150"
                          >
                            <IconShield className="h-4 w-4" stroke={1.75} />
                            Admin Dashboard
                          </Link>
                        )}
                        <Link
                          href="/dashboard/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#5f554d] hover:text-[#181411] hover:bg-[#faf7eb] transition-colors duration-150"
                        >
                          <IconLayoutDashboard
                            className="h-4 w-4"
                            stroke={1.75}
                          />
                          My Dashboard
                        </Link>
                        <Link
                          href="/dashboard/properties/create"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#5f554d] hover:text-[#181411] hover:bg-[#faf7eb] transition-colors duration-150"
                        >
                          <IconCirclePlus className="h-4 w-4" stroke={1.75} />
                          Create Listing
                        </Link>
                        <Link
                          href="/dashboard/profile/edit"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#5f554d] hover:text-[#181411] hover:bg-[#faf7eb] transition-colors duration-150"
                        >
                          <IconSettings className="h-4 w-4" stroke={1.75} />
                          Settings
                        </Link>
                      </div>
                      <div className="border-t border-[rgba(34,24,18,0.08)] py-1.5">
                        <button
                          type="button"
                          onClick={() => void handleSignOut()}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                        >
                          <IconLogout className="h-4 w-4" stroke={1.75} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth/login">Sign In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/auth/register">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
