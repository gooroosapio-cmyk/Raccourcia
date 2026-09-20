#!/usr/bin/env node
/**
 * Transforme le CSV du catalogue V2 en lots SQL rejouables.
 *
 *   node scripts/generer-catalogue-v2.mjs <chemin-du-csv>
 *
 * CE QUE LE LOT FAIT. Il pose la taxonomie (27 categories, 73 collections),
 * le referentiel de tags, puis les 1 010 cartes avec leurs payloads, leurs
 * tags et leurs champs de fiche.
 *
 * CE QU'IL NE FAIT PAS, ET C'EST DELIBERE :
 *
 *   * il ne publie rien. Le fichier d'import declare lui-meme ses 1 010
 *     lignes en `brouillon`, `visible_galerie = false`, `statut_media =
 *     a_produire`. Le catalogue en ligne continue donc de fonctionner
 *     pendant que le nouveau s'installe a cote ;
 *   * il ne touche a aucun visuel. Les 1 010 lignes arrivent sans URL —
 *     la regle d'import du referentiel est explicite : « conserver les
 *     medias existants lorsque les nouvelles URL sont vides » ;
 *   * il ne supprime rien. Archiver, reaffecter et fermer les anciens
 *     rayons est un second geste, qui se decide en regardant ce que
 *     l'import a produit.
 *
 * Tout est idempotent : rejouer un lot ne cree pas de doublon.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = process.argv[2];
if (!SOURCE) {
  console.error('Usage : node scripts/generer-catalogue-v2.mjs <chemin-du-csv>');
  process.exit(1);
}

// Un dossier date, et non « catalogue-v2 » : ce nom est deja pris par
// l'import precedent, celui qui a produit le catalogue en ligne. Deux lots
// dans le meme dossier s'appliqueraient l'un apres l'autre sans que rien
// ne dise lequel fait foi.
//
// `DESTINATION_LOT` permet d'en viser un autre. Un lot deja applique en
// production ne se reecrit pas : le relire plus tard ne dirait plus ce qui
// a reellement tourne. Une nouvelle version du catalogue va donc dans un
// nouveau dossier.
const DESTINATION = process.env.DESTINATION_LOT ?? 'supabase/seed/catalogue-2026-09';

/* ------------------------------------------------------------------ */
/* Lecture du CSV                                                      */
/* ------------------------------------------------------------------ */

/**
 * Lit un CSV conforme a la RFC 4180.
 *
 * Ecrit ici plutot qu'emprunte : les payloads contiennent des guillemets,
 * des retours a la ligne et des points-virgules, et une lecture naive par
 * `split` les couperait au milieu d'une phrase.
 */
function lireCsv(texte) {
  const lignes = [];
  let champ = '';
  let ligne = [];
  let entreGuillemets = false;

  for (let i = 0; i < texte.length; i += 1) {
    const c = texte[i];

    if (entreGuillemets) {
      if (c === '"') {
        if (texte[i + 1] === '"') {
          champ += '"';
          i += 1;
        } else {
          entreGuillemets = false;
        }
      } else {
        champ += c;
      }
      continue;
    }

    if (c === '"') entreGuillemets = true;
    else if (c === ',') {
      ligne.push(champ);
      champ = '';
    } else if (c === '\n') {
      ligne.push(champ);
      lignes.push(ligne);
      ligne = [];
      champ = '';
    } else if (c !== '\r') {
      champ += c;
    }
  }

  if (champ !== '' || ligne.length > 0) {
    ligne.push(champ);
    lignes.push(ligne);
  }

  const entetes = lignes.shift();
  return lignes
    .filter((l) => l.length === entetes.length)
    .map((l) => Object.fromEntries(entetes.map((nom, i) => [nom, l[i]])));
}

/* ------------------------------------------------------------------ */
/* Outils SQL                                                          */
/* ------------------------------------------------------------------ */

/** Une chaine SQL. `null` pour une valeur vide : la base n'aime pas les ''. */
const txt = (valeur) => {
  const v = (valeur ?? '').trim();
  return v === '' ? 'null' : `'${v.replace(/'/g, "''")}'`;
};

/** Une chaine SQL qui ne peut pas etre nulle. */
const txtObligatoire = (valeur) => `'${String(valeur ?? '').replace(/'/g, "''")}'`;

const nombre = (valeur, defaut = 'null') => {
  const n = Number.parseInt(valeur, 10);
  return Number.isFinite(n) ? String(n) : defaut;
};

/** Minuscules, sans accent, tirets : la forme des slugs du catalogue. */
function slugifier(valeur) {
  return String(valeur ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

function lireJson(valeur, repli) {
  try {
    const v = JSON.parse(valeur);
    return v ?? repli;
  } catch {
    return repli;
  }
}

/* ------------------------------------------------------------------ */
/* Correspondances vers le schema                                      */
/* ------------------------------------------------------------------ */

/**
 * Le domaine historique d'une bibliotheque.
 *
 * `mode` precede la V2 et ne disparait pas : des index, des filtres
 * d'administration et la recherche s'y appuient encore. Les Reflexions
 * rejoignent « texte » plutot que « analyse » : cette derniere valeur reste
 * dans l'enum mais n'est plus un domaine public depuis la V2 du catalogue.
 */
const MODE_PAR_BIBLIOTHEQUE = { images: 'image', textes: 'texte', reflexions: 'texte' };

/**
 * Le genre d'experience, qui decide de la forme de la fiche.
 *
 * Une commande image se juge sur son avant/apres ; une Reflexion ouvre une
 * conversation, donc se lit comme un Mode IA. Une commande Texte n'est ni
 * l'un ni l'autre : elle prend la fiche generique, et `null` est la bonne
 * reponse plutot qu'un genre invente.
 */
const GENRE_PAR_BIBLIOTHEQUE = { images: 'commande_image', textes: null, reflexions: 'mode_ia' };

/** Les familles de tags du referentiel, vers celles de la base. */
const FAMILLE_DE_TAG = {
  bibliotheque: 'bibliotheque',
  usage: 'usage',
  style: 'style',
  rendu: 'resultat',
  capacite: 'capacite',
  contexte: 'contexte',
  'public/contexte': 'contexte',
  public: 'contexte',
};

/** Les genres de champ de fiche, vers l'enum `prompt_field_kind`. */
function genreDeChamp(type) {
  const t = String(type ?? '').toLowerCase();
  if (t.includes('nombre') || t.includes('montant') || t.includes('chiffre')) return 'nombre';
  if (t.includes('liste') || t.includes('choix')) return 'liste';
  if (t.includes('fichier') || t.includes('long') || t.includes('document')) return 'texte_long';
  return 'texte';
}

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */

const lignes = lireCsv(readFileSync(SOURCE, 'utf8').replace(/^﻿/, ''));
mkdirSync(DESTINATION, { recursive: true });

const fichiers = [];
const ecrire = (nom, contenu) => {
  writeFileSync(join(DESTINATION, nom), contenu);
  fichiers.push(nom);
};

const enTete = (titre, corps) =>
  `-- =====================================================================\n` +
  `-- ${titre}\n` +
  `--\n` +
  `-- Genere par scripts/generer-catalogue-v2.mjs. Ne pas modifier a la main :\n` +
  `-- la source est le CSV du catalogue V2, et une correction faite ici\n` +
  `-- disparaitrait a la prochaine generation.\n` +
  `-- =====================================================================\n\n` +
  corps;

/* --- 1. La taxonomie : categories puis collections -------------------- */

const categories = new Map();
const collections = new Map();

for (const l of lignes) {
  const bib = l.bibliotheque;
  if (!categories.has(l.categorie_id)) {
    categories.set(l.categorie_id, {
      id: l.categorie_id,
      slug: l.categorie_slug,
      nom: l.categorie,
      bibliotheque: bib,
      ordre: nombre(l.ordre_categorie, '0'),
    });
  }
  if (!collections.has(l.collection_id)) {
    collections.set(l.collection_id, {
      id: l.collection_id,
      slug: l.collection_slug,
      nom: l.collection,
      parent: l.categorie_id,
      bibliotheque: bib,
    });
  }
}

{
  const corps = [];
  corps.push('begin;\n');
  corps.push(`create temporary table lot_v2_taxonomie (
  ref text, slug text, nom text, parent_ref text, mode text, ordre integer
) on commit drop;\n`);

  const valeurs = [];
  for (const c of categories.values()) {
    valeurs.push(
      `  (${txtObligatoire(`V2CAT-${c.id}`)}, ${txtObligatoire(c.slug)}, ${txtObligatoire(c.nom)}, null, ` +
        `${txtObligatoire(MODE_PAR_BIBLIOTHEQUE[c.bibliotheque] ?? 'texte')}, ${c.ordre})`,
    );
  }
  let rang = 0;
  for (const c of collections.values()) {
    rang += 1;
    valeurs.push(
      `  (${txtObligatoire(`V2COL-${c.id}`)}, ${txtObligatoire(c.slug)}, ${txtObligatoire(c.nom)}, ` +
        `${txtObligatoire(`V2CAT-${c.parent}`)}, ${txtObligatoire(MODE_PAR_BIBLIOTHEQUE[c.bibliotheque] ?? 'texte')}, ${rang})`,
    );
  }
  corps.push(
    `insert into lot_v2_taxonomie (ref, slug, nom, parent_ref, mode, ordre) values\n${valeurs.join(',\n')};\n`,
  );

  corps.push(`-- Les categories d'abord : une collection a besoin de sa parente.
--
-- La cle d'upsert est \`external_ref\`, pas le slug : deux refontes ont
-- deja reutilise un meme slug pour deux rayons differents, et la
-- reference stable est la seule chose qui ne bouge pas.
--
-- Un rayon qui porte le slug visé mais une autre reference est libere de
-- son slug plutot que de faire echouer le lot : il garde ses commandes et
-- son identifiant, il perd seulement une adresse qu'il ne peut pas
-- partager.
update public.categories c
set slug = c.slug || '-avant-v2'
where c.slug in (select slug from lot_v2_taxonomie)
  and (c.external_ref is null or c.external_ref not in (select ref from lot_v2_taxonomie));

insert into public.categories (external_ref, slug, name, mode, sort_order, status)
select l.ref, l.slug, l.nom, l.mode::public.app_mode, l.ordre, 'published'::public.content_status
from lot_v2_taxonomie l
where l.parent_ref is null
-- L'index de \`external_ref\` est partiel, comme celui des cartes :
-- l'inference doit reprendre sa condition.
on conflict (external_ref) where external_ref is not null do update
set slug = excluded.slug, name = excluded.name, mode = excluded.mode,
    sort_order = excluded.sort_order, updated_at = now();

insert into public.categories (external_ref, slug, name, mode, sort_order, status, parent_id)
select l.ref, l.slug, l.nom, l.mode::public.app_mode, l.ordre,
       'published'::public.content_status, p.id
from lot_v2_taxonomie l
join public.categories p on p.external_ref = l.parent_ref
where l.parent_ref is not null
on conflict (external_ref) where external_ref is not null do update
set slug = excluded.slug, name = excluded.name, mode = excluded.mode,
    sort_order = excluded.sort_order, parent_id = excluded.parent_id, updated_at = now();

do $rapport$
declare v_cat integer; v_col integer;
begin
  select count(*) into v_cat from public.categories where external_ref like 'V2CAT-%';
  select count(*) into v_col from public.categories where external_ref like 'V2COL-%';
  if v_cat <> ${categories.size} or v_col <> ${collections.size} then
    raise exception 'Taxonomie V2 : % categories et % collections au lieu de ${categories.size} et ${collections.size}.', v_cat, v_col;
  end if;
  raise notice 'Taxonomie V2 : % categories, % collections.', v_cat, v_col;
end $rapport$;

commit;`);

  ecrire(
    '000_taxonomie.sql',
    enTete(
      `Taxonomie V2 : ${categories.size} categories, ${collections.size} collections`,
      corps.join('\n'),
    ),
  );
}

/* --- 2. Le referentiel de tags ---------------------------------------- */

const tagsV2 = new Map();
for (const l of lignes) {
  for (const t of lireJson(l.tags_json, [])) {
    if (!t?.slug) continue;
    if (!tagsV2.has(t.slug)) {
      tagsV2.set(t.slug, { slug: t.slug, famille: FAMILLE_DE_TAG[t.famille] ?? 'autre' });
    }
  }
}

{
  const valeurs = [...tagsV2.values()].map((t, i) => {
    const nom = t.slug
      .split('-')
      .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
      .join(' ');
    return `  (${txtObligatoire(t.slug)}, ${txtObligatoire(nom)}, ${txtObligatoire(t.famille)}::public.tag_group, ${i + 1})`;
  });

  const corps = `-- Le vocabulaire du referentiel V2 : ${tagsV2.size} slugs, six familles.
--
-- Le nom affiche se deduit du slug et se corrige ensuite en administration :
-- ce lot le pose, il ne l'ecrase pas. Le visuel, l'ordre et l'activation
-- appartiennent a l'administration et ne sont jamais touches ici — sans
-- quoi rejouer le lot effacerait les tuiles posees a la main.
insert into public.tags (slug, name, groupe, sort_order) values
${valeurs.join(',\n')}
on conflict (slug) do update
set groupe = excluded.groupe, updated_at = now();

do $rapport$
declare v_n integer;
begin
  select count(*) into v_n from public.tags;
  raise notice 'Referentiel de tags : % au total.', v_n;
end $rapport$;`;

  ecrire('001_tags.sql', enTete(`Referentiel de tags V2 (${tagsV2.size} slugs)`, corps));
}

/* --- 3. Les cartes ----------------------------------------------------- */

/**
 * Le slug public d'une carte.
 *
 * Le slug de carte seul ne suffit pas : « annees-folles » peut servir a
 * deux commandes differentes. On prefixe donc par la commande, ce qui
 * donne une adresse qui se lit — /p/vintageportrait-annees-folles — et qui
 * reste unique sans compteur.
 *
 * SAUF QUAND LE REFERENTIEL A DEJA PREFIXE. Le catalogue final ecrit 285
 * de ses `carte_slug` sous la forme « commande-variante » ; prefixer une
 * seconde fois donnerait « unboxing-unboxing-vue-du-dessus ». Ce n'est pas
 * qu'une laideur : cinq de ces cartes sont EN LIGNE sous leur adresse
 * courte, et les reprefixer changerait l'adresse d'une page deja partagee.
 * On reconnait le prefixe plutot que de le reposer.
 */
const slugsVus = new Set();
function slugDeCarte(l) {
  const base = slugifier(l.commande.replace(/^\//, ''));
  const variante = slugifier(l.carte_slug);
  let slug = base;
  if (variante && variante !== base) {
    slug = variante.startsWith(`${base}-`) ? variante : `${base}-${variante}`;
  }
  if (slugsVus.has(slug)) {
    const empreinte = createHash('sha1').update(l.carte_id).digest('hex').slice(0, 6);
    slug = `${slug}-${empreinte}`;
  }
  slugsVus.add(slug);
  return slug;
}

const cartes = lignes.map((l) => ({ ligne: l, slug: slugDeCarte(l) }));

const PAR_LOT_CARTES = 120;
let lot = 0;
for (let i = 0; i < cartes.length; i += PAR_LOT_CARTES) {
  lot += 1;
  const tranche = cartes.slice(i, i + PAR_LOT_CARTES);
  const valeurs = tranche.map(({ ligne: l, slug }) => {
    const bib = l.bibliotheque;
    const genre = GENRE_PAR_BIBLIOTHEQUE[bib];
    const cadrage = lireJson(l.cadrage_json, {});
    const parametres = lireJson(l.parametres_json, {});
    const casUsage = (l.cas_usage ?? '')
      .split(';')
      .map((x) => x.trim())
      .filter(Boolean);

    return [
      `  (${txtObligatoire(`V2-${l.carte_id}`)}`,
      txtObligatoire(l.carte_id),
      txtObligatoire(l.commande.trim().toLowerCase()),
      txt(l.commande_id),
      txt(l.commande_objectif),
      txt(l.carte_slug),
      txtObligatoire(slug),
      txtObligatoire(l.carte_titre),
      txtObligatoire(MODE_PAR_BIBLIOTHEQUE[bib] ?? 'texte'),
      txtObligatoire(bib),
      genre ? txtObligatoire(genre) : 'null',
      txtObligatoire(l.description_courte || l.commande_objectif || l.carte_titre),
      txt(l.description_detaillee),
      txt(l.specification_carte),
      `array[${casUsage.map((c) => txtObligatoire(c)).join(', ')}]::text[]`,
      txt(typeof cadrage?.politique_manque === 'string' ? cadrage.politique_manque : ''),
      txt(parametres?.ratio),
      nombre(l.champs_fiche_max),
      nombre(l.ordre_carte, '0'),
      `${bib === 'images'}`,
      `${txt(l.collection_id)})`,
    ].join(', ');
  });

  const corps = `begin;

create temporary table lot_v2_cartes (
  ref text, carte_id text, commande text, commande_id text, objectif text,
  card_slug text, slug text, titre text, mode text, bibliotheque text,
  genre text, courte text, detaillee text, specification text,
  cas_usage text[], politique text, ratio text, champs_max integer,
  ordre integer, image boolean, collection_id text
) on commit drop;

insert into lot_v2_cartes values
${valeurs.join(',\n')};

-- Avant d'inserer : aucun slug neuf ne doit percuter l'adresse d'une
-- AUTRE carte. Sans ce controle, la collision remonterait comme une
-- violation d'unicite anonyme au milieu d'un lot de cent vingt, et il
-- faudrait relire le fichier pour savoir laquelle.
do $collision$
declare v_liste text;
begin
  select string_agg(l.slug, ', ') into v_liste
  from lot_v2_cartes l
  join public.prompts p on p.slug = l.slug
  where p.card_id is distinct from l.carte_id;

  if v_liste is not null then
    raise exception 'Slugs deja pris par une autre carte : %', v_liste;
  end if;
end $collision$;

-- Les cartes arrivent en brouillon, comme le fichier d'import le declare.
-- Rien de ce qui est en ligne ne bouge : on installe a cote, on publie
-- ensuite, carte par carte ou par lot, depuis l'administration.
--
-- \`card_id\` est la cle d'upsert : c'est l'identifiant stable du
-- referentiel, celui qui survit a un renommage de commande ou de titre.
insert into public.prompts (
  external_ref, card_id, command, command_id, command_objectif, card_slug,
  slug, name, mode, library, entity_type, short_description,
  intention, specification, use_cases, limitations, default_ratio,
  fiche_champs_max, sort_order, show_image_card, status, category_id
)
select l.ref, l.carte_id, l.commande, l.commande_id::uuid, l.objectif, l.card_slug,
       l.slug, l.titre, l.mode::public.app_mode, l.bibliotheque::public.app_library,
       nullif(l.genre, ''), l.courte,
       l.detaillee, l.specification, l.cas_usage, l.politique, l.ratio,
       l.champs_max, l.ordre, l.image, 'draft'::public.content_status,
       c.id
from lot_v2_cartes l
left join public.categories c on c.external_ref = 'V2COL-' || l.collection_id
-- L'index de \`card_id\` est partiel : l'inference doit reprendre sa
-- condition, sans quoi Postgres ne sait pas quel index viser.
-- LE SLUG PUBLIC N'EST PAS DANS CETTE LISTE, ET C'EST LE POINT.
-- C'est l'adresse de la fiche : /p/unboxing-vue-du-dessus. Une carte
-- deja en ligne a ete partagee, mise en favori, peut-etre indexee. La
-- regle de fabrication des slugs peut s'ameliorer — elle vient de le
-- faire — mais elle ne doit jamais reecrire l'adresse d'une page qui
-- existe : un reimport casserait silencieusement quinze liens que
-- personne ne saurait relier a ce lot. Les nouvelles cartes recoivent
-- leur slug a l'insertion, les anciennes gardent le leur.
on conflict (card_id) where card_id is not null do update
set external_ref = excluded.external_ref,
    command = excluded.command,
    command_id = excluded.command_id,
    command_objectif = excluded.command_objectif,
    card_slug = excluded.card_slug,
    name = excluded.name,
    mode = excluded.mode,
    library = excluded.library,
    entity_type = excluded.entity_type,
    short_description = excluded.short_description,
    intention = excluded.intention,
    specification = excluded.specification,
    use_cases = excluded.use_cases,
    limitations = excluded.limitations,
    default_ratio = excluded.default_ratio,
    fiche_champs_max = excluded.fiche_champs_max,
    sort_order = excluded.sort_order,
    show_image_card = excluded.show_image_card,
    category_id = excluded.category_id,
    updated_at = now();

-- Une variante par IA declaree, prete a recevoir son payload. La
-- compatibilite vient de \`filtres_ia\` : les 765 cartes Images n'ont pas
-- de variante Claude en V2, et lui en fabriquer une vide reviendrait a
-- promettre une compatibilite que le referentiel ne declare pas.
insert into public.prompt_variants (prompt_id, provider_id, status)
select p.id, f.id, 'published'::public.content_status
from lot_v2_cartes l
join public.prompts p on p.card_id = l.carte_id
join public.ai_providers f on f.is_active
  and (f.key <> 'claude' or l.bibliotheque <> 'images')
on conflict (prompt_id, provider_id) do nothing;

commit;`;

  ecrire(
    `100_cartes_${String(lot).padStart(2, '0')}.sql`,
    enTete(`Cartes V2, lot ${lot} (${tranche.length} cartes)`, corps),
  );
}

/* --- 4. Les payloads --------------------------------------------------- */

const MOTEURS = [
  ['chatgpt', 'payload_chatgpt'],
  ['gemini', 'payload_gemini'],
  ['claude', 'payload_claude'],
];

const payloads = [];
for (const l of lignes) {
  for (const [moteur, colonne] of MOTEURS) {
    const texte = (l[colonne] ?? '').trim();
    if (texte) payloads.push({ carte: l.carte_id, moteur, texte });
  }
}

const PAR_LOT_PAYLOADS = 40;
lot = 0;
for (let i = 0; i < payloads.length; i += PAR_LOT_PAYLOADS) {
  lot += 1;
  const tranche = payloads.slice(i, i + PAR_LOT_PAYLOADS);
  const valeurs = tranche.map(
    (p) =>
      `  (${txtObligatoire(p.carte)}, ${txtObligatoire(p.moteur)}, ${txtObligatoire(p.texte)})`,
  );

  const corps = `begin;

create temporary table lot_v2_payloads (
  carte_id text, moteur text, payload text
) on commit drop;

insert into lot_v2_payloads (carte_id, moteur, payload) values
${valeurs.join(',\n')};

-- La version courante ne cede la place que si le texte change reellement :
-- reposer un payload identique le compterait deux fois dans l'historique,
-- et l'historique sert precisement a retrouver ce qui a change.
update public.prompt_versions pv
set is_current = false, status = 'retired'::public.version_status
from lot_v2_payloads l
join public.prompts p on p.card_id = l.carte_id
join public.prompt_variants v on v.prompt_id = p.id
join public.ai_providers f on f.id = v.provider_id and f.key = l.moteur
where pv.variant_id = v.id
  and pv.is_current
  and pv.payload is distinct from l.payload;

insert into public.prompt_versions (variant_id, version_label, payload, status, is_current, published_at)
select v.id, 'catalogue-v2', l.payload, 'published'::public.version_status, true, now()
from lot_v2_payloads l
join public.prompts p on p.card_id = l.carte_id
join public.prompt_variants v on v.prompt_id = p.id
join public.ai_providers f on f.id = v.provider_id and f.key = l.moteur
where not exists (
  select 1 from public.prompt_versions pv where pv.variant_id = v.id and pv.is_current
);

-- Une carte n'est copiable que lorsqu'elle porte un texte.
update public.prompts p
set payload_ready = true
from lot_v2_payloads l
where p.card_id = l.carte_id and not p.payload_ready;

commit;`;

  ecrire(
    `500_payloads_${String(lot).padStart(3, '0')}.sql`,
    enTete(`Payloads V2, lot ${lot} (${tranche.length} textes)`, corps),
  );
}

/* --- 5. Les tags poses sur les cartes ---------------------------------- */

{
  const liens = [];
  for (const l of lignes) {
    for (const t of lireJson(l.tags_json, [])) {
      if (t?.slug) liens.push([l.carte_id, t.slug]);
    }
  }

  const valeurs = liens.map(
    ([carte, slug]) => `  (${txtObligatoire(carte)}, ${txtObligatoire(slug)})`,
  );

  const corps = `begin;

create temporary table lot_v2_tags (carte_id text, slug text) on commit drop;

insert into lot_v2_tags (carte_id, slug) values
${valeurs.join(',\n')};

-- Les associations du fichier d'import, et elles seules. Un tag pose a la
-- main en administration sur une carte V2 n'est pas retire : le lot ajoute,
-- il ne fait pas le menage a la place de qui range.
insert into public.prompt_tags (prompt_id, tag_id)
select p.id, t.id
from lot_v2_tags l
join public.prompts p on p.card_id = l.carte_id
join public.tags t on t.slug = l.slug
on conflict do nothing;

do $rapport$
declare v_n integer;
begin
  select count(*) into v_n
  from public.prompt_tags pt
  join public.prompts p on p.id = pt.prompt_id
  where p.external_ref like 'V2-%';
  raise notice 'Tags V2 : % association(s) sur les cartes du lot.', v_n;
end $rapport$;

commit;`;

  ecrire(
    '700_tags.sql',
    enTete(`Tags poses sur les cartes V2 (${liens.length} associations)`, corps),
  );
}

/* --- 6. Les champs a pre-remplir sur la fiche -------------------------- */

/**
 * Ce que la fiche demande avant de copier.
 *
 * `entrees_json` decrit toutes les informations qu'une carte peut utiliser ;
 * `champs_fiche_max` dit combien la fiche en montre. La difference compte :
 * la fiche n'est pas un questionnaire, et ce qui n'est pas demande ici sera
 * demande par l'IA — une seule question, et seulement si elle bloque.
 *
 * Un champ laisse vide n'est donc pas une erreur : le payload porte la
 * marque [cle], et le cadrage de la carte sait quoi faire de son absence.
 * Aucun champ n'est donc marque obligatoire.
 */
{
  const champs = [];
  for (const l of lignes) {
    const maximum = Math.min(Number.parseInt(l.champs_fiche_max, 10) || 0, 3);
    if (maximum === 0) continue;

    const entrees = lireJson(l.entrees_json, []);
    if (!Array.isArray(entrees)) continue;

    entrees.slice(0, maximum).forEach((e, rang) => {
      const cle = slugifier(e?.cle ?? '').replace(/-/g, '_');
      if (!cle) return;
      champs.push({
        carte: l.carte_id,
        cle,
        libelle: (e?.libelle || e?.cle || cle).replace(/_/g, ' '),
        indication: typeof e?.requis_si === 'string' ? e.requis_si.slice(0, 160) : '',
        genre: genreDeChamp(e?.type),
        position: rang + 1,
      });
    });
  }

  const valeurs = champs.map(
    (c) =>
      `  (${txtObligatoire(c.carte)}, ${txtObligatoire(c.cle)}, ${txtObligatoire(c.libelle)}, ` +
      `${txt(c.indication)}, ${txtObligatoire(c.genre)}, ${c.position})`,
  );

  const corps = `begin;

create temporary table lot_v2_champs (
  carte_id text, cle text, libelle text, indication text, genre text, position integer
) on commit drop;

insert into lot_v2_champs (carte_id, cle, libelle, indication, genre, position) values
${valeurs.join(',\n')};

-- Aucun champ n'est obligatoire, et c'est la regle du referentiel : la
-- fiche montre au plus \`champs_fiche_max\` informations utiles, jamais une
-- liste de questions figees. Ce qui reste vide est demande par l'IA, une
-- seule question a la fois, et seulement si elle bloque reellement.
insert into public.prompt_fields (prompt_id, cle, libelle, indication, kind, requis, position)
select p.id, l.cle, l.libelle, nullif(l.indication, ''),
       l.genre::public.prompt_field_kind, false, l.position
from lot_v2_champs l
join public.prompts p on p.card_id = l.carte_id
on conflict (prompt_id, position) do update
set cle = excluded.cle, libelle = excluded.libelle,
    indication = excluded.indication, kind = excluded.kind;

do $rapport$
declare v_n integer; v_cartes integer;
begin
  select count(*), count(distinct prompt_id) into v_n, v_cartes
  from public.prompt_fields pf
  join public.prompts p on p.id = pf.prompt_id
  where p.external_ref like 'V2-%';
  raise notice 'Champs de fiche : % champ(s) sur % carte(s).', v_n, v_cartes;
end $rapport$;

commit;`;

  ecrire('800_champs.sql', enTete(`Champs de fiche V2 (${champs.length} champs)`, corps));
}

/* --- 7. Le controle de completude -------------------------------------- */

{
  const corps = `-- Ce lot ne modifie rien : il refuse si l'import n'est pas complet.
--
-- Un import a moitie passe est pire qu'un import refuse : la bibliotheque
-- parait remplie, et il manque cent commandes que personne ne cherchera.
do $controle$
declare
  v_cartes integer;
  v_commandes integer;
  v_collections integer;
  v_categories integer;
  v_sans_collection integer;
  v_sans_payload integer;
  v_publiees integer;
begin
  select count(*), count(distinct command_id)
  into v_cartes, v_commandes
  from public.prompts where external_ref like 'V2-%';

  select count(*) into v_categories from public.categories where external_ref like 'V2CAT-%';
  select count(*) into v_collections from public.categories where external_ref like 'V2COL-%';

  select count(*) into v_sans_collection
  from public.prompts where external_ref like 'V2-%' and category_id is null;

  select count(*) into v_sans_payload
  from public.prompts p
  where p.external_ref like 'V2-%'
    and not exists (
      select 1 from public.prompt_variants v
      join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
      where v.prompt_id = p.id);

  select count(*) into v_publiees
  from public.prompts where external_ref like 'V2-%' and status = 'published';

  if v_cartes <> ${lignes.length} then
    raise exception 'Catalogue V2 : % cartes importees au lieu de ${lignes.length}.', v_cartes;
  end if;
  if v_categories <> ${categories.size} or v_collections <> ${collections.size} then
    raise exception 'Catalogue V2 : % categories et % collections au lieu de ${categories.size} et ${collections.size}.',
      v_categories, v_collections;
  end if;
  if v_sans_collection > 0 then
    raise exception 'Catalogue V2 : % carte(s) sans collection.', v_sans_collection;
  end if;
  if v_sans_payload > 0 then
    raise exception 'Catalogue V2 : % carte(s) sans texte a copier.', v_sans_payload;
  end if;

  -- Le lot n'a rien publie, et il le verifie : ce qui est en ligne
  -- aujourd'hui doit continuer de l'etre, et le nouveau catalogue attend
  -- ses visuels avant de se montrer.
  if v_publiees > 0 then
    raise notice 'Catalogue V2 : % carte(s) deja publiee(s) — publication faite en administration.', v_publiees;
  end if;

  raise notice 'Catalogue V2 : % cartes, % commandes, % collections, % categories.',
    v_cartes, v_commandes, v_collections, v_categories;
end $controle$;`;

  ecrire('900_controle.sql', enTete('Controle de completude du catalogue V2', corps));
}

console.log(`${fichiers.length} fichiers ecrits dans ${DESTINATION}`);
console.log(
  `  ${lignes.length} cartes, ${categories.size} categories, ${collections.size} collections`,
);
console.log(`  ${tagsV2.size} tags, ${payloads.length} payloads`);
