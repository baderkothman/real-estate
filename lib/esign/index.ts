import { mockEsignProvider } from './mock-provider'
import type { EsignProvider } from './types'

/**
 * Always returns the mock provider today — no real e-signature vendor is
 * configured. A production deployment activating one would select it here
 * based on `ESIGN_PROVIDER`/`ESIGN_API_KEY` env vars (documented in
 * README.md) once a vendor is actually chosen, with the mock kept as the
 * safe default when those are unset.
 */
export function getEsignProvider(): EsignProvider {
  return mockEsignProvider
}

export type { EsignEnvelope, EsignProvider } from './types'
