import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';

/**
 * Rafraichit la session Supabase a chaque requete et protege les espaces
 * membre et admin. Cette couche ameliore l'experience : elle ne remplace
 * jamais la RLS ni les controles serveur (Document Technique V1, 12.1).
 *
 * Next 16 a renomme la convention `middleware` en `proxy`.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv().NEXT_PUBLIC_SUPABASE_URL,
    publicEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected =
    pathname.startsWith('/app') || pathname.startsWith('/admin') || pathname.startsWith('/compte');

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/connexion';
    // Ne jamais perdre l'intention de depart (Spec UX/UI, section 17).
    loginUrl.searchParams.set('suite', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
