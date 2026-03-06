'use client'

import useSWR from 'swr'
import { useMemo } from 'react'
import { useSwipeStore } from '../store/swipeStore'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useInspirations() {
  const { data, error, isLoading, mutate } = useSWR('/api/inspirations', fetcher, {
    revalidateOnFocus: false,
  })

  const { selectedTags, searchQuery, sortBy } = useSwipeStore()

  const filtered = useMemo(() => {
    const items = data ?? []
    let result = [...items]

    if (selectedTags.length > 0) {
      result = result.filter((item) =>
        selectedTags.every((tag: string) => item.tags.includes(tag))
      )
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.sourceDomain.toLowerCase().includes(q) ||
          item.tags.some((t: string) => t.includes(q))
      )
    }

    if (sortBy === 'date') {
      result.sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      )
    }

    return result
  }, [data, selectedTags, searchQuery, sortBy])

  const addInspiration = async (item: Record<string, unknown>) => {
    // Optimistic insert
    const optimistic = [item, ...(data ?? [])]
    mutate(optimistic, false)
    try {
      await fetch('/api/inspirations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
    } finally {
      mutate() // revalidate from server
    }
  }

  const removeInspiration = async (id: string) => {
    mutate((data ?? []).filter((i: { id: string }) => i.id !== id), false)
    await fetch(`/api/inspirations/${id}`, { method: 'DELETE' })
    mutate()
  }

  const updateInspiration = async (id: string, updates: Record<string, unknown>) => {
    mutate(
      (data ?? []).map((i: { id: string }) => (i.id === id ? { ...i, ...updates } : i)),
      false
    )
    await fetch(`/api/inspirations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    mutate()
  }

  return {
    inspirations: (data ?? []) as Record<string, unknown>[],
    filtered: filtered as Record<string, unknown>[],
    isLoading,
    error,
    addInspiration,
    removeInspiration,
    updateInspiration,
    mutate,
  }
}
