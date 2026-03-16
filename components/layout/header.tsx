'use client'

import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Settings,
  Shield,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
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
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const user = session?.user

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
        <div className="flex h-[68px] items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-[#fa6b05] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(250,107,5,0.25)] group-hover:shadow-[0_4px_16px_rgba(250,107,5,0.35)] transition-shadow duration-300">
              <span className="font-display text-white text-sm font-bold leading-none">
                O
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[1.1rem] font-semibold text-[#fa6b05] tracking-wide">
                Othman
              </span>
              <span className="hidden sm:block font-display text-[1.1rem] font-light text-[#5f554d] tracking-wide">
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
          <div className="flex items-center gap-2.5">
            {user ? (
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-sm text-[#181411] hover:bg-[#faf7eb] transition-all duration-200 border border-transparent hover:border-[rgba(34,24,18,0.12)]"
                >
                  <div className="h-7 w-7 rounded-full bg-[#fa6b05] flex items-center justify-center text-white font-bold text-xs overflow-hidden ring-2 ring-[#fa6b05]/20">
                    {user.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.profileImage}
                        alt={user.name ?? ''}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(user.name ?? 'U')
                    )}
                  </div>
                  <span className="max-w-[100px] truncate font-medium text-[#181411]">
                    {user.name}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 text-[#8b8178] transition-transform duration-200',
                      profileOpen && 'rotate-180'
                    )}
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
                            <Shield className="h-4 w-4" />
                            Admin Dashboard
                          </Link>
                        )}
                        <Link
                          href="/dashboard/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#5f554d] hover:text-[#181411] hover:bg-[#faf7eb] transition-colors duration-150"
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          My Dashboard
                        </Link>
                        <Link
                          href="/dashboard/properties/create"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#5f554d] hover:text-[#181411] hover:bg-[#faf7eb] transition-colors duration-150"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Create Listing
                        </Link>
                        <Link
                          href="/dashboard/profile/edit"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#5f554d] hover:text-[#181411] hover:bg-[#faf7eb] transition-colors duration-150"
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>
                      </div>
                      <div className="border-t border-[rgba(34,24,18,0.08)] py-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false)
                            void signOut({ callbackUrl: '/' })
                          }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                        >
                          <LogOut className="h-4 w-4" />
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

            {/* Mobile Toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-xl text-[#5f554d] hover:text-[#181411] hover:bg-[#faf7eb] transition-all duration-200"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu — smooth height transition */}
      <div
        className={cn(
          'md:hidden overflow-hidden transition-all duration-300',
          mobileOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="border-t border-[rgba(34,24,18,0.08)] bg-white/98 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'block px-4 py-3 text-sm font-medium rounded-xl transition-colors duration-150',
                  pathname === link.href
                    ? 'text-[#fa6b05] bg-[#fef0e6]'
                    : 'text-[#5f554d] hover:text-[#181411] hover:bg-[#faf7eb]'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="px-4 pb-5 pt-3 border-t border-[rgba(34,24,18,0.08)]">
            {user ? (
              <div className="space-y-0.5">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#faf7eb] mb-3">
                  <div className="h-9 w-9 rounded-full bg-[#fa6b05] flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
                    {user.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.profileImage}
                        alt={user.name ?? ''}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(user.name ?? 'U')
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#181411] truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-[#8b8178] truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#fa6b05] rounded-xl hover:bg-[#fef0e6] transition-colors"
                  >
                    <Shield className="h-4 w-4" /> Admin Dashboard
                  </Link>
                )}
                <Link
                  href="/dashboard/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#5f554d] rounded-xl hover:bg-[#faf7eb] hover:text-[#181411] transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" /> My Dashboard
                </Link>
                <Link
                  href="/dashboard/properties/create"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#5f554d] rounded-xl hover:bg-[#faf7eb] hover:text-[#181411] transition-colors"
                >
                  <PlusCircle className="h-4 w-4" /> Create Listing
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false)
                    void signOut({ callbackUrl: '/' })
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button variant="secondary" asChild className="w-full">
                  <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button asChild className="w-full">
                  <Link
                    href="/auth/register"
                    onClick={() => setMobileOpen(false)}
                  >
                    Get Started
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
