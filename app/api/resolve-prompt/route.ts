import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { consumeRateLimit, hashIp } from '@/lib/rate-limit';
import { resolvePromptInput } from '@/lib/validation/schemas';

/**
 * Seule voie d'acces au prompt complet.
 *
 * La verification n'est pas faite ici mais dans la fonction SQL
 * `resolve_prompt`, qui controle dans l'ordre : session, appareil actif,
 * droit d'acces, prompt publie, variante publiee, version courante. La route
 * n'ajoute que le rate limiting et la traduction des erreurs.
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

  if (!user) {
    return NextResponse.json(
      { error: 'Reconnectez-vous pour continuer.' },
      { status: 401, headers: noStore },
    );
  }

  const { allowed } = await consumeRateLimit('resolution', user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de copies en peu de temps. Patientez un instant.' },
      { status: 429, headers: noStore },
    );
  }

  const { data, error } = await supabase.rpc('resolve_prompt', {
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
        : 'Votre acces ne permet pas de copier ce raccourci.';

    const forwarded = request.headers.get('x-forwarded-for');
    await createAdminClient()
      .from('security_events')
      .insert({
        event_type: 'resolution_refusee',
        user_id: user.id,
        ip_hash: await hashIp(forwarded?.split(',')[0]?.trim() ?? null),
        meta: { code: error.code ?? null },
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
