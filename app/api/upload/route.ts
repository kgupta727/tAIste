// Uploads an image to Supabase Storage and returns the public URL.
// Accepts either:
//   { imageData: "data:<mime>;base64,..." }  — base64 data URI (file uploads)
//   { imageUrl: "https://..." }              — external URL (Microlink screenshots etc.)
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

  const body = await request.json()
  const { imageData, imageUrl } = body

  if (!imageData && !imageUrl) {
    return NextResponse.json({ error: 'imageData or imageUrl required' }, { status: 400 })
  }

  let buffer: Buffer
  let mimeType: string
  let ext: string

  if (imageData) {
    // Base64 data URI path
    const match = (imageData as string).match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return NextResponse.json({ error: 'Invalid image data URI' }, { status: 400 })
    mimeType = match[1]
    ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
    buffer = Buffer.from(match[2], 'base64')
  } else {
    // External URL path — fetch the image server-side to avoid CORS issues
    let fetchRes: Response
    try {
      fetchRes = await fetch(imageUrl as string)
      if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status}`)
    } catch {
      return NextResponse.json({ error: 'Failed to fetch image from URL' }, { status: 422 })
    }
    const arrayBuf = await fetchRes.arrayBuffer()
    buffer = Buffer.from(arrayBuf)
    const ct = fetchRes.headers.get('content-type') ?? 'image/jpeg'
    mimeType = ct.split(';')[0].trim()
    ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  }

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
