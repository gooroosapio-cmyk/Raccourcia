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
/**
 * Routes reservees aux membres ayant l'acces a vie. Liste explicite plutot
 * qu'un prefixe : `/app` doit rester ouvert a tout le monde, c'est la vitrine.
 */
const ESPACES_RESERVES = ['/app/favoris', '/app/recents'];

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

  // Espaces reserves : favoris et historique n'ont de sens qu'une fois qu'on
  // peut copier. Un visiteur sans acces y est ramene au catalogue, fenetre
  // d'offre ouverte.
  //
  // Le renvoi se fait ici et non dans la page : ces routes ont un
  // `loading.tsx`, donc une frontiere Suspense implicite. Next envoie alors
  // la coquille avant que la page ait decide, et un `redirect()` de page
  // partirait dans la charge RSC — une redirection qui ne s'execute que si
  // JavaScript tourne, apres un ecran vide. Le proxy, lui, repond avant tout
  // rendu : c'est un vrai 307.
  //
  // Les pages gardent leur propre renvoi : si le filtre de ce proxy change,
  // elles restent correctes.
  if (user && ESPACES_RESERVES.some((route) => pathname === route)) {
    const { data } = await supabase.rpc('has_active_entitlement');

    if (data !== true) {
      const catalogue = request.nextUrl.clone();
      catalogue.pathname = '/app';
      catalogue.search = '';
      catalogue.searchParams.set('offre', '1');
      return NextResponse.redirect(catalogue);
    }
  }

  return response;
}
