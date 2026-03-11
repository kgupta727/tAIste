import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/reactbits?slug=Aurora-TS-TW.json
 *
 * Server-side proxy for reactbits.dev registry JSON.
 * Required because the browser cannot fetch cross-origin from reactbits.dev (CORS).
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')

  // Validate: only allow word chars and hyphens+dots (e.g. "Aurora-TS-TW.json")
  if (!slug || !/^[\w][\w.-]*$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }

  const upstream = `https://reactbits.dev/r/${slug}`

  try {
    const res = await fetch(upstream, {
      headers: { Accept: 'application/json' },
      // Cache the upstream response for 1 hour in Next.js data cache
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to reach reactbits.dev' }, { status: 502 })
  }
}
