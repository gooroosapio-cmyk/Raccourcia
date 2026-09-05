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
  mediaUploadInput,
  newPromptInput,
  promptIdentityInput,
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
    return 'Choisissez une categorie avant de publier.';
  }
  if (message.includes('DESCRIPTION_REQUISE')) {
    return 'Ajoutez une description courte avant de publier.';
  }
  if (message.includes('VERSION_REQUISE')) {
    return 'Renseignez le prompt complet d au moins une IA avant de publier.';
  }
  if (message.includes('PAYLOAD_REQUIRED')) {
    return 'Le prompt complet ne peut pas etre vide.';
  }
  if (message.includes('FORBIDDEN')) {
    return "Cette action demande un role d'administration.";
  }
  if (message.includes('duplicate key') && message.includes('command')) {
    return 'Cette commande existe deja dans le catalogue.';
  }
  if (message.includes('duplicate key') && message.includes('slug')) {
    return 'Ce slug est deja utilise.';
  }
  // Les gardes-fous de hierarchie des categories parlent deja francais :
  // les masquer derriere un message generique priverait l'admin de la raison.
  if (message.includes('hierarchie des categories')) {
    return 'La hierarchie est limitee a deux niveaux : choisissez une categorie principale.';
  }
  if (message.includes('mode de sa categorie parente')) {
    return 'Une sous-categorie doit avoir le meme mode que sa categorie parente.';
  }
  if (message.includes('sa propre parente')) {
    return 'Une categorie ne peut pas etre sa propre parente.';
  }
  return 'Action impossible. Verifiez les informations saisies.';
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
    return { error: parsed.error.issues[0]?.message ?? 'Verifiez les informations saisies.' };
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
    showImageCard: checked(formData, 'showImageCard'),
    isFree: checked(formData, 'isFree'),
    isFeatured: checked(formData, 'isFeatured'),
    isNew: checked(formData, 'isNew'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Verifiez les informations saisies.' };
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
      show_image_card: parsed.data.showImageCard,
      is_free: parsed.data.isFree,
      is_featured: parsed.data.isFeatured,
      is_new: parsed.data.isNew,
    })
    .eq('id', promptId);

  if (error) return { error: readableError(error.message) };

  revalidatePath(`/admin/raccourcis/${promptId}`);
  revalidatePath('/app');
  return { success: 'Modifications enregistrees.' };
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
  return { success: 'Nouvelle version enregistree. La precedente est conservee.' };
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
  return { success: parsed.data.published ? 'IA activee.' : 'IA desactivee.' };
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
  const { error } = await supabase.rpc('admin_set_prompt_status', {
    p_prompt_id: parsed.data.promptId,
    p_status: parsed.data.status,
  });

  if (error) return { error: readableError(error.message) };

  revalidatePath(`/admin/raccourcis/${parsed.data.promptId}`);
  revalidatePath('/admin/raccourcis');
  revalidatePath('/app');

  const labels = {
    published: 'Raccourci publie. Il est visible par les membres.',
    draft: 'Raccourci repasse en brouillon. Il n est plus visible.',
    archived: 'Raccourci archive. Les donnees sont conservees.',
  } as const;

  return { success: labels[parsed.data.status] };
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
    return { error: parsed.error.issues[0]?.message ?? 'Verifiez les informations saisies.' };
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
  return { success: parsed.data.id ? 'Categorie enregistree.' : 'Categorie creee en brouillon.' };
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
    published: 'Categorie publiee. Ses raccourcis redeviennent visibles.',
    draft: 'Categorie desactivee. Ses raccourcis sont masques, rien n est supprime.',
    archived: 'Categorie archivee. Ses raccourcis sont masques, rien n est supprime.',
  } as const;

  return { success: labels[parsed.data.status] };
}

// --- Medias -----------------------------------------------------------------

const ALLOWED_TYPES = ['image/webp', 'image/avif', 'image/png', 'image/jpeg'];
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Envoie un visuel dans Supabase Storage.
 *
 * Le chemin est versionne par horodatage : remplacer une image ne casse pas
 * le cache CDN des anciennes (Blueprint Backend V1, 9.2).
 */
export async function uploadPromptMedia(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertAdmin();

  const parsed = mediaUploadInput.safeParse({
    promptId: formData.get('promptId'),
    kind: formData.get('kind'),
    alt: formData.get('alt') ?? undefined,
  });
  if (!parsed.success) return { error: 'Informations de visuel invalides.' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choisissez une image.' };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Formats acceptes : WebP, AVIF, PNG ou JPEG.' };
  }
  if (file.size > MAX_BYTES) {
    return { error: 'Image trop lourde. 10 Mo maximum.' };
  }

  const supabase = await createClient();
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'webp';
  const path = `prompts/${parsed.data.promptId}/${parsed.data.kind}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.PROMPT_MEDIA)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) return { error: 'Envoi impossible. Reessayez.' };

  const { error } = await supabase.from('prompt_media').insert({
    prompt_id: parsed.data.promptId,
    kind: parsed.data.kind,
    storage_path: path,
    alt: parsed.data.alt ?? null,
  });

  if (error) return { error: readableError(error.message) };

  revalidatePath(`/admin/raccourcis/${parsed.data.promptId}`);
  revalidatePath('/app');
  return { success: 'Visuel ajoute.' };
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
  return { success: 'Visuel retire.' };
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
    success: parsed.data.active ? 'Acces a vie accorde.' : 'Acces retire. Le compte est conserve.',
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
  return { success: 'Parametre enregistre.' };
}
