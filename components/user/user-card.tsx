import { IconBuilding, IconMail } from '@tabler/icons-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn, getInitials, truncate } from '@/lib/utils'
import type { User } from '@/types'

interface UserCardProps {
  user: User
  propertyCount?: number
  className?: string
}

const planStyles = {
  free: 'bg-[#faf7eb] border-[rgba(34,24,18,0.12)] text-[#8b8178]',
  pro: 'bg-[#fef0e6] border-[#fa6b05]/25 text-[#964003]',
  agency: 'bg-[#ecf8f5] border-[#379579]/25 text-[#1c4a3c]',
}

export function UserCard({ user, propertyCount, className }: UserCardProps) {
  return (
    <Link
      href={`/users/${user.id}`}
      className={cn(
        'group flex flex-col rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] p-5 transition-all duration-300',
        'hover:border-[rgba(34,24,18,0.14)] hover:shadow-[0_14px_40px_rgba(24,20,17,0.10)] hover:-translate-y-0.5',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative h-14 w-14 rounded-full overflow-hidden bg-[#fef0e6] shrink-0 ring-2 ring-[#fa6b05]/10 group-hover:ring-[#fa6b05]/30 transition-all">
          {user.profileImage ? (
            <Image
              src={user.profileImage}
              alt={user.name}
              fill
              className="object-cover"
              sizes="56px"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[#fa6b05] font-bold font-display text-lg">
              {getInitials(user.name)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-semibold text-[#181411] truncate group-hover:text-[#fa6b05] transition-colors">
            {user.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
                planStyles[user.plan]
              )}
            >
              {user.plan}
            </span>
            {user.role === 'admin' && (
              <span className="inline-flex items-center rounded-full border border-violet-300 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                admin
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {user.bio && (
        <p className="text-sm text-[#5f554d] leading-relaxed mb-4 line-clamp-2">
          {truncate(user.bio, 120)}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto space-y-2 pt-3 border-t border-[rgba(34,24,18,0.08)]">
        <div className="flex items-center gap-2 text-xs text-[#8b8178]">
          <IconMail className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{user.email}</span>
        </div>
        {propertyCount !== undefined && (
          <div className="flex items-center gap-2 text-xs text-[#8b8178]">
            <IconBuilding className="h-3.5 w-3.5 shrink-0" />
            <span>
              {propertyCount} propert{propertyCount !== 1 ? 'ies' : 'y'} listed
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
