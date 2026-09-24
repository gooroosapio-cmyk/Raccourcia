'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { assertAdmin } from '@/lib/admin/guard';
import { PAYLOAD_CANONIQUE, STORAGE_BUCKETS } from '@/lib/constants';
import { lireLesChoix } from '@/lib/admin/choix';
import {
  accessInput,
  categoryInput,
  categoryStatusInput,
  configInput,
  mediaDeleteInput,
  mediaRegisterInput,
  mediaTicketInput,
  newPromptInput,
  promptFreeInput,
  promptIdInput,
  promptIdentityInput,
  promptPinnedInput,
  promptStatusInput,
  promptVersionInput,
  variantCompatibilityInput,
  promptsEnMasseInput,
  tagInput,
  tagDeleteInput,
  promptFieldInput,
  promptFieldDeleteInput,
  promptDeleteInput,
  categoryDeleteInput,
  promptTagsInput,
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
    return 'Cette action demande un rôle d’administration.';
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
  // Les refus de suppression portent leur compte : le dire evite d'aller
  // le chercher ailleurs avant de decider.
  const liens = message.match(/LIENS_ANCIENS:(\d+)/);
  if (liens) {
    return `${liens[1]} ancien(s) lien(s) mènent à cette commande. Cochez « emporter les anciens liens » pour les supprimer aussi : ils cesseront de fonctionner.`;
  }
  const reaffectation = message.match(/REAFFECTATION_REQUISE:(\d+)/);
  if (reaffectation) {
    return `Ce rayon porte encore ${reaffectation[1]} commande(s). Choisissez où elles vont avant de le supprimer.`;
  }
  if (message.includes('REAFFECTATION_INVALIDE')) {
    return 'Ce rayon part avec celui que vous supprimez : choisissez-en un autre.';
  }
  if (message.includes('REAFFECTATION_INCONNUE')) {
    return 'Le rayon de destination n’existe plus.';
  }
  if (message.includes('TAG_SLUG_VIDE')) {
    return 'Ce tag n’a pas de nom utilisable : ajoutez au moins une lettre ou un chiffre.';
  }
  if (message.includes('CHAMP_CLE_VIDE')) {
    return 'La clé du champ n’a pas de nom utilisable : ajoutez au moins une lettre ou un chiffre.';
  }
  if (message.includes('prompt_fields_position_check')) {
    return 'Trois champs au maximum, aux positions 1, 2 et 3.';
  }
  if (message.includes('NOT_FOUND')) {
    return 'Cet élément n’existe plus.';
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

  // La variante canonique, qui porte le texte servi a toutes les IA, et une
  // variante par IA active tant que l'interface les liste encore.
  const { data: providers } = await supabase
    .from('ai_providers')
    .select('id')
    .or(`is_active.eq.true,key.eq.${PAYLOAD_CANONIQUE}`);

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
    library: formData.get('library') || undefined,
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
    entityType: formData.get('entityType') || undefined,
    univers: formData.get('univers') ?? undefined,
    searchKeywords: formData.get('searchKeywords') ?? undefined,
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
      // Jamais remise a `null` : le declencheur la recalculerait aussitot,
      // ce qui defairait silencieusement une correction faite ici.
      ...(parsed.data.library ? { library: parsed.data.library } : {}),
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
      entity_type: parsed.data.entityType ?? null,
      univers: parsed.data.univers ?? null,
      search_keywords: parsed.data.searchKeywords,
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

  // Publier sans visuel etait autrefois refuse : la carte se serait affichee
  // muette. Ce n'est plus le cas — le catalogue regroupe ces commandes sous
  // « Encore sans visuel », ou l'absence d'apercu est dite, et les trie apres
  // les autres. Garder le refus ferait du bouton « masquer » une porte a sens
  // unique : 111 des 330 cartes visuelles publiees n'ont pas encore leur
  // paire, et aucune ne pourrait etre remise en ligne apres avoir ete masquee.
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

/**
 * Offre un raccourci, ou le remet derriere l'acces.
 *
 * Le palier d'essai se decide en parcourant le catalogue, pas en editant
 * une fiche : c'est en voyant les cartes cote a cote qu'on juge laquelle
 * montre le mieux ce que le produit sait faire.
 *
 * Un raccourci offert est copiable par n'importe qui, sans compte. Le
 * controle du role est fait deux fois : ici pour repondre proprement, et
 * dans `admin_set_prompt_free`, qui refuse tout appel direct. Le second est
 * celui qui protege.
 */
export async function setPromptFree(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = promptFreeInput.safeParse({
    promptId: formData.get('promptId'),
    free: formData.get('free') === 'true',
  });
  if (!parsed.success) return { error: 'Demande invalide.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_set_prompt_free', {
    p_prompt_id: parsed.data.promptId,
    p_free: parsed.data.free,
  });

  if (error) return { error: readableError(error.message) };

  revalidatePath('/admin/raccourcis');
  revalidatePath(`/admin/raccourcis/${parsed.data.promptId}`);
  revalidatePath('/app');

  return {
    success: parsed.data.free
      ? 'Raccourci offert. Il se copie sans compte.'
      : 'Raccourci remis derriere l’acces a vie.',
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

/**
 * Applique un geste a une selection de raccourcis.
 *
 * A quelques centaines d'entrees, publier un par un tient encore. A
 * plusieurs milliers, c'est ce qui empeche de travailler : une vague d'import
 * arrive en brouillon, et il faut cinquante gestes pour la mettre en ligne.
 *
 * Rien n'est contourne. La base repete exactement l'appel unitaire pour
 * chaque identifiant : publier passe toujours par les controles de qualite,
 * et chaque ligne laisse sa trace dans le journal. Une commande refusee
 * n'annule pas les autres — le resultat dit combien sont passees, combien ont
 * ete refusees et pourquoi, sans quoi il faudrait rouvrir les cinquante pour
 * trouver laquelle bloque.
 */
export async function appliquerEnMasse(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = promptsEnMasseInput.safeParse({
    ids: formData.getAll('ids').filter((valeur) => typeof valeur === 'string'),
    operation: formData.get('operation'),
  });
  if (!parsed.success) {
    return {
      error:
        formData.getAll('ids').length > 200
          ? 'Sélection trop large : 200 raccourcis au maximum d’un seul geste.'
          : 'Sélectionnez au moins un raccourci.',
    };
  }

  const { ids, operation } = parsed.data;
  const supabase = await createClient();

  const statuts = {
    publier: 'published',
    brouillon: 'draft',
    archiver: 'archived',
  } as const;

  const { data, error } =
    operation === 'offrir' || operation === 'reserver'
      ? await supabase.rpc('admin_set_prompts_free', {
          p_prompt_ids: ids,
          p_free: operation === 'offrir',
        })
      : await supabase.rpc('admin_set_prompts_status', {
          p_prompt_ids: ids,
          p_status: statuts[operation],
        });

  if (error) return { error: readableError(error.message) };

  const resultat = data?.[0];
  const traites = resultat?.traites ?? 0;
  const refuses = resultat?.refuses ?? 0;

  revalidatePath('/admin/raccourcis');
  revalidatePath('/admin');
  revalidatePath('/app');

  const gestes = {
    publier: 'publié',
    brouillon: 'repassé en brouillon',
    archiver: 'archivé',
    offrir: 'offert',
    reserver: 'remis derrière l’accès à vie',
  } as const;

  const fait = `${traites} raccourci${traites > 1 ? 's' : ''} ${gestes[operation]}${
    traites > 1 && operation !== 'reserver' ? 's' : ''
  }.`;

  if (refuses === 0) return { success: fait };

  // Le motif, et non un simple decompte : « 2 refusés » oblige a rouvrir la
  // liste entiere pour comprendre, alors que la raison tient en une phrase.
  const motifs = (resultat?.motifs ?? []).map(readableError).join(' ');
  return {
    success: fait,
    error: `${refuses} refusé${refuses > 1 ? 's' : ''}. ${motifs}`.trim(),
  };
}

// --- Tags (V3) --------------------------------------------------------------

/**
 * Cree ou met a jour un tag.
 *
 * Passe par la table et non par une fonction : la politique
 * `tags_administration` n'ouvre l'ecriture qu'a un administrateur, et il n'y
 * a ici aucune regle croisee a faire respecter. Le slug, lui, est normalise
 * par un declencheur — deux ecritures d'une meme idee ne peuvent pas creer
 * deux tags.
 */
export async function enregistrerTag(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = tagInput.safeParse({
    id: formData.get('id') || undefined,
    slug: formData.get('slug'),
    name: formData.get('name'),
    groupe: formData.get('groupe'),
    description: formData.get('description') ?? undefined,
    imagePath: formData.get('imagePath') ?? undefined,
    isActive: checked(formData, 'isActive'),
    sortOrder: formData.get('sortOrder') ?? 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Vérifiez les informations saisies.' };
  }

  const supabase = await createClient();
  const valeurs = {
    slug: parsed.data.slug,
    name: parsed.data.name,
    groupe: parsed.data.groupe,
    description: parsed.data.description ?? null,
    image_path: parsed.data.imagePath ?? null,
    is_active: parsed.data.isActive,
    sort_order: parsed.data.sortOrder,
  };

  const { error } = parsed.data.id
    ? await supabase.from('tags').update(valeurs).eq('id', parsed.data.id)
    : await supabase.from('tags').insert(valeurs);

  if (error) return { error: readableError(error.message) };

  revalidatePath('/admin/tags');
  revalidatePath('/app');
  revalidatePath('/app/bibliotheque');
  return { success: parsed.data.id ? 'Tag enregistré.' : 'Tag créé.' };
}

/**
 * Supprime un tag, definitivement.
 *
 * Le moins lourd des trois gestes de suppression : un tag qualifie, il ne
 * porte rien. Aucune commande ne disparait — elles perdent une etiquette, et
 * le bilan rendu par la base dit combien.
 */
export async function supprimerTag(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = tagDeleteInput.safeParse({ tagId: formData.get('tagId') });
  if (!parsed.success) return { error: 'Tag introuvable.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_supprimer_tag', {
    p_tag_id: parsed.data.tagId,
  });

  if (error) return { error: readableError(error.message) };

  revalidatePath('/admin/tags');
  revalidatePath('/app');
  revalidatePath('/app/bibliotheque');

  const bilan = (data ?? {}) as { nom?: string; commandes?: number };
  const touchees = bilan.commandes ?? 0;
  return {
    success:
      touchees > 0
        ? `Tag « ${bilan.nom} » supprimé. ${touchees} commande(s) ont perdu cette étiquette.`
        : `Tag « ${bilan.nom} » supprimé.`,
  };
}

// --- Champs de personnalisation (V3) ----------------------------------------

/**
 * Cree ou met a jour un champ, et remplace ses choix.
 *
 * Les choix sont reecrits entierement plutot que rapproches un a un : un
 * champ en porte trois ou quatre, et un rapprochement partiel laisserait des
 * valeurs orphelines qu'aucun formulaire ne propose plus.
 *
 * Une ligne de choix s'ecrit « valeur | Libelle », ou simplement « Libelle » —
 * la valeur est alors le libelle. C'est la valeur qui entre dans le texte
 * copie, le libelle n'existe que pour le menu.
 */
export async function enregistrerChamp(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = promptFieldInput.safeParse({
    id: formData.get('id') || undefined,
    promptId: formData.get('promptId'),
    cle: formData.get('cle'),
    libelle: formData.get('libelle'),
    indication: formData.get('indication') ?? undefined,
    kind: formData.get('kind'),
    requis: checked(formData, 'requis'),
    position: formData.get('position'),
    choix: formData.get('choix') ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Vérifiez les informations saisies.' };
  }

  // Un champ « liste » sans choix ne se remplit pas : la fiche l'ecarterait
  // en silence, et l'administration croirait l'avoir pose.
  if (parsed.data.kind === 'liste' && parsed.data.choix.length === 0) {
    return { error: 'Un champ à choix demande au moins une option, une par ligne.' };
  }

  const supabase = await createClient();
  const valeurs = {
    prompt_id: parsed.data.promptId,
    cle: parsed.data.cle,
    libelle: parsed.data.libelle,
    indication: parsed.data.indication ?? null,
    kind: parsed.data.kind,
    requis: parsed.data.requis,
    position: parsed.data.position,
  };

  const { data: champ, error } = parsed.data.id
    ? await supabase
        .from('prompt_fields')
        .update(valeurs)
        .eq('id', parsed.data.id)
        .select('id')
        .maybeSingle()
    : await supabase.from('prompt_fields').insert(valeurs).select('id').maybeSingle();

  if (error) return { error: readableError(error.message) };
  if (!champ) return { error: 'Champ introuvable.' };

  await supabase.from('prompt_field_choices').delete().eq('field_id', champ.id);

  if (parsed.data.kind === 'liste') {
    const lignes = lireLesChoix(parsed.data.choix.join('\n')).map((choix, rang) => ({
      field_id: champ.id,
      valeur: choix.valeur,
      libelle: choix.libelle,
      position: rang + 1,
    }));
    const { error: erreurChoix } = await supabase.from('prompt_field_choices').insert(lignes);
    if (erreurChoix) return { error: readableError(erreurChoix.message) };
  }

  revalidatePath(`/admin/raccourcis/${parsed.data.promptId}`);
  revalidatePath('/app');
  return { success: parsed.data.id ? 'Champ enregistré.' : 'Champ ajouté.' };
}

export async function supprimerChamp(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = promptFieldDeleteInput.safeParse({ fieldId: formData.get('fieldId') });
  if (!parsed.success) return { error: 'Champ introuvable.' };

  const supabase = await createClient();
  // Les choix partent en cascade avec le champ.
  const { error } = await supabase.from('prompt_fields').delete().eq('id', parsed.data.fieldId);
  if (error) return { error: readableError(error.message) };

  const promptId = formData.get('promptId');
  if (typeof promptId === 'string') revalidatePath(`/admin/raccourcis/${promptId}`);
  revalidatePath('/app');
  return { success: 'Champ retiré.' };
}

// --- Suppressions definitives (V3) ------------------------------------------

/**
 * Supprime une commande, definitivement.
 *
 * Archiver reste le geste par defaut : il conserve la ligne, ses relations
 * et son identifiant, et se defait. Celui-ci ne se defait pas, et c'est
 * pourquoi il demande de retaper la commande — une case a cocher se coche
 * sans lire.
 *
 * Le journal garde le bilan de ce qui a disparu. Les fichiers du stockage,
 * eux, ne partent pas en cascade : la base rend leurs chemins et ils sont
 * retires ici, sans quoi le bucket grossirait d'images que plus rien ne
 * reference.
 */
export async function supprimerCommande(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = promptDeleteInput.safeParse({
    promptId: formData.get('promptId'),
    emporterLesLiens: checked(formData, 'emporterLesLiens'),
    confirmation: formData.get('confirmation') ?? '',
  });
  if (!parsed.success) return { error: 'Retapez la commande pour confirmer la suppression.' };

  const supabase = await createClient();

  // La confirmation est verifiee contre ce que la base porte, pas contre un
  // champ cache du formulaire : celui-ci se modifie dans le navigateur.
  const { data: commande } = await supabase
    .from('prompts')
    .select('command')
    .eq('id', parsed.data.promptId)
    .maybeSingle();

  if (!commande) return { error: 'Cette commande n’existe plus.' };

  if (parsed.data.confirmation.toLowerCase() !== commande.command.toLowerCase()) {
    return { error: `Pour confirmer, retapez exactement ${commande.command}.` };
  }

  const { data, error } = await supabase.rpc('admin_supprimer_commande', {
    p_prompt_id: parsed.data.promptId,
    p_emporter_les_liens: parsed.data.emporterLesLiens,
  });

  if (error) return { error: readableError(error.message) };

  const bilan = (data ?? {}) as { chemins?: string[] };
  if (bilan.chemins && bilan.chemins.length > 0) {
    await supabase.storage.from(STORAGE_BUCKETS.PROMPT_MEDIA).remove(bilan.chemins);
  }

  revalidatePath('/admin/raccourcis');
  revalidatePath('/app');
  redirect('/admin/raccourcis?supprime=1');
}

/**
 * Supprime un rayon, definitivement.
 *
 * Un rayon qui porte encore des commandes ne part pas sans dire ou elles
 * vont : la base refuse, et le message donne le compte. Ses sous-rayons
 * partent avec lui — le bilan les annonce avant, pas apres.
 */
export async function supprimerCategorie(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = categoryDeleteInput.safeParse({
    categoryId: formData.get('categoryId'),
    reaffectation: formData.get('reaffectation') || undefined,
    confirmation: formData.get('confirmation') ?? '',
  });
  if (!parsed.success) return { error: 'Retapez le nom du rayon pour confirmer la suppression.' };

  const supabase = await createClient();

  const { data: rayon } = await supabase
    .from('categories')
    .select('name')
    .eq('id', parsed.data.categoryId)
    .maybeSingle();

  if (!rayon) return { error: 'Ce rayon n’existe plus.' };

  if (parsed.data.confirmation.trim().toLowerCase() !== rayon.name.trim().toLowerCase()) {
    return { error: `Pour confirmer, retapez exactement « ${rayon.name} ».` };
  }

  const { error } = await supabase.rpc('admin_supprimer_categorie', {
    p_category_id: parsed.data.categoryId,
    p_reaffectation: parsed.data.reaffectation,
  });

  if (error) return { error: readableError(error.message) };

  revalidatePath('/admin/categories');
  revalidatePath('/app');
  revalidatePath('/app/bibliotheque');
  return { success: `Rayon « ${rayon.name} » supprimé.` };
}

/**
 * Remplace les tags d'une commande.
 *
 * La liste entiere, et non des ajouts un a un : un formulaire a cases a
 * cocher decrit un etat, pas une suite de gestes. Rapprocher les deux listes
 * laisserait une association derriere a chaque case decochee trop vite.
 *
 * Rien n'est cree ici : seuls les tags du referentiel peuvent etre poses.
 * C'est ce qui empeche le desordre de revenir par la fiche apres avoir ete
 * corrige dans la taxonomie.
 */
export async function enregistrerLesTagsDuRaccourci(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = promptTagsInput.safeParse({
    promptId: formData.get('promptId'),
    tagIds: formData
      .getAll('tagIds')
      .filter((valeur): valeur is string => typeof valeur === 'string'),
  });
  if (!parsed.success) return { error: 'Sélection de tags invalide.' };

  const supabase = await createClient();

  // On pose d'abord, on retire ensuite. PostgREST n'offre pas de
  // transaction : si le retrait passait en premier et que la pose echouait,
  // la commande se retrouverait sans aucun tag — c'est-a-dire invisible dans
  // la Bibliotheque, sans que rien ne le dise. Dans cet ordre, le pire cas
  // laisse un tag de trop, que le prochain enregistrement corrige.
  if (parsed.data.tagIds.length > 0) {
    const { error } = await supabase.from('prompt_tags').upsert(
      parsed.data.tagIds.map((tagId) => ({
        prompt_id: parsed.data.promptId,
        tag_id: tagId,
      })),
      { onConflict: 'prompt_id,tag_id', ignoreDuplicates: true },
    );
    if (error) return { error: readableError(error.message) };
  }

  let retrait = supabase.from('prompt_tags').delete().eq('prompt_id', parsed.data.promptId);
  if (parsed.data.tagIds.length > 0) {
    retrait = retrait.not('tag_id', 'in', `(${parsed.data.tagIds.join(',')})`);
  }
  const { error: erreurRetrait } = await retrait;
  if (erreurRetrait) return { error: readableError(erreurRetrait.message) };

  revalidatePath(`/admin/raccourcis/${parsed.data.promptId}`);
  revalidatePath('/app');
  revalidatePath('/app/bibliotheque');

  const n = parsed.data.tagIds.length;
  return { success: n === 0 ? 'Tous les tags retirés.' : `${n} tag(s) enregistré(s).` };
}

/**
 * Le texte d'une commande, rendu a l'administration pour etre copie.
 *
 * LE GESTE QU'ELLE EPARGNE. Verifier un payload demandait d'ouvrir la
 * fiche, de descendre jusqu'au formulaire de version, de selectionner le
 * texte dans une zone de saisie, puis de revenir — en perdant sa place
 * dans une liste de mille cinq cents entrees. Sur une seance de
 * relecture, c'est le trajet refait a chaque carte.
 *
 * ELLE NE CONTOURNE AUCUN CONTROLE. `prompt_versions` reste ferme :
 * la lecture passe par `admin_get_prompt_versions`, qui verifie le role en
 * premiere ligne, et `assertAdmin` leve avant meme d'y arriver. C'est
 * exactement le chemin qu'emprunte deja la fiche.
 *
 * ELLE NE RETOURNE RIEN AU HASARD. La version courante de ChatGPT quand
 * elle existe — c'est celle que le catalogue sert par defaut —, sinon la
 * premiere qui porte un texte. Une commande sans aucun texte le dit
 * plutot que de rendre une chaine vide que le presse-papiers accepterait
 * en silence.
 */
export async function lireLePayloadAdmin(
  promptId: string,
): Promise<{ payload: string; ia: string } | { error: string }> {
  await assertAdmin();

  const parsed = promptIdInput.safeParse({ promptId });
  if (!parsed.success) return { error: 'Commande introuvable.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_get_prompt_versions', {
    p_prompt_id: parsed.data.promptId,
  });

  if (error) return { error: readableError(error.message) };

  const versions = (data ?? []).filter(
    (entree): entree is typeof entree & { payload: string } =>
      typeof entree.payload === 'string' && entree.payload.trim() !== '',
  );

  const retenue =
    versions.find((entree) => entree.provider_key === PAYLOAD_CANONIQUE) ??
    versions.find((entree) => entree.provider_key === 'chatgpt') ??
    versions[0];
  if (!retenue) return { error: 'Cette commande n’a pas encore de texte.' };

  return { payload: retenue.payload, ia: retenue.provider_name };
}
