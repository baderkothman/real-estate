import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'
import { getAuditLog, getAuditLogFacets } from '@/services/audit.service'

export const metadata: Metadata = { title: 'Audit Log' }

const PAGE_SIZE = 25

interface AuditLogPageProps {
  searchParams: Promise<{
    entityType?: string
    action?: string
    entityId?: string
    page?: string
  }>
}

function buildHref(params: Record<string, string | undefined>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value)
  }
  const qs = query.toString()
  return `/admin/audit-log${qs ? `?${qs}` : ''}`
}

function JsonPreview({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-[#a34702] font-medium select-none">
        {label}
      </summary>
      <pre className="mt-1 max-w-md overflow-x-auto rounded-lg bg-[#faf7eb] p-2 text-[11px] text-[#5f554d] whitespace-pre-wrap break-words">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  )
}

export default async function AdminAuditLogPage({
  searchParams,
}: AuditLogPageProps) {
  const { entityType, action, entityId, page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  const [{ data: entries, total }, facets] = await Promise.all([
    getAuditLog({ entityType, action, entityId }, page, PAGE_SIZE),
    getAuditLogFacets(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const activeFilters = { entityType, action, entityId }

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-[#181411] mb-2 tracking-wide">
        Audit Log
      </h2>
      <p className="text-sm text-[#5f554d] mb-6">
        {total} recorded {total === 1 ? 'action' : 'actions'} across all
        admin-impacting changes.
      </p>

      {/* Filters — plain GET form, no client JS required */}
      <form className="flex flex-wrap items-end gap-3 mb-6 p-4 rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)]">
        <div className="space-y-1">
          <label
            htmlFor="entityType"
            className="text-[10px] font-semibold text-[#5f554d] uppercase tracking-[0.15em]"
          >
            Entity type
          </label>
          <select
            id="entityType"
            name="entityType"
            defaultValue={entityType ?? ''}
            className="h-10 min-w-[150px] rounded-lg border border-[rgba(34,24,18,0.14)] bg-white px-3 text-sm text-[#181411] focus:outline-none focus:ring-2 focus:ring-[#fa6b05]/30 focus:border-[#fa6b05]"
          >
            <option value="">All types</option>
            {facets.entityTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="action"
            className="text-[10px] font-semibold text-[#5f554d] uppercase tracking-[0.15em]"
          >
            Action
          </label>
          <select
            id="action"
            name="action"
            defaultValue={action ?? ''}
            className="h-10 min-w-[150px] rounded-lg border border-[rgba(34,24,18,0.14)] bg-white px-3 text-sm text-[#181411] focus:outline-none focus:ring-2 focus:ring-[#fa6b05]/30 focus:border-[#fa6b05]"
          >
            <option value="">All actions</option>
            {facets.actions.map((a) => (
              <option key={a} value={a}>
                {a.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="entityId"
            className="text-[10px] font-semibold text-[#5f554d] uppercase tracking-[0.15em]"
          >
            Entity ID
          </label>
          <input
            id="entityId"
            name="entityId"
            defaultValue={entityId ?? ''}
            placeholder="Exact UUID"
            className="h-10 w-56 rounded-lg border border-[rgba(34,24,18,0.14)] bg-white px-3 text-sm text-[#181411] placeholder:text-[#8b8178] focus:outline-none focus:ring-2 focus:ring-[#fa6b05]/30 focus:border-[#fa6b05]"
          />
        </div>

        <button
          type="submit"
          className="h-10 px-5 rounded-lg bg-[#a34702] text-white text-sm font-semibold hover:bg-[#8a3c02] transition-colors"
        >
          Search
        </button>
        {(entityType || action || entityId) && (
          <Link
            href="/admin/audit-log"
            className="h-10 flex items-center px-4 text-sm text-[#5f554d] hover:text-[#a34702] transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {entries.length === 0 ? (
        <div className="text-center py-16 rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)]">
          <p className="text-[#5f554d]">No matching audit log entries.</p>
        </div>
      ) : (
        <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(34,24,18,0.08)] bg-[#faf7eb] text-left">
                  <th className="p-3 font-semibold text-[#5f554d] text-xs uppercase tracking-wide">
                    When
                  </th>
                  <th className="p-3 font-semibold text-[#5f554d] text-xs uppercase tracking-wide">
                    Actor
                  </th>
                  <th className="p-3 font-semibold text-[#5f554d] text-xs uppercase tracking-wide">
                    Entity
                  </th>
                  <th className="p-3 font-semibold text-[#5f554d] text-xs uppercase tracking-wide">
                    Action
                  </th>
                  <th className="p-3 font-semibold text-[#5f554d] text-xs uppercase tracking-wide">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-[rgba(34,24,18,0.06)] last:border-0 hover:bg-[#faf7eb]/60 align-top"
                  >
                    <td className="p-3 text-[#5f554d] whitespace-nowrap">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="p-3 text-[#181411]">
                      {entry.actorName ?? (
                        <span className="text-[#5f554d] italic">System</span>
                      )}
                      {entry.actorEmail && (
                        <div className="text-xs text-[#5f554d]">
                          {entry.actorEmail}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <Link
                        href={buildHref({
                          ...activeFilters,
                          entityId: entry.entityId,
                        })}
                        className="text-[#181411] hover:text-[#a34702] transition-colors"
                      >
                        {entry.entityType}
                      </Link>
                      <div className="text-xs text-[#5f554d] font-mono truncate max-w-[160px]">
                        {entry.entityId}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center rounded-full border border-[rgba(34,24,18,0.14)] bg-[#faf7eb] px-2.5 py-0.5 text-xs font-semibold capitalize text-[#181411]">
                        {entry.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 space-y-1">
                      <JsonPreview label="Before" value={entry.beforeData} />
                      <JsonPreview label="After" value={entry.afterData} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          {page <= 1 ? (
            <span
              aria-hidden="true"
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-[rgba(34,24,18,0.14)] bg-white text-[#5f554d] opacity-40"
            >
              <IconChevronLeft className="h-4 w-4" />
            </span>
          ) : (
            <Link
              href={buildHref({ ...activeFilters, page: String(page - 1) })}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-[rgba(34,24,18,0.14)] bg-white text-[#5f554d] hover:bg-[#faf7eb] transition-colors"
              aria-label="Previous page"
            >
              <IconChevronLeft className="h-4 w-4" />
            </Link>
          )}
          <span className="text-sm text-[#5f554d]">
            Page {page} of {totalPages}
          </span>
          {page >= totalPages ? (
            <span
              aria-hidden="true"
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-[rgba(34,24,18,0.14)] bg-white text-[#5f554d] opacity-40"
            >
              <IconChevronRight className="h-4 w-4" />
            </span>
          ) : (
            <Link
              href={buildHref({ ...activeFilters, page: String(page + 1) })}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-[rgba(34,24,18,0.14)] bg-white text-[#5f554d] hover:bg-[#faf7eb] transition-colors"
              aria-label="Next page"
            >
              <IconChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
