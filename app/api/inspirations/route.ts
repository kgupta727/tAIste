import { createClient } from '@/src/lib/supabase/server'
import { NextResponse } from 'next/server'

// ── helpers ──────────────────────────────────────────────────────────────────

function toRow(item: Record<string, unknown>, userId: string) {
  return {
    user_id: userId,
    title: item.title,
    source_url: item.sourceUrl ?? item.source_url ?? '',
    source_domain: item.sourceDomain ?? item.source_domain ?? '',
    source_type: item.sourceType ?? item.source_type ?? 'website',
    image_url: item.imageUrl ?? item.image_url ?? '',
    tags: item.tags ?? [],
    notes: item.notes ?? '',
    analysis: item.analysis ?? {},
    saved_at: item.savedAt ?? item.saved_at ?? new Date().toISOString(),
    folder_id: item.folderId ?? item.folder_id ?? null,
  }
}

export function fromRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    sourceUrl: row.source_url,
    sourceDomain: row.source_domain,
    sourceType: row.source_type,
    imageUrl: row.image_url,
    tags: row.tags,
    notes: row.notes,
    analysis: row.analysis,
    savedAt: row.saved_at,
    folderId: row.folder_id ?? null,
  }
}

// ── GET /api/inspirations ─────────────────────────────────────────────────────
// Returns the authenticated user's inspirations (scoped by user_id).

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('inspirations')
    .select('*')
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data.map(fromRow))
}

// ── POST /api/inspirations ────────────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const row = toRow(body, user.id)

  const { data, error } = await supabase
    .from('inspirations')
    .insert(row)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(fromRow(data), { status: 201 })
}
