'use client'

import useSWR from 'swr'

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`)
    return r.json()
  })

export type Folder = {
  id: string
  name: string
  color: string
  createdAt: string
}

export function useFolders() {
  const { data, error, isLoading, mutate } = useSWR<Folder[]>('/api/folders', fetcher, {
    revalidateOnFocus: false,
  })

  const createFolder = async (name: string, color = '#A78BFA'): Promise<Folder | null> => {
    const optimistic: Folder = {
      id: `temp-${Date.now()}`,
      name,
      color,
      createdAt: new Date().toISOString(),
    }
    mutate([...(Array.isArray(data) ? data : []), optimistic], false)
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      })
      const created = await res.json()
      mutate()
      return created
    } catch {
      mutate()
      return null
    }
  }

  const renameFolder = async (id: string, name: string) => {
    mutate(
      (Array.isArray(data) ? data : []).map((f) => (f.id === id ? { ...f, name } : f)),
      false
    )
    await fetch(`/api/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    mutate()
  }

  const deleteFolder = async (id: string) => {
    mutate((Array.isArray(data) ? data : []).filter((f) => f.id !== id), false)
    await fetch(`/api/folders/${id}`, { method: 'DELETE' })
    mutate()
  }

  return {
    folders: (Array.isArray(data) ? data : []) as Folder[],
    isLoading,
    error,
    createFolder,
    renameFolder,
    deleteFolder,
    mutate,
  }
}
