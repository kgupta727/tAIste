'use client'

import useSWR from 'swr'
import { useState } from 'react'

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`)
    return r.json()
  })

export type BrandDNARecord = {
  id: string
  name: string
  isActive: boolean
  data: Record<string, unknown>
  updatedAt: string
  createdAt: string
}

export function useBrandDNA() {
  const { data, error, isLoading, mutate } = useSWR<BrandDNARecord[]>('/api/brand-dna', fetcher, {
    revalidateOnFocus: false,
  })
  const [isReanalyzing, setIsReanalyzing] = useState(false)

  const brandDNAs: BrandDNARecord[] = Array.isArray(data) ? data : []
  // Active DNA: first with is_active=true, else first in list, else null
  const activeBrandDNA: BrandDNARecord | null =
    brandDNAs.find((d) => d.isActive) ?? brandDNAs[0] ?? null

  const setActive = async (id: string) => {
    mutate(brandDNAs.map((d) => ({ ...d, isActive: d.id === id })), false)
    await fetch(`/api/brand-dna/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: true }),
    })
    mutate()
  }

  const renameDNA = async (id: string, name: string) => {
    mutate(brandDNAs.map((d) => (d.id === id ? { ...d, name } : d)), false)
    await fetch(`/api/brand-dna/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    mutate()
  }

  const deleteDNA = async (id: string) => {
    mutate(brandDNAs.filter((d) => d.id !== id), false)
    await fetch(`/api/brand-dna/${id}`, { method: 'DELETE' })
    mutate()
  }

  const reanalyzeBrandDNA = async (
    name?: string,
    folderIds?: string[],
  ): Promise<{ error?: string; id?: string } | void> => {
    setIsReanalyzing(true)
    try {
      const res = await fetch('/api/analyze/brand-dna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          ...(folderIds && folderIds.length > 0 ? { folderIds } : {}),
        }),
      })
      const result = await res.json()
      if (!res.ok) return { error: result.error ?? 'Analysis failed' }
      mutate()
      return { id: result.id }
    } catch {
      return { error: 'Network error' }
    } finally {
      setIsReanalyzing(false)
    }
  }

  return {
    brandDNAs,
    activeBrandDNA,
    // Legacy single-record accessor — used in Dashboard/BrandKit
    brandDNA: activeBrandDNA?.data ?? null,
    isLoading,
    isReanalyzing,
    error,
    setActive,
    renameDNA,
    deleteDNA,
    reanalyzeBrandDNA,
    mutate,
  }
}

