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

/**
 * Seul espace ferme aux visiteurs.
 *
 * La bibliotheque et la page Compte s'ouvrent sans compte : c'est la vitrine,
 * et un visiteur doit pouvoir voir ce qu'il achete avant d'ouvrir un compte.
 * Ce qui se paie n'est pas la vue des cartes mais le contenu des commandes, et
 * celui-ci ne sort que par `resolve_prompt`, apres ses six controles.
 */
const ESPACE_ADMIN = '/admin';

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

  /**
   * Renvoi qui conserve les cookies rafraichis.
   *
   * `getUser()` ci-dessous peut renouveler la session : Supabase fait alors
   * tourner le jeton de rafraichissement et ecrit le nouveau couple sur
   * `response`. Repondre par une redirection neuve laissait ces cookies au
   * sol : le navigateur gardait l'ancien jeton, deja consomme, et la session
   * mourait au chargement suivant — le membre devait retaper son mot de passe
   * alors qu'il ne s'etait jamais deconnecte.
   */
  const renvoyer = (url: URL) => {
    const redirection = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirection.cookies.set(cookie);
    }
    return redirection;
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith(ESPACE_ADMIN)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/connexion';
    // Ne jamais perdre l'intention de depart (Spec UX/UI, section 17).
    loginUrl.searchParams.set('suite', pathname);
    return renvoyer(loginUrl);
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
  if (ESPACES_RESERVES.some((route) => pathname === route)) {
    // Un visiteur n'a ni favoris ni historique : inutile d'interroger la base
    // pour savoir ce que l'absence de compte dit deja.
    //
    // Le role d'administration ouvre aussi ces pages. Un compte de l'equipe
    // n'a pas d'entitlement — il n'a rien achete — et se faisait donc renvoyer
    // au catalogue, fenetre d'offre ouverte, sur ses propres favoris.
    let autorise = false;
    if (user) {
      const { data } = await supabase.rpc('has_active_entitlement');
      autorise = data === true;
      if (!autorise) {
        const { data: administrateur } = await supabase.rpc('is_admin');
        autorise = administrateur === true;
      }
    }

    if (!autorise) {
      const catalogue = request.nextUrl.clone();
      catalogue.pathname = '/app';
      catalogue.search = '';
      catalogue.searchParams.set('offre', '1');
      return renvoyer(catalogue);
    }
  }

  return response;
}
