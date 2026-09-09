import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { consumeRateLimit, hashIp } from '@/lib/rate-limit';
import { resolvePromptInput } from '@/lib/validation/schemas';

/**
 * Seule voie d'acces au prompt complet.
 *
 * Deux portes, jamais melangees. Un compte connecte passe par
 * `resolve_prompt`, qui controle dans l'ordre : session, appareil actif,
 * droit d'acces, prompt publie, variante publiee, version courante. Un
 * visiteur passe par `resolve_free_prompt`, qui ne rend que les raccourcis
 * marques `is_free` et refuse tout le reste.
 *
 * La verification est faite en base et non ici : la route n'ajoute que le
 * quota et la traduction des erreurs. Un appel direct a l'API, sans passer
 * par cette route, rencontre exactement les memes refus.
 *
 * Elle repond toujours `no-store` : ce contenu ne doit jamais etre mis en
 * cache, ni par le navigateur ni par un CDN (Doc Technique V1, 10.2).
 */
export async function POST(request: NextRequest) {
  const noStore = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requete invalide.' }, { status: 400, headers: noStore });
  }

  const parsed = resolvePromptInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Requete invalide.' }, { status: 400, headers: noStore });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const forwarded = request.headers.get('x-forwarded-for');
  const empreinte = await hashIp(forwarded?.split(',')[0]?.trim() ?? null);

  // Le quota suit le compte quand il y en a un, l'empreinte d'IP sinon : sans
  // sujet propre aux visiteurs, tous auraient partage un meme compteur et le
  // premier a copier aurait ferme la porte aux suivants.
  const { allowed } = await consumeRateLimit('resolution', user ? user.id : `ip:${empreinte}`);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de copies en peu de temps. Patientez un instant.' },
      { status: 429, headers: noStore },
    );
  }

  const { data, error } = user
    ? await supabase.rpc('resolve_prompt', {
        p_prompt_id: parsed.data.promptId,
        p_provider_key: parsed.data.provider,
        p_surface: parsed.data.surface,
      })
    : await supabase.rpc('resolve_free_prompt', {
        p_prompt_id: parsed.data.promptId,
        p_provider_key: parsed.data.provider,
        p_surface: parsed.data.surface,
      });

  if (error) {
    // 28000 : session absente ou appareil deconnecte. 42501 : droit refuse,
    // prompt indisponible ou IA non compatible. Les deux cas renvoient un
    // message identique cote client : on ne revele pas ce qui existe en interne.
    const status = error.code === '28000' ? 401 : 403;
    const message =
      status === 401
        ? 'Reconnectez-vous pour continuer.'
        : user
          ? 'Votre acces ne permet pas de copier ce raccourci.'
          : // Un visiteur n'a rien a reconnecter : ce qui lui manque est
            // l'acces, et le lui dire ainsi le laisse devant une porte sans
            // poignee. La reponse est l'offre.
            'Cette commande est réservée aux membres.';

    await createAdminClient()
      .from('security_events')
      .insert({
        event_type: 'resolution_refusee',
        user_id: user?.id ?? null,
        ip_hash: empreinte,
        meta: { code: error.code ?? null, visiteur: !user },
      });

    return NextResponse.json({ error: message }, { status, headers: noStore });
  }

  const resolved = data?.[0];
  if (!resolved) {
    return NextResponse.json(
      { error: "Ce raccourci n'est pas disponible pour cette IA." },
      { status: 403, headers: noStore },
    );
  }

  return NextResponse.json(
    { command: resolved.command, payload: resolved.payload },
    { headers: noStore },
  );
}
