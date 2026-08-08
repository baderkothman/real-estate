// Backward-compatible re-export. The real implementation now lives in
// `listing.service.ts`, reading/writing the split `properties`/`listings`
// schema (see supabase/migrations/005_split_properties_listings.sql). This
// shim keeps every existing `import ... from '@/services/property.service'`
// working unchanged — new code should import from `@/services/listing.service`
// directly.
export * from './listing.service.server'
