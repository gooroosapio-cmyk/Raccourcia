import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { consumeRateLimit, hashIp } from '@/lib/rate-limit';
import { copieReussieInput } from '@/lib/validation/schemas';

/**
 * Inscrit une copie, une fois le presse-papiers reellement ecrit.
 *
 * Le navigateur l'appelle apres `navigator.clipboard`, jamais avant : c'est
 * ce qui fait que l'historique et les statistiques ne comptent que des
 * copies qui ont eu lieu. `enregistrer_copie` refait les controles d'acces
 * et ignore un doublon du meme membre dans les dix secondes.
 *
 * L'echec de cet appel ne se montre pas au membre : sa copie a reussi, et
 * c'est la seule chose qu'il a demandee. La route repond donc sans detail.
 */
export async function POST(request: NextRequest) {
  const noStore = { 'Cache-Control': 'no-store' };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: noStore });
  }

  const parsed = copieReussieInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400, headers: noStore });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const forwarded = request.headers.get('x-forwarded-for');
  const empreinte = await hashIp(forwarded?.split(',')[0]?.trim() ?? null);
  const { allowed } = await consumeRateLimit('copie', user ? user.id : `ip:${empreinte}`);
  if (!allowed) return NextResponse.json({ ok: false }, { status: 429, headers: noStore });

  const { data, error } = await supabase.rpc('enregistrer_copie', {
    p_prompt_id: parsed.data.promptId,
    p_version_id: parsed.data.versionId,
    p_provider_key: parsed.data.provider,
    p_surface: parsed.data.surface,
  });

  if (error) {
    const status = error.code === '28000' ? 401 : 403;
    return NextResponse.json({ ok: false }, { status, headers: noStore });
  }

  // `false` : un doublon, ignore. Ce n'est pas une erreur.
  return NextResponse.json({ ok: true, inscrite: data === true }, { headers: noStore });
}
