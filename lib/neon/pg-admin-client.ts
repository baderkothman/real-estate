import 'server-only'

import { neon } from '@neondatabase/serverless'
import { requireServerEnv } from '@/lib/neon/env'

// ─── Why this exists ────────────────────────────────────────────────────────
//
// `createAdminClient()` (lib/neon/admin.ts) needs to run privileged, RLS-
// bypassing queries — audit logging, notifications, party_roles, payment
// ledger writes, admin user management, analytics RPCs. The natural way to
// do that against the Neon Data API is a bearer token whose JWT `role` claim
// maps to an elevated Postgres role — but minting one requires standing up a
// custom JWT provider (a hosted JWKS endpoint) purely for this, since the
// Neon-Auth-issued tokens this app already uses always carry the ordinary
// user role.
//
// `DATABASE_URL` (the `neondb_owner` connection) already carries BYPASSRLS —
// Neon's own guidance for "administrative tasks such as migrations or
// privileged background jobs" — and is already a real, configured secret in
// this project. So the admin client talks directly to Postgres over that
// connection instead of through the Data API's REST layer.
//
// This file is a small, intentionally-narrow PostgREST-alike query builder —
// just the subset of `.from()/.rpc()` chains actually used by the services
// under services/*.ts that call `createAdminClient()`. It is NOT a general
// PostgREST reimplementation: embedded-resource ("foreign table") selects
// are only resolved for the exact relationships listed in `FK_HINT_EMBEDS`/
// `IMPLICIT_EMBEDS` below, and unrecognized embeds throw rather than
// silently returning wrong data.

type PgError = { message: string; code?: string }

// `data` mirrors the loosely-typed postgrest-js client this replaces — call
// sites already cast rows to their own row types (`as FooRow[]`), same as
// before.
interface ExecResult {
  // biome-ignore lint/suspicious/noExplicitAny: see interface comment above
  data: any[] | null
  error: PgError | null
  count: number | null
}

interface SingleResult {
  // biome-ignore lint/suspicious/noExplicitAny: see ExecResult
  data: any | null
  error: PgError | null
}

type FilterOp = 'eq' | 'neq' | 'in' | 'is' | 'lte' | 'gte' | 'gt' | 'ilike'

interface SimpleFilter {
  kind: FilterOp
  column: string
  value: unknown
}

interface OrFilter {
  kind: 'or'
  raw: string
}

type Filter = SimpleFilter | OrFilter

interface OrderSpec {
  column: string
  ascending: boolean
}

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/

function assertIdent(name: string): string {
  if (!IDENT_RE.test(name)) {
    throw new Error(`Unsafe identifier rejected: ${name}`)
  }
  return name
}

function quoteIdent(name: string): string {
  return `"${assertIdent(name)}"`
}

function serializeValue(value: unknown): unknown {
  if (value === undefined) return null
  if (value === null) return null
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    return JSON.stringify(value)
  }
  return value
}

// Explicit `table!fk_column(...)` embeds actually used by this codebase.
// `fkColumn` lives on the parent table and references `embedTable.id`.
// (`!inner` is PostgREST's join-type modifier, not a column name — it's
// special-cased below to fall through to IMPLICIT_EMBEDS instead of being
// looked up here.)
const FK_HINT_EMBEDS: Record<string, { embedTable: string }> = {
  buyer_party_id: { embedTable: 'party_roles' },
  seller_party_id: { embedTable: 'party_roles' },
  applicant_party_id: { embedTable: 'party_roles' },
  listed_by: { embedTable: 'profiles' },
}

// Implicit (no `!hint`, or the `!inner` join-type modifier) embeds actually
// used, keyed by `parentTable.embedTable`.
const IMPLICIT_EMBEDS: Record<string, { fkColumn: string }> = {
  'search_alerts.saved_searches': { fkColumn: 'saved_search_id' },
  'rental_applications.listings': { fkColumn: 'listing_id' },
  'listings.properties': { fkColumn: 'property_id' },
}

interface EmbedJoin {
  joinAlias: string
  sql: string
}

interface SelectResult {
  columnsSql: string[]
  joins: EmbedJoin[]
  // PostgREST alias (e.g. "properties") -> join alias (e.g. "e0"), so
  // dotted-path filters like .eq('properties.city', ...) can resolve to the
  // right joined table instead of the main table.
  embedAliasMap: Map<string, string>
}

// ─── select-string parsing ──────────────────────────────────────────────────

function splitTopLevel(input: string, sep = ','): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of input) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === sep && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

const EMBED_FIELD_RE = /^(?:([\w]+):)?([\w]+)(?:!([\w]+))?(?:\(([\s\S]*)\))?$/

function buildSelectClause(mainTable: string, selectStr: string): SelectResult {
  const embedAliasMap = new Map<string, string>()
  const joins: EmbedJoin[] = []

  if (!selectStr || selectStr.trim() === '*') {
    return { columnsSql: ['t.*'], joins, embedAliasMap }
  }

  const fields = splitTopLevel(selectStr)
  const columnsSql: string[] = []

  for (const field of fields) {
    if (field === '*') {
      columnsSql.push('t.*')
      continue
    }
    const match = EMBED_FIELD_RE.exec(field)
    if (!match) {
      throw new Error(`Unable to parse select field: ${field}`)
    }
    const [, aliasGroup, nameGroup, fkHintRaw, embedCols] = match

    if (embedCols === undefined) {
      // Plain column (or `*`).
      columnsSql.push(nameGroup === '*' ? 't.*' : `t.${quoteIdent(nameGroup)}`)
      continue
    }

    // Embedded (foreign) resource, joined in (not correlated-subqueried) so
    // its columns are also filterable via dotted-path .eq('table.col', ...).
    const alias = aliasGroup ?? nameGroup
    const embedTable = nameGroup
    // `!inner` is a join-type modifier, not a real FK hint — treat it the
    // same as "no hint" and resolve via IMPLICIT_EMBEDS.
    const fkHint = fkHintRaw === 'inner' ? undefined : fkHintRaw
    let fkColumn: string

    if (fkHint) {
      const hint = FK_HINT_EMBEDS[fkHint]
      if (!hint || hint.embedTable !== embedTable) {
        throw new Error(
          `Unsupported embed hint "${fkHint}" -> ${embedTable} on ${mainTable}. ` +
            'Add it to FK_HINT_EMBEDS in lib/neon/pg-admin-client.ts.'
        )
      }
      fkColumn = fkHint
    } else {
      const implicit = IMPLICIT_EMBEDS[`${mainTable}.${embedTable}`]
      if (!implicit) {
        throw new Error(
          `Unsupported embed ${embedTable} on ${mainTable}. ` +
            'Add it to IMPLICIT_EMBEDS in lib/neon/pg-admin-client.ts.'
        )
      }
      fkColumn = implicit.fkColumn
    }

    const joinAlias = `e${joins.length}`
    joins.push({
      joinAlias,
      sql: `left join public.${quoteIdent(embedTable)} as ${joinAlias} on ${joinAlias}.id = t.${quoteIdent(fkColumn)}`,
    })
    embedAliasMap.set(alias, joinAlias)

    const subCols = splitTopLevel(embedCols)
    const objectArgs = subCols
      .map((c) => `'${assertIdent(c)}', ${joinAlias}.${quoteIdent(c)}`)
      .join(', ')
    columnsSql.push(
      `case when ${joinAlias}.id is null then null else jsonb_build_object(${objectArgs}) end as ${quoteIdent(alias)}`
    )
  }

  return { columnsSql, joins, embedAliasMap }
}

// ─── filter / or() parsing ──────────────────────────────────────────────────

const OP_SYMBOLS: Record<string, string> = {
  eq: '=',
  neq: '<>',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
}

function splitOrClause(clause: string): [string, string, string] {
  const firstDot = clause.indexOf('.')
  const secondDot = clause.indexOf('.', firstDot + 1)
  if (firstDot === -1 || secondDot === -1) {
    throw new Error(`Malformed or() clause: ${clause}`)
  }
  return [
    clause.slice(0, firstDot),
    clause.slice(firstDot + 1, secondDot),
    clause.slice(secondDot + 1),
  ]
}

function resolveColumnRef(
  column: string,
  embedAliasMap: Map<string, string>
): string {
  const dot = column.indexOf('.')
  if (dot === -1) return `t.${quoteIdent(column)}`
  const embedAlias = column.slice(0, dot)
  const col = column.slice(dot + 1)
  const joinAlias = embedAliasMap.get(embedAlias)
  if (!joinAlias) {
    throw new Error(
      `Filter references "${embedAlias}" but it isn't embedded in this select()`
    )
  }
  return `${joinAlias}.${quoteIdent(col)}`
}

function renderOrTerm(
  clause: string,
  params: unknown[],
  embedAliasMap: Map<string, string>
): string {
  const [column, op, rawValue] = splitOrClause(clause)
  const col = resolveColumnRef(column, embedAliasMap)

  if (op === 'is') {
    if (rawValue === 'null') return `${col} is null`
    if (rawValue === 'true') return `${col} is true`
    if (rawValue === 'false') return `${col} is false`
    throw new Error(`Unsupported is() value in or(): ${rawValue}`)
  }
  if (op === 'ilike' || op === 'like') {
    params.push(rawValue)
    return `${col} ${op} $${params.length}`
  }
  const symbol = OP_SYMBOLS[op]
  if (!symbol) throw new Error(`Unsupported operator in or(): ${op}`)
  params.push(rawValue)
  return `${col} ${symbol} $${params.length}`
}

function buildWhere(
  filters: Filter[],
  params: unknown[],
  embedAliasMap: Map<string, string>
): string {
  const clauses: string[] = []
  for (const filter of filters) {
    if (filter.kind === 'or') {
      const terms = splitTopLevel(filter.raw).map((c) =>
        renderOrTerm(c, params, embedAliasMap)
      )
      clauses.push(`(${terms.join(' or ')})`)
      continue
    }

    const col = resolveColumnRef(filter.column, embedAliasMap)
    switch (filter.kind) {
      case 'eq':
        params.push(serializeValue(filter.value))
        clauses.push(`${col} = $${params.length}`)
        break
      case 'neq':
        params.push(serializeValue(filter.value))
        clauses.push(`${col} <> $${params.length}`)
        break
      case 'lte':
        params.push(serializeValue(filter.value))
        clauses.push(`${col} <= $${params.length}`)
        break
      case 'gte':
        params.push(serializeValue(filter.value))
        clauses.push(`${col} >= $${params.length}`)
        break
      case 'gt':
        params.push(serializeValue(filter.value))
        clauses.push(`${col} > $${params.length}`)
        break
      case 'ilike':
        params.push(filter.value)
        clauses.push(`${col} ilike $${params.length}`)
        break
      case 'in':
        params.push(filter.value)
        clauses.push(`${col} = any($${params.length})`)
        break
      case 'is':
        if (filter.value === null) clauses.push(`${col} is null`)
        else if (filter.value === true) clauses.push(`${col} is true`)
        else if (filter.value === false) clauses.push(`${col} is false`)
        else throw new Error(`Unsupported is() value: ${String(filter.value)}`)
        break
    }
  }
  return clauses.join(' and ')
}

function parseSimpleColumnList(str: string): string[] {
  if (!str || str.trim() === '*') return []
  return splitTopLevel(str).map((c) => c.trim())
}

// ─── query execution ────────────────────────────────────────────────────────

let sqlClient: ReturnType<typeof neon> | null = null
function getSql() {
  if (!sqlClient) {
    sqlClient = neon(requireServerEnv('DATABASE_URL'))
  }
  return sqlClient
}

async function runQuery(text: string, params: unknown[]): Promise<ExecResult> {
  try {
    const sql = getSql()
    const rows = (await sql.query(text, params)) as Record<string, unknown>[]
    let count: number | null = null
    const data = rows.map((row) => {
      if ('__total_count' in row) {
        const { __total_count, ...rest } = row
        count = Number(__total_count)
        return rest
      }
      return row
    })
    return { data, error: null, count }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { data: null, error: { message }, count: null }
  }
}

type Mode = 'select' | 'insert' | 'update' | 'delete' | null

class QueryBuilder implements PromiseLike<ExecResult> {
  private table: string
  private mode: Mode = null
  private selectColumns = '*'
  private selectOpts: { count?: 'exact' } | undefined
  private returningColumns: string | null = null
  private insertRows: Record<string, unknown>[] = []
  private updateObj: Record<string, unknown> = {}
  private filters: Filter[] = []
  private orders: OrderSpec[] = []
  private limitVal: number | null = null
  private offsetVal: number | null = null

  constructor(table: string) {
    this.table = assertIdent(table)
  }

  select(columns = '*', opts?: { count?: 'exact'; head?: boolean }) {
    if (this.mode === null) {
      this.mode = 'select'
      this.selectColumns = columns
      this.selectOpts = opts
    } else {
      this.returningColumns = columns
    }
    return this
  }

  insert(rows: Record<string, unknown> | Record<string, unknown>[]) {
    this.mode = 'insert'
    this.insertRows = Array.isArray(rows) ? rows : [rows]
    return this
  }

  update(values: Record<string, unknown>) {
    this.mode = 'update'
    this.updateObj = values
    return this
  }

  delete() {
    this.mode = 'delete'
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ kind: 'eq', column, value })
    return this
  }
  neq(column: string, value: unknown) {
    this.filters.push({ kind: 'neq', column, value })
    return this
  }
  in(column: string, values: unknown[]) {
    this.filters.push({ kind: 'in', column, value: values })
    return this
  }
  is(column: string, value: unknown) {
    this.filters.push({ kind: 'is', column, value })
    return this
  }
  lte(column: string, value: unknown) {
    this.filters.push({ kind: 'lte', column, value })
    return this
  }
  gte(column: string, value: unknown) {
    this.filters.push({ kind: 'gte', column, value })
    return this
  }
  gt(column: string, value: unknown) {
    this.filters.push({ kind: 'gt', column, value })
    return this
  }
  ilike(column: string, value: unknown) {
    this.filters.push({ kind: 'ilike', column, value })
    return this
  }
  or(raw: string) {
    this.filters.push({ kind: 'or', raw })
    return this
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: opts?.ascending ?? true })
    return this
  }

  range(from: number, to: number) {
    this.offsetVal = from
    this.limitVal = to - from + 1
    return this
  }

  limit(n: number) {
    this.limitVal = n
    return this
  }

  private build(): { sql: string; params: unknown[] } {
    const params: unknown[] = []

    if (this.mode === 'insert') {
      const cols = Array.from(
        new Set(this.insertRows.flatMap((r) => Object.keys(r)))
      )
      const colsSql = cols.map(quoteIdent).join(', ')
      const valuesSql = this.insertRows
        .map((row) => {
          const cells = cols.map((c) => {
            params.push(serializeValue(row[c] ?? null))
            return `$${params.length}`
          })
          return `(${cells.join(', ')})`
        })
        .join(', ')
      const returning = this.returningColumns
        ? parseSimpleColumnList(this.returningColumns)
            .map(quoteIdent)
            .join(', ') || '*'
        : '*'
      const sql =
        cols.length > 0
          ? `insert into public.${quoteIdent(this.table)} (${colsSql}) values ${valuesSql} returning ${returning}`
          : `insert into public.${quoteIdent(this.table)} default values returning ${returning}`
      return { sql, params }
    }

    if (this.mode === 'update') {
      const cols = Object.keys(this.updateObj)
      const setSql = cols
        .map((c) => {
          params.push(serializeValue(this.updateObj[c]))
          return `${quoteIdent(c)} = $${params.length}`
        })
        .join(', ')
      let sql = `update public.${quoteIdent(this.table)} as t set ${setSql}`
      const whereSql = buildWhere(this.filters, params, new Map())
      if (whereSql) sql += ` where ${whereSql}`
      const returning = this.returningColumns
        ? parseSimpleColumnList(this.returningColumns)
            .map(quoteIdent)
            .join(', ') || '*'
        : '*'
      sql += ` returning ${returning}`
      return { sql, params }
    }

    if (this.mode === 'delete') {
      let sql = `delete from public.${quoteIdent(this.table)} as t`
      const whereSql = buildWhere(this.filters, params, new Map())
      if (whereSql) sql += ` where ${whereSql}`
      sql += ' returning *'
      return { sql, params }
    }

    // select (default)
    const { columnsSql, joins, embedAliasMap } = buildSelectClause(
      this.table,
      this.selectColumns
    )
    if (this.selectOpts?.count === 'exact') {
      columnsSql.push('count(*) over() as __total_count')
    }
    let sql = `select ${columnsSql.join(', ')} from public.${quoteIdent(this.table)} as t`
    for (const join of joins) {
      sql += ` ${join.sql}`
    }
    const whereSql = buildWhere(this.filters, params, embedAliasMap)
    if (whereSql) sql += ` where ${whereSql}`
    if (this.orders.length > 0) {
      sql +=
        ' order by ' +
        this.orders
          .map(
            (o) => `t.${quoteIdent(o.column)} ${o.ascending ? 'asc' : 'desc'}`
          )
          .join(', ')
    }
    if (this.limitVal !== null) {
      params.push(this.limitVal)
      sql += ` limit $${params.length}`
    }
    if (this.offsetVal !== null) {
      params.push(this.offsetVal)
      sql += ` offset $${params.length}`
    }
    return { sql, params }
  }

  private async exec(): Promise<ExecResult> {
    const { sql, params } = this.build()
    return runQuery(sql, params)
  }

  // biome-ignore lint/suspicious/noThenProperty: intentional thenable so `await admin.from(...).eq(...)` works without a terminal call
  then<TResult1 = ExecResult, TResult2 = never>(
    onfulfilled?:
      | ((value: ExecResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected)
  }

  async single(): Promise<SingleResult> {
    const result = await this.exec()
    if (result.error) return { data: null, error: result.error }
    const rows = result.data ?? []
    if (rows.length !== 1) {
      return {
        data: null,
        error: { message: `Expected exactly one row, got ${rows.length}` },
      }
    }
    return { data: rows[0], error: null }
  }

  async maybeSingle(): Promise<SingleResult> {
    const result = await this.exec()
    if (result.error) return { data: null, error: result.error }
    const rows = result.data ?? []
    if (rows.length === 0) return { data: null, error: null }
    if (rows.length > 1) {
      return {
        data: null,
        error: { message: `Expected at most one row, got ${rows.length}` },
      }
    }
    return { data: rows[0], error: null }
  }
}

class RpcCall implements PromiseLike<ExecResult> {
  private name: string
  private args: Record<string, unknown>

  constructor(name: string, args: Record<string, unknown>) {
    this.name = assertIdent(name)
    this.args = args
  }

  private async exec(): Promise<ExecResult> {
    const params: unknown[] = []
    const entries = Object.entries(this.args)
    const argsSql = entries
      .map(([k, v]) => {
        assertIdent(k)
        params.push(serializeValue(v))
        return `${k} => $${params.length}`
      })
      .join(', ')
    const sql = `select * from public.${quoteIdent(this.name)}(${argsSql})`
    return runQuery(sql, params)
  }

  // biome-ignore lint/suspicious/noThenProperty: intentional thenable so `await admin.from(...).eq(...)` works without a terminal call
  then<TResult1 = ExecResult, TResult2 = never>(
    onfulfilled?:
      | ((value: ExecResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected)
  }

  async single(): Promise<SingleResult> {
    const result = await this.exec()
    if (result.error) return { data: null, error: result.error }
    const rows = result.data ?? []
    if (rows.length !== 1) {
      return {
        data: null,
        error: { message: `Expected exactly one row, got ${rows.length}` },
      }
    }
    return { data: rows[0], error: null }
  }
}

export function createPgAdminClient() {
  return {
    from(table: string) {
      return new QueryBuilder(table)
    },
    rpc(name: string, args: Record<string, unknown> = {}) {
      return new RpcCall(name, args)
    },
  }
}
