import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // The callback must exchange its code before a session can exist.
  if (request.nextUrl.pathname === '/auth/callback') {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  const onAuthPage = ['/login', '/signup'].includes(request.nextUrl.pathname)

  if ((!user || error) && !onAuthPage) {
    if (request.nextUrl.pathname.startsWith('/api/assistant/')) {
      const unauthorized = NextResponse.json({ error: 'Please sign in to use Greener Assistant.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
      response.cookies.getAll().forEach((cookie) => unauthorized.cookies.set(cookie))
      return unauthorized
    }
    return showSignIn(request, response)
  }

  // Signed-in users on /login or /signup are sent on by those pages in the browser (see app/login/page.tsx).

  return response
}

// Behind the main website's rewrite (greenedenfarms.org/login/* → this app) the request carries this
// app's *.vercel.app host, so an absolute redirect would bounce users off the website's domain, and
// Next.js rejects relative redirects here. Render the sign-in page in place instead (server-side rewrite).
function showSignIn(request: NextRequest, response: NextResponse) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  const rewrite = NextResponse.rewrite(url)
  response.cookies.getAll().forEach((cookie) => rewrite.cookies.set(cookie))
  return rewrite
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
