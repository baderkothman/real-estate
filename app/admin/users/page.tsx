'use client'

import {
  IconBan,
  IconChevronLeft,
  IconChevronRight,
  IconCircleCheck,
} from '@tabler/icons-react'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatDate } from '@/lib/utils'
import type { PaginatedResult, User } from '@/types'

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<PaginatedResult<User> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        ...(search ? { search } : {}),
        ...(planFilter !== 'all' ? { plan: planFilter } : {}),
      })
      const res = await fetch(`/api/users?${params.toString()}&admin=1`)
      const data = (await res.json()) as PaginatedResult<User>
      setResult(data)
    } finally {
      setIsLoading(false)
    }
  }, [search, planFilter, page])

  useEffect(() => {
    const timer = setTimeout(() => void fetchUsers(), 300)
    return () => clearTimeout(timer)
  }, [fetchUsers])

  const adminAction = async (
    userId: string,
    action: string,
    extra?: object
  ) => {
    setActionLoading(userId + action)
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      await fetchUsers()
    } finally {
      setActionLoading(null)
    }
  }

  const filteredUsers =
    result?.data.filter((u) => {
      if (statusFilter === 'banned') return u.isBanned
      if (statusFilter === 'active') return !u.isBanned
      return true
    }) ?? []

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-[#181411] mb-6 tracking-wide">
        User Management
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="flex-1 min-w-[200px] h-10 px-3 rounded-lg bg-white border border-[rgba(34,24,18,0.14)] text-[#181411] placeholder:text-[#8b8178] text-sm focus:outline-none focus:ring-2 focus:ring-[#fa6b05]/30 focus:border-[#fa6b05] transition-colors"
        />
        <Select
          value={planFilter}
          onValueChange={(v) => {
            setPlanFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="agency">Agency</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-white border border-[rgba(34,24,18,0.08)] rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-[20px] border border-[rgba(34,24,18,0.08)] bg-white shadow-[0_6px_20px_rgba(24,20,17,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(34,24,18,0.08)] bg-[#faf7eb] text-xs text-[#8b8178]">
                    <th className="text-left p-4 font-normal">User</th>
                    <th className="text-left p-4 font-normal hidden sm:table-cell">
                      Plan
                    </th>
                    <th className="text-left p-4 font-normal hidden md:table-cell">
                      Role
                    </th>
                    <th className="text-left p-4 font-normal hidden lg:table-cell">
                      Joined
                    </th>
                    <th className="text-left p-4 font-normal hidden sm:table-cell">
                      Status
                    </th>
                    <th className="text-right p-4 font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(34,24,18,0.05)]">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-[#faf7eb]/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-8 w-8 rounded-full overflow-hidden bg-[#fef0e6] shrink-0">
                            {user.profileImage ? (
                              <Image
                                src={user.profileImage}
                                alt={user.name}
                                fill
                                className="object-cover"
                                sizes="32px"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[#fa6b05] text-xs font-bold">
                                {user.name[0]}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-[#181411] text-sm">
                              {user.name}
                            </p>
                            <p className="text-[#8b8178] text-xs truncate max-w-[160px]">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full border capitalize',
                            user.plan === 'agency' &&
                              'bg-[#ecf8f5] border-[#379579]/25 text-[#1c4a3c]',
                            user.plan === 'pro' &&
                              'bg-[#fef0e6] border-[#fa6b05]/25 text-[#964003]',
                            user.plan === 'free' &&
                              'bg-[#faf7eb] border-[rgba(34,24,18,0.12)] text-[#8b8178]'
                          )}
                        >
                          {user.plan}
                        </span>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <span
                          className={cn(
                            'text-xs',
                            user.role === 'admin'
                              ? 'text-violet-600'
                              : 'text-[#8b8178]'
                          )}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        <span className="text-xs text-[#8b8178]">
                          {formatDate(user.createdAt)}
                        </span>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        {user.isBanned ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700">
                            Banned
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Change plan */}
                          <Select
                            value={user.plan}
                            onValueChange={(plan) =>
                              void adminAction(user.id, 'change_plan', { plan })
                            }
                          >
                            <SelectTrigger className="h-7 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="agency">Agency</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Ban/Unban */}
                          {user.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() =>
                                void adminAction(
                                  user.id,
                                  user.isBanned ? 'unban' : 'ban'
                                )
                              }
                              disabled={
                                actionLoading ===
                                user.id + (user.isBanned ? 'unban' : 'ban')
                              }
                              className={cn(
                                'p-1.5 rounded-lg transition-colors disabled:opacity-50',
                                user.isBanned
                                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                  : 'bg-red-50 text-red-600 hover:bg-red-100'
                              )}
                              title={user.isBanned ? 'Unban user' : 'Ban user'}
                            >
                              {user.isBanned ? (
                                <IconCircleCheck className="h-3.5 w-3.5" />
                              ) : (
                                <IconBan className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {result && result.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
              >
                <IconChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-[#8b8178]">
                Page {page} of {result.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= result.totalPages}
              >
                <IconChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
