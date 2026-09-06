'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { consumeRateLimit, hashIp } from '@/lib/rate-limit';
import { fingerprintLicense, normalizeEmail } from '@/lib/access/license';
import { deviceLabelFromUserAgent, registerCurrentSession } from '@/lib/auth/session';
import { claimAccessInput, signInInput, revokeSessionInput } from '@/lib/validation/schemas';
import type { Json } from '@/lib/supabase/database.types';

/**
 * Resultat d'une action de formulaire. Les messages restent courts et parlent
 * a l'utilisateur, jamais le vocabulaire du backend (Spec UX/UI, 13.2).
 */
export type ActionState = { error?: string; success?: string };

/** IP de la requete, uniquement pour le rate limiting (jamais stockee en clair). */
async function requestFingerprint(): Promise<{ ipHash: string; userAgent: string | null }> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? headerList.get('x-real-ip');
  return { ipHash: await hashIp(ip), userAgent: headerList.get('user-agent') };
}

async function logSecurityEvent(eventType: string, ipHash: string, meta?: Json) {
  const supabase = createAdminClient();
  await supabase
    .from('security_events')
    .insert({ event_type: eventType, ip_hash: ipHash, meta: meta ?? null });
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInInput.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: 'Vérifiez votre email et votre mot de passe.' };
  }

  const { ipHash, userAgent } = await requestFingerprint();
  const { allowed } = await consumeRateLimit('connexion', `${ipHash}:${parsed.data.email}`);
  if (!allowed) {
    await logSecurityEvent('connexion_rate_limited', ipHash);
    return { error: 'Trop de tentatives. Réessayez dans quelques minutes.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    await logSecurityEvent('connexion_echouee', ipHash);
    // Ne jamais indiquer laquelle des deux informations est fausse.
    return { error: 'Email ou mot de passe incorrect.' };
  }

  await registerCurrentSession(deviceLabelFromUserAgent(userAgent));

  const next = formData.get('suite');
  redirect(typeof next === 'string' && next.startsWith('/') ? next : '/app');
}

/**
 * Activation : l'acheteur transforme sa preuve d'achat en compte.
 *
 * On exige simultanement l'email de la vente et la licence (Doc Technique V1,
 * 8.2). Aucun message ne dit laquelle des deux est fausse, et la licence
 * n'est comparee que par empreinte.
 */
export async function claimAccess(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = claimAccessInput.safeParse({
    email: formData.get('email'),
    license: formData.get('license'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return {
      error: 'Vérifiez les informations saisies. Le mot de passe fait 8 caractères minimum.',
    };
  }

  const { ipHash, userAgent } = await requestFingerprint();
  const { allowed } = await consumeRateLimit('activation', `${ipHash}:${parsed.data.email}`);
  if (!allowed) {
    await logSecurityEvent('activation_rate_limited', ipHash);
    return { error: 'Trop de tentatives. Réessayez dans une trentaine de minutes.' };
  }

  const email = normalizeEmail(parsed.data.email);
  const fingerprint = fingerprintLicense(parsed.data.license);
  const admin = createAdminClient();

  const { data: purchase } = await admin
    .from('purchases')
    .select('id, user_id, product_id, status')
    .eq('customer_email', email)
    .eq('license_fingerprint', fingerprint)
    .maybeSingle();

  if (!purchase || purchase.status !== 'completed') {
    await logSecurityEvent('activation_echouee', ipHash);
    return { error: "Nous ne trouvons pas d'achat correspondant a cet email et cette licence." };
  }

  // Un achat deja rattache ne peut pas etre revendique par un autre compte.
  if (purchase.user_id) {
    return {
      error: 'Cet accès est déjà rattaché à un compte. Connectez-vous, ou récupérez votre accès.',
    };
  }

  // Un compte peut deja exister pour cet email : rachat, ou compte ouvert par
  // une autre voie. Sans ce cas, `createUser` echouait et l'acheteur restait
  // sans issue : la recuperation, elle, exige un achat deja rattache. Il avait
  // paye et ne pouvait ni activer, ni recuperer.
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  let userId: string;

  if (existing) {
    // Le mot de passe du compte existant n'est jamais remplace ici : la licence
    // prouve l'achat, pas la possession du compte. Changer un mot de passe
    // reste le seul fait de la recuperation, qui devient justement accessible
    // une fois l'achat rattache ci-dessous.
    userId = existing.id;
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: parsed.data.password,
      email_confirm: true,
    });

    if (createError || !created.user) {
      return { error: 'Impossible de créer le compte. Réessayez ou contactez le support.' };
    }
    userId = created.user.id;
  }

  await admin
    .from('purchases')
    .update({ user_id: userId, claimed_at: new Date().toISOString() })
    .eq('id', purchase.id);

  if (purchase.product_id) {
    await admin.from('entitlements').upsert(
      {
        user_id: userId,
        product_id: purchase.product_id,
        access_type: 'lifetime',
        status: 'active',
        source_purchase_id: purchase.id,
      },
      { onConflict: 'user_id,product_id' },
    );
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  // Compte preexistant dont le mot de passe saisi n'est pas celui du compte :
  // l'acces est acquis, il ne manque que la connexion. On le dit clairement
  // plutot que de rediriger vers un espace membre qui renverrait au login.
  if (signInError) {
    return {
      success:
        'Votre accès a été ajouté à votre compte existant. Connectez-vous avec votre mot de passe habituel, ou passez par la récupération si vous l’avez oublié.',
    };
  }

  await registerCurrentSession(deviceLabelFromUserAgent(userAgent));

  redirect('/app');
}

/**
 * Recuperation d'acces : licence + email d'achat, puis nouveau mot de passe.
 * Cette voie evite de dependre d'emails transactionnels au lancement.
 */
export async function recoverAccess(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = claimAccessInput.safeParse({
    email: formData.get('email'),
    license: formData.get('license'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: 'Vérifiez les informations saisies.' };
  }

  const { ipHash, userAgent } = await requestFingerprint();
  const { allowed } = await consumeRateLimit('recuperation', `${ipHash}:${parsed.data.email}`);
  if (!allowed) {
    await logSecurityEvent('recuperation_rate_limited', ipHash);
    return { error: 'Trop de tentatives. Réessayez dans une trentaine de minutes.' };
  }

  const email = normalizeEmail(parsed.data.email);
  const fingerprint = fingerprintLicense(parsed.data.license);
  const admin = createAdminClient();

  const { data: purchase } = await admin
    .from('purchases')
    .select('id, user_id')
    .eq('customer_email', email)
    .eq('license_fingerprint', fingerprint)
    .maybeSingle();

  if (!purchase?.user_id) {
    await logSecurityEvent('recuperation_echouee', ipHash);
    return { error: "Nous ne trouvons pas d'acces correspondant a cet email et cette licence." };
  }

  const { error } = await admin.auth.admin.updateUserById(purchase.user_id, {
    password: parsed.data.password,
  });
  if (error) {
    return { error: 'Impossible de mettre à jour le mot de passe. Contactez le support.' };
  }

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  await registerCurrentSession(deviceLabelFromUserAgent(userAgent));

  redirect('/app');
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

/** Deconnecte un appareil depuis Compte > Mes appareils. */
export async function revokeSession(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = revokeSessionInput.safeParse({ sessionId: formData.get('sessionId') });
  if (!parsed.success) return { error: 'Appareil introuvable.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('app_sessions')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', parsed.data.sessionId);

  if (error) return { error: 'Impossible de déconnecter cet appareil.' };

  revalidatePath('/compte');
  return { success: 'Appareil déconnecté.' };
}
