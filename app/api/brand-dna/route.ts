import { createClient } from '@/src/lib/supabase/server'
import { NextResponse } from 'next/server'
import { BRAND_DNA as DEFAULT_BRAND_DNA } from '@/src/data/brandDNA'

// ── GET /api/brand-dna ───────────────────────────────────────────────────────
// Returns the user's stored brand DNA, falling back to the static default.

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('brand_dna')
    .select('data, updated_at')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found, that's fine — we fall back to default
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data?.data ?? DEFAULT_BRAND_DNA)
}

// ── POST /api/brand-dna ──────────────────────────────────────────────────────
// Upserts the user's brand DNA. Called after AI generation (Phase 3).

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('brand_dna')
    .upsert(
      { user_id: user.id, data: body, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select('data')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data.data, { status: 200 })
}
