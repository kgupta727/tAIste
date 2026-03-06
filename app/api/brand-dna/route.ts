import { createClient } from '@/src/lib/supabase/server'
import { NextResponse } from 'next/server'

export function fromDnaRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    data: row.data,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  }
}

// ── GET /api/brand-dna ───────────────────────────────────────────────────────
// Returns ALL of the user's brand DNA profiles (may be empty array).

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('brand_dna')
    .select('id, name, is_active, data, updated_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json((data ?? []).map(fromDnaRow))
}

// ── POST /api/brand-dna ──────────────────────────────────────────────────────
// Creates a NEW brand DNA record with the given name and data payload.

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const name = (body.name ?? 'Brand DNA').trim()

  const { data, error } = await supabase
    .from('brand_dna')
    .insert({
      user_id: user.id,
      name,
      data: body.data ?? {},
      is_active: body.isActive ?? false,
      updated_at: new Date().toISOString(),
    })
    .select('id, name, is_active, data, updated_at, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(fromDnaRow(data), { status: 201 })
}

