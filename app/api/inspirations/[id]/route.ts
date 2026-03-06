import { createClient } from '@/src/lib/supabase/server'
import { NextResponse } from 'next/server'
import { fromRow } from '../route'

type Params = { params: Promise<{ id: string }> }

// ── PATCH /api/inspirations/[id] ─────────────────────────────────────────────
// Updates notes and/or tags on a single inspiration.

export async function PATCH(request: Request, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  // Only allow updating safe fields
  const updates: Record<string, unknown> = {}
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.tags !== undefined) updates.tags = body.tags
  if (body.title !== undefined) updates.title = body.title

  const { data, error } = await supabase
    .from('inspirations')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(fromRow(data))
}

// ── DELETE /api/inspirations/[id] ────────────────────────────────────────────

export async function DELETE(_: Request, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { error } = await supabase
    .from('inspirations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
