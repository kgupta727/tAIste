import { createClient } from '@/src/lib/supabase/server'
import { NextResponse } from 'next/server'
import { fromDnaRow } from '../route'

type Params = { params: Promise<{ id: string }> }

// ── GET /api/brand-dna/[id] ───────────────────────────────────────────────────

export async function GET(_: Request, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase
    .from('brand_dna')
    .select('id, name, is_active, data, updated_at, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(fromDnaRow(data))
}

// ── PATCH /api/brand-dna/[id] ─────────────────────────────────────────────────
// Rename, toggle active, or update data payload.

export async function PATCH(request: Request, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) updates.name = body.name
  if (body.isActive !== undefined) updates.is_active = body.isActive
  if (body.data !== undefined) updates.data = body.data

  // If setting this one active, deactivate all others first
  if (body.isActive === true) {
    await supabase
      .from('brand_dna')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .neq('id', id)
  }

  const { data, error } = await supabase
    .from('brand_dna')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, is_active, data, updated_at, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(fromDnaRow(data))
}

// ── DELETE /api/brand-dna/[id] ────────────────────────────────────────────────

export async function DELETE(_: Request, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { error } = await supabase
    .from('brand_dna')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
