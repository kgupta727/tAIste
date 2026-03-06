'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { BRAND_DNA as DEFAULT_BRAND_DNA } from '../data/brandDNA'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useBrandDNA() {
  const { data, error, isLoading, mutate } = useSWR('/api/brand-dna', fetcher, {
    revalidateOnFocus: false,
    fallbackData: DEFAULT_BRAND_DNA,
  })
  const [isReanalyzing, setIsReanalyzing] = useState(false)

  const saveBrandDNA = async (newData: Record<string, unknown>) => {
    mutate(newData, false)
    await fetch('/api/brand-dna', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newData),
    })
    mutate()
  }

  const reanalyzeBrandDNA = async (): Promise<{ error?: string } | void> => {
    setIsReanalyzing(true)
    try {
      const res = await fetch('/api/analyze/brand-dna', { method: 'POST' })
      const result = await res.json()
      if (!res.ok) return { error: result.error ?? 'Analysis failed' }
      mutate(result, false)
      return
    } catch (e) {
      return { error: 'Network error' }
    } finally {
      setIsReanalyzing(false)
    }
  }

  return {
    brandDNA: data ?? DEFAULT_BRAND_DNA,
    isLoading,
    isReanalyzing,
    error,
    saveBrandDNA,
    reanalyzeBrandDNA,
  }
}
