import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Redirect www.score.fish → apex (score.fish) with a permanent 308, preserving
  // path + query. Without this, Google saw www and apex as duplicate homepages
  // and dropped the apex from the index ("Duplicate without user-selected
  // canonical"). See issue #115.
  const host = request.headers.get('host')
  if (host && host.toLowerCase().startsWith('www.')) {
    const url = request.nextUrl.clone()
    url.host = host.slice(4)
    url.port = ''
    return NextResponse.redirect(url, 308)
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
