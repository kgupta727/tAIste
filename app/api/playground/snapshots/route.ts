import { createClient } from '@/src/lib/supabase/server'
import { NextResponse } from 'next/server'

// ── GET /api/playground/snapshots ─────────────────────────────────────────────
// Returns the user's 20 most recent snapshots.

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('playground_snapshots')
    .select('id, label, template_id, created_at, items, sections')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ snapshots: data ?? [] })
}

// ── POST /api/playground/snapshots ────────────────────────────────────────────
// Inserts a new snapshot for the authenticated user.

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { label, templateId, items, sections } = body as {
    label?: string
    templateId?: string
    items: unknown[]
    sections: unknown[]
  }

  if (!Array.isArray(items) || !Array.isArray(sections)) {
    return NextResponse.json({ error: 'items and sections are required arrays' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('playground_snapshots')
    .insert({
      user_id    : user.id,
      label      : label ?? 'Snapshot',
      template_id: templateId ?? null,
      items,
      sections,
    })
    .select('id, label, template_id, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ snapshot: data })
}

// ── DELETE /api/playground/snapshots?id=<uuid> ───────────────────────────────
// Deletes a single snapshot owned by the authenticated user.

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabase
    .from('playground_snapshots')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
