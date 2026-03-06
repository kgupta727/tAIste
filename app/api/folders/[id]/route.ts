import { createClient } from '@/src/lib/supabase/server'
import { NextResponse } from 'next/server'
import { fromFolderRow } from '../route'

type Params = { params: Promise<{ id: string }> }

// ── PATCH /api/folders/[id] ───────────────────────────────────────────────────

export async function PATCH(request: Request, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.color !== undefined) updates.color = body.color

  const { data, error } = await supabase
    .from('folders')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(fromFolderRow(data))
}

// ── DELETE /api/folders/[id] ──────────────────────────────────────────────────
// Deletes the folder. Inspirations inside have their folder_id set to NULL (on delete set null in DB).

export async function DELETE(_: Request, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
