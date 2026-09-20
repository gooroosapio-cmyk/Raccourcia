import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { consumeRateLimit, hashIp } from '@/lib/rate-limit';
import { resolvePromptInput } from '@/lib/validation/schemas';
import { appliquerLaPersonnalisation, type ChampDeclare } from '@/lib/prompt/personnalisation';

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
 *
 * C'est aussi ici que les champs de personnalisation sont appliques, et
 * nulle part ailleurs. Le navigateur envoie ce qui a ete saisi ; le serveur
 * relit les champs que l'administration a reellement declares pour cette
 * commande, ne retient que ceux-la, et les inscrit comme des donnees. Une
 * substitution faite dans le navigateur reviendrait a laisser le client
 * decider de ce qu'il ajoute au texte.
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

  const declares = await lireLesChampsDeclares(supabase, parsed.data.promptId);
  const saisies = Object.fromEntries(
    (parsed.data.champs ?? []).map((champ) => [champ.cle, champ.valeur]),
  );

  const personnalise = appliquerLaPersonnalisation(resolved.payload, declares, saisies);

  if (!personnalise.ok) {
    // 422 et non 400 : la requete est bien formee, c'est le formulaire qui
    // est incomplet. Le message nomme les champs, sinon il faut deviner
    // lequel manque parmi trois.
    return NextResponse.json(
      {
        error: `Renseignez d'abord : ${personnalise.manquants.join(', ')}.`,
      },
      { status: 422, headers: noStore },
    );
  }

  return NextResponse.json(
    { command: resolved.command, payload: personnalise.texte },
    { headers: noStore },
  );
}

/**
 * Les champs declares pour cette commande, relus au serveur.
 *
 * Jamais ceux que le client annonce : une clef inventee dans la requete ne
 * doit pouvoir atteindre aucune partie du texte, et une contrainte
 * « obligatoire » posee en administration ne doit pas pouvoir etre levee en
 * retirant une ligne de la charge utile.
 *
 * La table est lisible par tous — les champs s'affichent sur la fiche — donc
 * cette lecture passe par le client du demandeur et non par une clef
 * d'administration.
 */
async function lireLesChampsDeclares(
  client: Awaited<ReturnType<typeof createClient>>,
  promptId: string,
): Promise<ChampDeclare[]> {
  const { data } = await client
    .from('prompt_fields')
    .select('cle, libelle, kind, requis, position, prompt_field_choices(valeur)')
    .eq('prompt_id', promptId)
    .order('position');

  return (data ?? []).map((champ) => ({
    cle: champ.cle,
    libelle: champ.libelle,
    genre: champ.kind,
    requis: champ.requis,
    choix: (champ.prompt_field_choices ?? []).map((choix) => choix.valeur),
  }));
}
