import { createAdminClient } from '@/lib/supabase/admin'

export interface AuditLogInput {
  actorId: string | null
  entityType: string
  entityId: string
  action: string
  beforeData?: unknown
  afterData?: unknown
}

export interface AuditLogEntry {
  id: number
  actorId: string | null
  actorName: string | null
  actorEmail: string | null
  entityType: string
  entityId: string
  action: string
  beforeData: unknown
  afterData: unknown
  createdAt: Date
}

interface AuditLogRow {
  id: number
  actor_id: string | null
  entity_type: string
  entity_id: string
  action: string
  before_data: unknown
  after_data: unknown
  created_at: string
}

function dbRowToAuditLogEntry(
  row: AuditLogRow,
  actorsById: Map<string, { name: string; email: string }>
): AuditLogEntry {
  const actor = row.actor_id ? actorsById.get(row.actor_id) : undefined
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: actor?.name ?? null,
    actorEmail: actor?.email ?? null,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    beforeData: row.before_data,
    afterData: row.after_data,
    createdAt: new Date(row.created_at),
  }
}

/**
 * Records a high-impact domain change. Writes only via the service-role
 * client — `audit_log` has no INSERT policy for authenticated/anon roles
 * (see supabase/migrations/006_party_roles_audit_events.sql), so this is
 * the only legitimate way to write an entry.
 *
 * Never throws: a failure to log must not block the primary action it's
 * describing from completing. Failures are logged loudly to server logs
 * instead.
 */
export async function logAudit(input: AuditLogInput): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('audit_log').insert({
    actor_id: input.actorId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    before_data: input.beforeData ?? null,
    after_data: input.afterData ?? null,
  })

  if (error) {
    console.error('Failed to write audit log entry:', error, input)
  }
}

export async function getAuditLog(
  filters?: {
    entityType?: string
    entityId?: string
    action?: string
    actorId?: string
  },
  page = 1,
  pageSize = 50
): Promise<{
  data: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
}> {
  const admin = createAdminClient()

  let query = admin
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters?.entityType) query = query.eq('entity_type', filters.entityType)
  if (filters?.entityId) query = query.eq('entity_id', filters.entityId)
  if (filters?.action) query = query.eq('action', filters.action)
  if (filters?.actorId) query = query.eq('actor_id', filters.actorId)

  const offset = (page - 1) * pageSize
  query = query.range(offset, offset + pageSize - 1)

  const { data, count, error } = await query
  if (error) throw error

  const rows = (data as AuditLogRow[]) ?? []

  // One batched follow-up query for every distinct actor on this page,
  // instead of resolving a name per row (N+1).
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))]
  const actorsById = new Map<string, { name: string; email: string }>()
  if (actorIds.length > 0) {
    const { data: actors } = await admin
      .from('profiles')
      .select('id, name, email')
      .in('id', actorIds as string[])
    for (const a of (actors as Array<{
      id: string
      name: string
      email: string
    }> | null) ?? []) {
      actorsById.set(a.id, { name: a.name, email: a.email })
    }
  }

  return {
    data: rows.map((row) => dbRowToAuditLogEntry(row, actorsById)),
    total: count ?? 0,
    page,
    pageSize,
  }
}

/**
 * Distinct entity types and actions actually present in the log, for the
 * admin viewer's filter dropdowns. Cheap: audit_log is append-only and
 * small relative to the domain tables it references.
 */
export async function getAuditLogFacets(): Promise<{
  entityTypes: string[]
  actions: string[]
}> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('audit_log')
    .select('entity_type, action')

  if (error || !data) return { entityTypes: [], actions: [] }

  const rows = data as Array<{ entity_type: string; action: string }>
  return {
    entityTypes: [...new Set(rows.map((r) => r.entity_type))].sort(),
    actions: [...new Set(rows.map((r) => r.action))].sort(),
  }
}
