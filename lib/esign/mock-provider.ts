import type { EsignEnvelope, EsignProvider } from './types'

/**
 * Development-mode only. Real signing is simulated entirely inside our own
 * database (`sign_document`/`decline_document` RPCs) — this provider does
 * not call out to any external service, verify identity, or produce a
 * legally meaningful signature. Any UI surfacing this must say so.
 */
export const mockEsignProvider: EsignProvider = {
  name: 'mock',
  async createEnvelope({
    documentTitle: _documentTitle,
  }): Promise<EsignEnvelope> {
    return { envelopeId: `mock-${crypto.randomUUID()}` }
  },
}
