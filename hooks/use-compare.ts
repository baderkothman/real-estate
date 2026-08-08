'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'compare-listings'
const MAX_COMPARE = 4
const UPDATE_EVENT = 'compare-updated'

function readStored(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function writeStored(ids: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT))
}

/**
 * Comparing up to 4 listings is a current-session browsing tool, not
 * something users manage long-term — implemented entirely client-side via
 * localStorage rather than a new database table + RLS + migration. A custom
 * window event keeps every component using this hook in sync within the
 * same tab (the native `storage` event only fires across tabs).
 */
export function useCompare() {
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    setIds(readStored())
    const onUpdate = () => setIds(readStored())
    window.addEventListener(UPDATE_EVENT, onUpdate)
    window.addEventListener('storage', onUpdate)
    return () => {
      window.removeEventListener(UPDATE_EVENT, onUpdate)
      window.removeEventListener('storage', onUpdate)
    }
  }, [])

  const toggle = useCallback((id: string) => {
    const current = readStored()
    const next = current.includes(id)
      ? current.filter((existing) => existing !== id)
      : current.length >= MAX_COMPARE
        ? current
        : [...current, id]
    writeStored(next)
  }, [])

  const remove = useCallback((id: string) => {
    writeStored(readStored().filter((existing) => existing !== id))
  }, [])

  const clear = useCallback(() => {
    writeStored([])
  }, [])

  return {
    ids,
    toggle,
    remove,
    clear,
    isFull: ids.length >= MAX_COMPARE,
    max: MAX_COMPARE,
  }
}
