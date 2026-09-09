'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { assertAdmin } from '@/lib/admin/guard';
import { STORAGE_BUCKETS } from '@/lib/constants';
import {
  accessInput,
  categoryInput,
  categoryStatusInput,
  configInput,
  mediaDeleteInput,
  mediaRegisterInput,
  mediaTicketInput,
  newPromptInput,
  promptIdentityInput,
  promptPinnedInput,
  promptStatusInput,
  promptVersionInput,
  variantCompatibilityInput,
} from '@/lib/validation/admin-schemas';

export type AdminActionState = { error?: string; success?: string };

/**
 * Traduit une erreur Postgres en phrase utile.
 *
 * Les fonctions d'administration levent des codes precis lorsqu'un contenu
 * est incomplet : on les rend lisibles plutot que d'afficher un message
 * technique (Spec UX/UI, 13.2).
 */
function readableError(message: string): string {
  if (message.includes('CATEGORIE_REQUISE')) {
    return 'Choisissez une catégorie avant de publier.';
  }
  if (message.includes('DESCRIPTION_REQUISE')) {
    return 'Ajoutez une description courte avant de publier.';
  }
  if (message.includes('VERSION_REQUISE')) {
    return 'Renseignez le prompt complet d’au moins une IA avant de publier.';
  }
  if (message.includes('PAYLOAD_REQUIRED')) {
    return 'Le prompt complet ne peut pas être vide.';
  }
  if (message.includes('FORBIDDEN')) {
    return "Cette action demande un role d'administration.";
  }
  if (message.includes('duplicate key') && message.includes('command')) {
    return 'Cette commande existe déjà dans le catalogue.';
  }
  if (message.includes('duplicate key') && message.includes('slug')) {
    return 'Ce slug est déjà utilise.';
  }
  // Les gardes-fous de hierarchie des categories parlent deja francais :
  // les masquer derriere un message generique priverait l'admin de la raison.
  if (message.includes('hierarchie des catégories')) {
    return 'La hierarchie est limitée à deux niveaux : choisissez une catégorie principale.';
  }
  if (message.includes('mode de sa catégorie parente')) {
    return 'Une sous-catégorie doit avoir le même mode que sa catégorie parente.';
  }
  if (message.includes('sa propre parente')) {
    return 'Une catégorie ne peut pas être sa propre parente.';
  }
  return 'Action impossible. Vérifiez les informations saisies.';
}

/** Convertit une valeur de case a cocher HTML en booleen. */
const checked = (form: FormData, name: string) =>
  form.get(name) === 'on' || form.get(name) === 'true';

// --- Raccourcis -------------------------------------------------------------

export async function createPrompt(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = newPromptInput.safeParse({
    command: formData.get('command'),
    name: formData.get('name'),
    mode: formData.get('mode'),
    shortDescription: formData.get('shortDescription'),
    categoryId: formData.get('categoryId') || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Vérifiez les informations saisies.' };
  }

  const supabase = await createClient();
  const slug = parsed.data.command.slice(1).replace(/[^a-z0-9]+/g, '-');

  const { data, error } = await supabase
    .from('prompts')
    .insert({
      command: parsed.data.command,
      name: parsed.data.name,
      slug,
      mode: parsed.data.mode,
      short_description: parsed.data.shortDescription,
      category_id: parsed.data.categoryId ?? null,
      // Un nouveau raccourci nait toujours en brouillon.
      status: 'draft',
    })
    .select('id')
    .single();

  if (error || !data) return { error: readableError(error?.message ?? '') };

  // Une variante par IA active, prete a recevoir son prompt complet.
  const { data: providers } = await supabase
    .from('ai_providers')
    .select('id')
    .eq('is_active', true);

  if (providers?.length) {
    await supabase.from('prompt_variants').insert(
      providers.map((provider) => ({
        prompt_id: data.id,
        provider_id: provider.id,
        status: 'draft' as const,
      })),
    );
  }

  redirect(`/admin/raccourcis/${data.id}`);
}

export async function updatePromptIdentity(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const promptId = formData.get('promptId');
  if (typeof promptId !== 'string') return { error: 'Raccourci introuvable.' };

  const parsed = promptIdentityInput.safeParse({
    command: formData.get('command'),
    name: formData.get('name'),
    shortDescription: formData.get('shortDescription'),
    mode: formData.get('mode'),
    categoryId: formData.get('categoryId') || undefined,
    intention: formData.get('intention') ?? undefined,
    useCases: formData.get('useCases') ?? undefined,
    tags: formData.get('tags') ?? undefined,
    expectedInput: formData.get('expectedInput') ?? undefined,
    limitations: formData.get('limitations') ?? undefined,
    adminNotes: formData.get('adminNotes') ?? undefined,
    resultSummary: formData.get('resultSummary') ?? undefined,
    inputExamples: formData.getAll('inputExamples'),
    outputFormats: formData.getAll('outputFormats'),
    showImageCard: checked(formData, 'showImageCard'),
    isFree: checked(formData, 'isFree'),
    isFeatured: checked(formData, 'isFeatured'),
    isNew: checked(formData, 'isNew'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Vérifiez les informations saisies.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('prompts')
    .update({
      command: parsed.data.command,
      name: parsed.data.name,
      short_description: parsed.data.shortDescription,
      mode: parsed.data.mode,
      category_id: parsed.data.categoryId ?? null,
      intention: parsed.data.intention ?? null,
      use_cases: parsed.data.useCases,
      tags: parsed.data.tags,
      expected_input: parsed.data.expectedInput ?? null,
      limitations: parsed.data.limitations ?? null,
      admin_notes: parsed.data.adminNotes ?? null,
      result_summary: parsed.data.resultSummary ?? null,
      input_examples: parsed.data.inputExamples,
      output_formats: parsed.data.outputFormats,
      show_image_card: parsed.data.showImageCard,
      is_free: parsed.data.isFree,
      is_featured: parsed.data.isFeatured,
      is_new: parsed.data.isNew,
    })
    .eq('id', promptId);

  if (error) return { error: readableError(error.message) };

  revalidatePath(`/admin/raccourcis/${promptId}`);
  revalidatePath('/app');
  return { success: 'Modifications enregistrées.' };
}

/**
 * Enregistre un prompt complet.
 *
 * Passe par admin_new_prompt_version : l'ancienne version est conservee et
 * marquee retiree, jamais ecrasee.
 */
export async function savePromptVersion(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = promptVersionInput.safeParse({
    promptId: formData.get('promptId'),
    variantId: formData.get('variantId'),
    payload: formData.get('payload'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Prompt complet invalide.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_new_prompt_version', {
    p_variant_id: parsed.data.variantId,
    p_payload: parsed.data.payload,
  });

  if (error) return { error: readableError(error.message) };

  revalidatePath(`/admin/raccourcis/${parsed.data.promptId}`);
  return { success: 'Nouvelle version enregistrée. La précédente est conservée.' };
}

/** Active ou desactive une IA pour ce raccourci. */
export async function setVariantPublished(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = variantCompatibilityInput.safeParse({
    promptId: formData.get('promptId'),
    variantId: formData.get('variantId'),
    published: formData.get('published'),
  });
  if (!parsed.success) return { error: 'Variante introuvable.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('prompt_variants')
    .update({ status: parsed.data.published ? 'published' : 'draft' })
    .eq('id', parsed.data.variantId);

  if (error) return { error: readableError(error.message) };

  revalidatePath(`/admin/raccourcis/${parsed.data.promptId}`);
  revalidatePath('/app');
  return { success: parsed.data.published ? 'IA activée.' : 'IA désactivée.' };
}

export async function setPromptStatus(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = promptStatusInput.safeParse({
    promptId: formData.get('promptId'),
    status: formData.get('status'),
  });
  if (!parsed.success) return { error: 'Statut invalide.' };

  const supabase = await createClient();

  // Une carte visuelle sans comparaison complete ne montre rien de ce que la
  // commande produit. On refuse la publication plutot que de laisser passer
  // une fiche muette, que personne ne reviendra completer.
  if (parsed.data.status === 'published') {
    const { data: prompt } = await supabase
      .from('prompts')
      .select('show_image_card, prompt_media(kind)')
      .eq('id', parsed.data.promptId)
      .maybeSingle();

    const media = (prompt?.prompt_media ?? []) as { kind: string }[];
    const manquants = ['before', 'after'].filter(
      (kind) => !media.some((entry) => entry.kind === kind),
    );

    if (prompt?.show_image_card && manquants.length > 0) {
      return {
        error:
          'Ajoutez les visuels Avant et Après avant de publier, ou désactivez la carte avec visuel.',
      };
    }
  }

  const { error } = await supabase.rpc('admin_set_prompt_status', {
    p_prompt_id: parsed.data.promptId,
    p_status: parsed.data.status,
  });

  if (error) return { error: readableError(error.message) };

  revalidatePath(`/admin/raccourcis/${parsed.data.promptId}`);
  revalidatePath('/admin/raccourcis');
  revalidatePath('/app');

  const labels = {
    published: 'Raccourci publié. Il est visible par les membres.',
    draft: 'Raccourci repasse en brouillon. Il n’est plus visible.',
    archived: 'Raccourci archivé. Les données sont conservées.',
  } as const;

  return { success: labels[parsed.data.status] };
}

/**
 * Epingle ou desepingle un raccourci.
 *
 * L'etoile est un outil d'administration : elle ne s'affiche nulle part cote
 * membre, seul l'ordre du catalogue en porte la trace. Elle est distincte de
 * `is_featured`, que le classeur V3 a pose sur 142 raccourcis — une mise en
 * avant choisie s'y serait noyee.
 *
 * Le controle du role est fait deux fois : ici pour repondre proprement, et
 * dans la fonction `admin_set_prompt_pinned`, qui refuse tout appel direct
 * d'un compte sans role. Le second est celui qui protege.
 */
export async function setPromptPinned(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = promptPinnedInput.safeParse({
    promptId: formData.get('promptId'),
    pinned: formData.get('pinned') === 'true',
  });
  if (!parsed.success) return { error: 'Demande invalide.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_set_prompt_pinned', {
    p_prompt_id: parsed.data.promptId,
    p_pinned: parsed.data.pinned,
  });

  if (error) return { error: readableError(error.message) };

  revalidatePath('/admin/raccourcis');
  revalidatePath(`/admin/raccourcis/${parsed.data.promptId}`);
  revalidatePath('/app');

  return {
    success: parsed.data.pinned
      ? 'Raccourci remonte en tete de sa categorie.'
      : 'Raccourci remis dans l’ordre du catalogue.',
  };
}

// --- Categories -------------------------------------------------------------

export async function saveCategory(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = categoryInput.safeParse({
    id: formData.get('id') || undefined,
    name: formData.get('name'),
    slug: formData.get('slug'),
    mode: formData.get('mode'),
    parentId: formData.get('parentId') || undefined,
    shortDescription: formData.get('shortDescription') ?? undefined,
    sortOrder: formData.get('sortOrder') ?? 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Vérifiez les informations saisies.' };
  }

  const supabase = await createClient();
  const values = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    mode: parsed.data.mode,
    parent_id: parsed.data.parentId ?? null,
    short_description: parsed.data.shortDescription ?? null,
    sort_order: parsed.data.sortOrder,
  };

  const { error } = parsed.data.id
    ? await supabase.from('categories').update(values).eq('id', parsed.data.id)
    : // Une nouvelle categorie nait en brouillon : on la publie une fois prete.
      await supabase.from('categories').insert({ ...values, status: 'draft' });

  if (error) return { error: readableError(error.message) };

  revalidatePath('/admin/categories');
  revalidatePath('/app');
  return { success: parsed.data.id ? 'Catégorie enregistrée.' : 'Catégorie créée en brouillon.' };
}

export async function setCategoryStatus(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = categoryStatusInput.safeParse({
    categoryId: formData.get('categoryId'),
    status: formData.get('status'),
  });
  if (!parsed.success) return { error: 'Statut invalide.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_set_category_status', {
    p_category_id: parsed.data.categoryId,
    p_status: parsed.data.status,
  });

  if (error) return { error: readableError(error.message) };

  revalidatePath('/admin/categories');
  revalidatePath('/app');

  const labels = {
    published: 'Catégorie publiée. Ses raccourcis redeviennent visibles.',
    draft: 'Catégorie désactivée. Ses raccourcis sont masqués, rien n’est supprime.',
    archived: 'Catégorie archivée. Ses raccourcis sont masqués, rien n’est supprime.',
  } as const;

  return { success: labels[parsed.data.status] };
}

// --- Medias -----------------------------------------------------------------

const ALLOWED_TYPES = ['image/webp', 'image/avif', 'image/png', 'image/jpeg'];
const MAX_BYTES = 10 * 1024 * 1024;

export type MediaTicket = { error: string } | { path: string; token: string };

/**
 * Autorise un envoi, sans faire transiter le fichier par le serveur.
 *
 * Une action serveur plafonne le corps de la requete a 1 Mo, et l'hebergeur a
 * quelques megaoctets de plus. Une photo de telephone depasse les deux : le
 * formulaire precedent annoncait 10 Mo et levait bien avant, ce qui affichait
 * la page d'erreur globale sans jamais dire pourquoi.
 *
 * Le navigateur depose donc le fichier directement dans le bucket, muni d'une
 * autorisation a usage unique delivree ici. Elle ne vaut que pour ce chemin,
 * ne donne aucun droit de lecture ailleurs, et n'expose aucune cle : la
 * verification d'administration reste entiere, cote serveur.
 *
 * Le chemin est versionne par horodatage : remplacer une image ne casse pas
 * le cache CDN des anciennes (Blueprint Backend V1, 9.2).
 */
export async function createMediaTicket(input: {
  promptId: string;
  kind: string;
  contentType: string;
  size: number;
}): Promise<MediaTicket> {
  await assertAdmin();

  const parsed = mediaTicketInput.safeParse(input);
  if (!parsed.success) {
    // Le schema porte deja les deux bornes ; on les redit en clair plutot que
    // de renvoyer un message de validation generique.
    if (!ALLOWED_TYPES.includes(input.contentType)) {
      return { error: 'Formats acceptes : WebP, AVIF, PNG ou JPEG.' };
    }
    if (input.size > MAX_BYTES) {
      return { error: 'Image trop lourde. 10 Mo maximum.' };
    }
    return { error: 'Visuel invalide.' };
  }

  const supabase = await createClient();
  const extension = EXTENSIONS[parsed.data.contentType];
  const path = `prompts/${parsed.data.promptId}/${parsed.data.kind}-${Date.now()}.${extension}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.PROMPT_MEDIA)
    .createSignedUploadUrl(path);

  if (error || !data) return { error: 'Envoi impossible pour le moment. Réessayez.' };

  return { path: data.path, token: data.token };
}

/**
 * L'extension vient du type declare, jamais du nom de fichier.
 *
 * Un nom de fichier est saisi par l'utilisateur : le laisser decider de
 * l'extension stockee reviendrait a lui laisser choisir ce que le CDN servira.
 */
const EXTENSIONS: Record<string, string> = {
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

/**
 * Enregistre le visuel une fois depose.
 *
 * Un seul visuel par type et par raccourci : renvoyer un Avant remplace le
 * precedent au lieu d'empiler des doublons dont personne ne saurait lequel
 * s'affiche.
 */
export async function registerPromptMedia(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = mediaRegisterInput.safeParse({
    promptId: formData.get('promptId'),
    kind: formData.get('kind'),
    path: formData.get('path'),
    alt: formData.get('alt') ?? undefined,
  });
  if (!parsed.success) return { error: 'Informations de visuel invalides.' };

  // Le chemin vient du navigateur : on refuse tout ce qui ne designe pas le
  // raccourci vise, quel que soit ce que le client raconte.
  const prefixe = `prompts/${parsed.data.promptId}/`;
  if (!parsed.data.path.startsWith(prefixe) || parsed.data.path.includes('..')) {
    return { error: 'Chemin de visuel refuse.' };
  }

  const supabase = await createClient();

  const { data: anciens } = await supabase
    .from('prompt_media')
    .select('id, storage_path')
    .eq('prompt_id', parsed.data.promptId)
    .eq('kind', parsed.data.kind);

  const { error } = await supabase.from('prompt_media').insert({
    prompt_id: parsed.data.promptId,
    kind: parsed.data.kind,
    storage_path: parsed.data.path,
    alt: parsed.data.alt ?? null,
  });

  if (error) return { error: readableError(error.message) };

  // Le remplacement n'efface qu'apres une insertion reussie : en cas d'echec,
  // l'ancien visuel est toujours la.
  for (const ancien of anciens ?? []) {
    await supabase.from('prompt_media').delete().eq('id', ancien.id);
    if (ancien.storage_path) {
      await supabase.storage.from(STORAGE_BUCKETS.PROMPT_MEDIA).remove([ancien.storage_path]);
    }
  }

  revalidatePath(`/admin/raccourcis/${parsed.data.promptId}`);
  revalidatePath('/app');
  return { success: 'Visuel enregistré.' };
}

export async function deletePromptMedia(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = mediaDeleteInput.safeParse({
    promptId: formData.get('promptId'),
    mediaId: formData.get('mediaId'),
  });
  if (!parsed.success) return { error: 'Visuel introuvable.' };

  const supabase = await createClient();
  const { data: media } = await supabase
    .from('prompt_media')
    .select('storage_path')
    .eq('id', parsed.data.mediaId)
    .maybeSingle();

  await supabase.from('prompt_media').delete().eq('id', parsed.data.mediaId);

  if (media?.storage_path) {
    await supabase.storage.from(STORAGE_BUCKETS.PROMPT_MEDIA).remove([media.storage_path]);
  }

  revalidatePath(`/admin/raccourcis/${parsed.data.promptId}`);
  revalidatePath('/app');
  return { success: 'Visuel retiré.' };
}

// --- Support et parametres --------------------------------------------------

export async function setMemberAccess(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = accessInput.safeParse({
    userId: formData.get('userId'),
    active: formData.get('active'),
    reason: formData.get('reason') ?? undefined,
  });
  if (!parsed.success) return { error: 'Compte introuvable.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_set_access', {
    p_user_id: parsed.data.userId,
    p_active: parsed.data.active,
    p_reason: parsed.data.reason,
  });

  if (error) return { error: readableError(error.message) };

  revalidatePath('/admin/membres');
  return {
    success: parsed.data.active ? 'Accès à vie accordé.' : 'Accès retiré. Le compte est conserve.',
  };
}

export async function setConfigValue(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = configInput.safeParse({
    key: formData.get('key'),
    value: formData.get('value'),
  });
  if (!parsed.success) return { error: 'Parametre invalide.' };

  // Les valeurs sont stockees en JSON : true/false, un nombre, ou du texte.
  let value: unknown = parsed.data.value;
  if (parsed.data.value === 'true') value = true;
  else if (parsed.data.value === 'false') value = false;
  else if (/^\d+$/.test(parsed.data.value)) value = Number(parsed.data.value);

  const supabase = await createClient();
  const { error } = await supabase
    .from('app_config')
    .update({ value: value as never })
    .eq('key', parsed.data.key);

  if (error) return { error: readableError(error.message) };

  revalidatePath('/admin/parametres');
  revalidatePath('/app');
  return { success: 'Parametre enregistré.' };
}
