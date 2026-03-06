import { createClient } from '@/src/lib/supabase/server'
import { NextResponse } from 'next/server'

// ── GET /api/playground ───────────────────────────────────────────────────────
// Returns the user's saved canvas items array.

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('playground_canvases')
    .select('items, updated_at')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = row not found, that's fine — return empty
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ items: data?.items ?? [], updatedAt: data?.updated_at ?? null })
}

// ── PATCH /api/playground ─────────────────────────────────────────────────────
// Upserts the full items array for the user's canvas.

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const items = Array.isArray(body.items) ? body.items : []

  const { error } = await supabase
    .from('playground_canvases')
    .upsert(
      { user_id: user.id, items, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
