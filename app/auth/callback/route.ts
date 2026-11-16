import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withBase } from '@/lib/base-path'

// Relative redirects: behind the main website's rewrite, request.url carries this app's *.vercel.app host.
function redirectTo(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: withBase(path) } })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const requested = searchParams.get('next') || '/'
  // Only same-app paths; never protocol-relative (//evil.example) or absolute URLs.
  const next = requested.startsWith('/') && !requested.startsWith('//') && !requested.startsWith('/\\') ? requested : '/'

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return redirectTo(next)
  }

  return redirectTo('/login?error=Could%20not%20authenticate%20user')
}
