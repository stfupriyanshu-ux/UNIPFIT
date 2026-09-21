import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const PUBLIC = ['/login', '/signup', '/reset', '/auth', '/offline'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p + '/'));

  // API routes authenticate themselves and answer 401 JSON instead of redirecting.
  if (!user && !isPublic && !path.startsWith('/api/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '?next=' + encodeURIComponent(path);
    return NextResponse.redirect(url);
  }
  if (user && (path === '/login' || path === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/home'; url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js).*)'],
};
