import { Award, Building2, Heart, MapPin, Shield, Users } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'About Us',
  description:
    "Learn about Othman Real Estate — Lebanon's premier property marketplace.",
}

const teamMembers = [
  {
    id: 1,
    name: 'Omar Othman',
    title: 'Founder & CEO',
    image: 'https://randomuser.me/api/portraits/men/1.jpg',
    bio: 'With over 20 years in the Lebanese real estate market, Omar founded Othman Real Estate with a vision to bring transparency and technology to property transactions in Lebanon.',
  },
  {
    id: 2,
    name: 'Rima Nassar',
    title: 'Head of Operations',
    image: 'https://randomuser.me/api/portraits/women/4.jpg',
    bio: 'Trilingual property expert with 15 years of experience across Beirut, the North, and the Bekaa Valley. Rima ensures every listing on our platform meets our quality standards.',
  },
  {
    id: 3,
    name: 'Ziad Mansour',
    title: 'Head of Technology',
    image: 'https://randomuser.me/api/portraits/men/5.jpg',
    bio: 'Tech entrepreneur and real estate enthusiast. Ziad leads the digital platform, ensuring a seamless experience for buyers, sellers, and renters across Lebanon.',
  },
]

const values = [
  {
    icon: Shield,
    title: 'Trust & Transparency',
    description:
      'Every property listing is verified by our team. We maintain strict standards to ensure honest, accurate information for our users.',
  },
  {
    icon: Award,
    title: 'Excellence',
    description:
      "We are committed to showcasing Lebanon's finest properties with the presentation they deserve — beautiful photography and detailed descriptions.",
  },
  {
    icon: Heart,
    title: 'Community',
    description:
      'Real estate in Lebanon is personal. We connect people, not just properties — building relationships that last beyond the transaction.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-24 bg-[#fcfaf7] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#fef3e7_0%,_#fcfaf7_70%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#fa6b05]/20 bg-[#fef0e6] px-4 py-1.5 mb-8">
            <MapPin className="h-3.5 w-3.5 text-[#fa6b05]" />
            <span className="text-xs font-medium text-[#964003] tracking-widest uppercase">
              Est. 2022 — Beirut, Lebanon
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-semibold text-[#181411] mb-6 tracking-wide">
            About Othman Real Estate
          </h1>
          <p className="text-[#5f554d] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            We are Lebanon&apos;s most trusted real estate marketplace,
            connecting discerning buyers, sellers, and renters with exceptional
            properties across the country.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 bg-[#faf7eb]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="h-0.5 w-12 bg-[#fa6b05] mb-6" />
              <h2 className="font-display text-4xl font-semibold text-[#181411] mb-6 tracking-wide">
                Our Mission
              </h2>
              <div className="space-y-4 text-[#5f554d] leading-relaxed">
                <p>
                  At Othman Real Estate, we believe that finding the right
                  property should be a journey of discovery, not a frustrating
                  maze of unreliable listings and unresponsive agents. We built
                  this platform to change that.
                </p>
                <p>
                  Lebanon is a land of extraordinary beauty and character — from
                  the snow-capped peaks of the Mount Lebanon range to the
                  ancient Phoenician harbours of Byblos and Tyre. Every property
                  here has a story, and we are passionate about telling it.
                </p>
                <p>
                  Our mission is to create the most trustworthy, transparent,
                  and elegant real estate marketplace in Lebanon — one that
                  honours the sophistication of Lebanese property and the
                  intelligence of Lebanese buyers.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '500+', label: 'Active Listings', icon: Building2 },
                { value: '200+', label: 'Happy Clients', icon: Users },
                { value: '15+', label: 'Cities Covered', icon: MapPin },
                { value: '4 Yrs', label: 'In the Market', icon: Award },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6 text-center hover:border-[rgba(34,24,18,0.14)] hover:shadow-[0_14px_40px_rgba(24,20,17,0.10)] transition-all duration-300"
                >
                  <stat.icon className="h-6 w-6 text-[#fa6b05] mx-auto mb-3" />
                  <div className="font-display text-3xl font-bold text-[#fa6b05] mb-1">
                    {stat.value}
                  </div>
                  <div className="text-xs text-[#8b8178]">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-[#fcfaf7]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl font-semibold text-[#181411] mb-4 tracking-wide">
              Our Values
            </h2>
            <div className="h-0.5 w-12 bg-[#fa6b05] mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-8 hover:border-[rgba(34,24,18,0.14)] hover:shadow-[0_14px_40px_rgba(24,20,17,0.10)] transition-all duration-300"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#fef0e6] border border-[#fa6b05]/20">
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

      {/* Team */}
      <section className="py-20 bg-[#faf7eb]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl font-semibold text-[#181411] mb-4 tracking-wide">
              Meet the Team
            </h2>
            <p className="text-[#5f554d] max-w-xl mx-auto">
              Passionate Lebanese professionals dedicated to transforming real
              estate in Lebanon.
            </p>
            <div className="h-0.5 w-12 bg-[#fa6b05] mx-auto mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-8 text-center hover:border-[rgba(34,24,18,0.14)] hover:shadow-[0_14px_40px_rgba(24,20,17,0.10)] transition-all duration-300"
              >
                <div className="relative h-20 w-20 rounded-full overflow-hidden mx-auto mb-4 ring-2 ring-[#fa6b05]/20">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
                <h3 className="font-display text-xl font-semibold text-[#181411] mb-1">
                  {member.name}
                </h3>
                <p className="text-sm text-[#fa6b05] mb-4">{member.title}</p>
                <p className="text-sm text-[#5f554d] leading-relaxed">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
