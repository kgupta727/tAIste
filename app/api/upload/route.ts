// Uploads a base64 image data URI to Supabase Storage and returns the public URL.
//
// SETUP REQUIRED in Supabase Dashboard:
//   Storage → New bucket → Name: "inspiration-images" → Public: ON
//   Then add this RLS policy on the bucket:
//   Allow authenticated users to INSERT into their own folder:
//     (bucket_id = 'inspiration-images') AND (auth.uid()::text = (storage.foldername(name))[1])

import { NextResponse } from 'next/server'
import { createClient } from '@/src/lib/supabase/server'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { imageData } = await request.json()
  if (!imageData) return NextResponse.json({ error: 'imageData required' }, { status: 400 })

  // Parse "data:<mime>;base64,<data>"
  const match = imageData.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return NextResponse.json({ error: 'Invalid image data URI' }, { status: 400 })

  const mimeType = match[1]
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
  const buffer = Buffer.from(match[2], 'base64')
  const path = `${user.id}/${randomUUID()}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from('inspiration-images')
    .upload(path, buffer, { contentType: mimeType, upsert: false })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('inspiration-images')
    .getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
