import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconMail,
  IconMapPin,
  IconPhone,
} from '@tabler/icons-react'
import Link from 'next/link'

// WhatsApp icon (lucide doesn't include it)
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-label="WhatsApp"
      role="img"
    >
      <title>WhatsApp</title>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export function Footer() {
  return (
    <footer className="relative border-t border-[rgba(34,24,18,0.08)] bg-[#faf7eb] overflow-hidden">
      {/* Top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#fa6b05]/20 to-transparent" />
      {/* Ambient glow */}
      <div className="absolute bottom-0 right-0 w-96 h-72 bg-[#fa6b05]/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand column */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center gap-3">
              <div className="rounded-[7px] overflow-hidden shadow-[0_2px_12px_rgba(250,107,5,0.25)] shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 32 32"
                  width="36"
                  height="36"
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
              <div>
                <span className="font-display text-2xl font-semibold text-[#fa6b05] tracking-wide">
                  Othman
                </span>
                <span className="font-display text-2xl font-light text-[#5f554d] tracking-wide ml-2">
                  Real Estate
                </span>
              </div>
            </div>

            <p className="text-[#8b8178] text-sm leading-relaxed max-w-sm">
              Lebanon&apos;s premier real estate marketplace. Connecting buyers,
              sellers, and renters with exceptional properties - from the cedar
              mountains to the Mediterranean coast.
            </p>

            {/* Contact info */}
            <div className="space-y-2.5">
              {[
                { Icon: IconMapPin, text: 'Hamra Street, Beirut, Lebanon' },
                { Icon: IconPhone, text: '+961 1 234 567' },
                { Icon: IconMail, text: 'hello@othmanre.com' },
              ].map(({ Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-2.5 text-xs text-[#8b8178]"
                >
                  <Icon className="h-3.5 w-3.5 text-[#fa6b05]/50 shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {/* Socials */}
            <div className="flex items-center gap-2 pt-1">
              {[
                {
                  href: 'https://instagram.com',
                  Icon: IconBrandInstagram,
                  label: 'Instagram',
                },
                {
                  href: 'https://facebook.com',
                  Icon: IconBrandFacebook,
                  label: 'Facebook',
                },
                {
                  href: 'https://wa.me/96100000000',
                  Icon: WhatsAppIcon,
                  label: 'WhatsApp',
                },
                {
                  href: 'https://linkedin.com',
                  Icon: IconBrandLinkedin,
                  label: 'LinkedIn',
                },
              ].map(({ href, Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="p-2.5 rounded-xl bg-white border border-[rgba(34,24,18,0.10)] text-[#8b8178] hover:text-[#fa6b05] hover:border-[#fa6b05]/25 hover:bg-[#fef0e6] transition-all duration-200"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div className="space-y-5">
            <h3 className="font-display text-[10px] font-semibold text-[#181411] uppercase tracking-[0.18em]">
              Explore
            </h3>
            <ul className="space-y-3">
              {[
                { href: '/properties', label: 'Browse Properties' },
                { href: '/properties?listingType=sale', label: 'For Sale' },
                { href: '/properties?listingType=rent', label: 'For Rent' },
                { href: '/users', label: 'Agents & Owners' },
                { href: '/about', label: 'About Us' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 text-sm text-[#8b8178] hover:text-[#fa6b05] transition-colors duration-200"
                  >
                    <span className="h-px w-0 bg-[#fa6b05]/50 transition-all duration-300 group-hover:w-3 shrink-0" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div className="space-y-5">
            <h3 className="font-display text-[10px] font-semibold text-[#181411] uppercase tracking-[0.18em]">
              Account
            </h3>
            <ul className="space-y-3">
              {[
                { href: '/pricing', label: 'Pricing Plans' },
                { href: '/auth/register', label: 'Create Account' },
                { href: '/auth/login', label: 'Sign In' },
                { href: '/dashboard/profile', label: 'My Dashboard' },
                {
                  href: '/dashboard/properties/create',
                  label: 'List a Property',
                },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 text-sm text-[#8b8178] hover:text-[#fa6b05] transition-colors duration-200"
                  >
                    <span className="h-px w-0 bg-[#fa6b05]/50 transition-all duration-300 group-hover:w-3 shrink-0" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-[rgba(34,24,18,0.08)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#8b8178]">
            &copy; {new Date().getFullYear()} Othman Real Estate. All rights
            reserved.
          </p>
          <div className="flex items-center gap-5">
            <Link
              href="/privacy"
              className="text-xs text-[#8b8178] hover:text-[#5f554d] transition-colors duration-200"
            >
              Privacy Policy
            </Link>
            <span className="text-[rgba(34,24,18,0.20)] text-xs">&middot;</span>
            <Link
              href="/terms"
              className="text-xs text-[#8b8178] hover:text-[#5f554d] transition-colors duration-200"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}


