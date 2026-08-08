export interface EsignEnvelope {
  envelopeId: string
}

/**
 * The interface a real e-signature provider (DocuSign, Dropbox Sign, etc.)
 * would need to implement. Only `MockEsignProvider` exists today — no
 * vendor has been chosen or integrated. Signing progress itself is tracked
 * in `document_signers`/`documents.envelope_status` via database RPCs (see
 * the document schema migration), not by this provider; its job is
 * just to originate an envelope identifier and make the "no real provider
 * configured" state explicit everywhere it's used.
 */
export interface EsignProvider {
  readonly name: string
  createEnvelope(input: { documentTitle: string }): Promise<EsignEnvelope>
}
