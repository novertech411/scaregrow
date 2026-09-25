import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const destination = new URL(searchParams.get('next') || '/', origin)
  const next = destination.origin === origin ? destination.href : `${origin}/`

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(next)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could%20not%20authenticate%20user`)
}
