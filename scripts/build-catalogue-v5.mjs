#!/usr/bin/env node
/**
 * Genere les lots SQL de la refonte V5 depuis data/catalogue/v5/*.json.
 *
 *   node scripts/build-catalogue-v5.mjs
 *
 * CE QUE CES LOTS GARANTISSENT, ET COMMENT.
 *
 * L'IDENTITE EST RESOLUE, PAS DEVINEE. `cle_carte` (rc5-...) est une clef
 * d'import et `cle_audit` (pdf-...) une clef de page de PDF : aucune des
 * deux n'est un identifiant de production. L'extraction a rapproche les
 * 1301 sources reelles de leur carte en base, chacune vers un identifiant
 * distinct, et ces lots ecrivent sur cet identifiant. Une reexecution
 * retrouve les memes cartes par `external_ref` et n'en cree aucune.
 *
 * SANS DOUBLON. Trois cartes que le CSV annonce comme nouvelles existent
 * deja en base (/restaurantmenu, /orthographicboard, /mode-fiscalite). Les
 * inserer aurait fait trois doublons ; elles sont mises a jour sur leur
 * identite resolue. Les 41 cartes reellement nouvelles ont ete verifiees :
 * aucune de leurs commandes n'existe en base.
 *
 * SANS PERDRE UN VISUEL. Les 1064 fichiers reposent tous sur les 533
 * cartes representantes, qui restent. Aucune carte retiree ne porte de
 * media — verifie, et reverifie par le lot 000 avant toute ecriture. Ces
 * lots ne touchent jamais `prompt_media`.
 *
 * DANS CET ORDRE, ET PAS UN AUTRE. Les alias sont poses avant les retraits,
 * pour qu'aucun lien ne pende. Les retraits precedent les cartes, parce que
 * l'unicite de slug ne porte que sur le non-archive : /floatingproduct est
 * detenu par une carte publiee que la refonte archive, et reclame par la
 * carte archivee que la refonte reactive. Reactiver avant d'archiver
 * leverait.
 *
 * LE RETRAIT EST REVERSIBLE. `status = 'archived'`, jamais un delete : le
 * contenu reste, la selection change. Rien n'est detruit par ces lots.
 *
 * LE LOT 000 N'ECRIT RIEN. Il compte ce que les suivants vont toucher, et
 * leve si la base ne ressemble plus a ce que l'extraction a vu.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = dirname(dirname(fileURLToPath(import.meta.url)));
const DONNEES = join(RACINE, 'data', 'catalogue', 'final-v5');
const LOTS = join(RACINE, 'supabase', 'seed', 'catalogue-final-v5');

const lire = (nom) => JSON.parse(readFileSync(join(DONNEES, nom), 'utf8'));
const cartes = lire('cartes.json');
const retraits = lire('retraits.json');
const taxo = lire('taxonomie.json');
const alias = lire('alias-reconcilies.json');

const STATUT = {
  conserver_publie: 'published',
  brouillon_reactive: 'draft',
  brouillon_nouveau: 'draft',
};

/** Le JSON part en dollar-quoting : aucun echappement de quote a rater. */
const bloc = (o) => `$raccourcia$${JSON.stringify(o)}$raccourcia$`;

const entete = (titre, corps) =>
  `-- =====================================================================\n` +
  `-- ${titre}\n--\n` +
  corps
    .split('\n')
    .map((l) => `-- ${l}`.trimEnd())
    .join('\n') +
  `\n-- =====================================================================\n`;

/** Chaque lot se termine par un controle qui leve. Un lot qui passe est un
 *  lot verifie : c'est la lecon de l'import V2, ou 99 raccourcis sur 250
 *  ne sont jamais arrives sans que personne le voie. */
const controle = (condition, message) =>
  `\ndo $ctrl$\nbegin\n  if not (${condition}) then\n` +
  `    raise exception '${message.replace(/'/g, "''")}';\n  end if;\nend $ctrl$;\n`;

mkdirSync(LOTS, { recursive: true });
if (existsSync(LOTS)) {
  for (const f of ['.keep']) void f;
}
rmSync(LOTS, { recursive: true, force: true });
mkdirSync(LOTS, { recursive: true });

/** Chaque lot est une transaction. Deux raisons : les tables temporaires
 *  `on commit drop` n'existent que dans une transaction explicite — psql
 *  les perdrait entre deux instructions — et un lot interrompu ne doit
 *  jamais laisser la moitie de ses cartes ecrites. */
const ecrire = (nom, sql) => {
  writeFileSync(
    join(LOTS, nom),
    `${sql}\ncommit;\n`.replace(/^(-- =+\n(?:--.*\n)*-- =+\n)/, '$1\nbegin;\n'),
  );
  return nom;
};
const fichiers = [];

// --- 000 : l'etat des lieux, sans une ecriture --------------------------
{
  const ids = cartes.filter((c) => c.id_production).map((c) => c.id_production);
  const retires = retraits.map((r) => r.id);
  const sql =
    entete(
      "Lot 000 — apercu. Ce lot n'ecrit rien.",
      `Il repond a trois questions avant qu'on touche a quoi que ce soit :\n` +
        `les ${ids.length} cartes que la refonte met a jour sont-elles toujours la,\n` +
        `les ${retires.length} cartes qu'elle retire portent-elles un visuel,\n` +
        `et la base a-t-elle bouge depuis l'extraction.\n\n` +
        `Il leve si une carte resolue a disparu, ou si un retrait emporterait\n` +
        `un media. On le passe seul, on lit la sortie, puis on decide.`,
    ) +
    `\ncreate temporary table v5_apercu_gardees (id uuid) on commit drop;\n` +
    `insert into v5_apercu_gardees\n` +
    `select (x ->> 'id')::uuid from jsonb_array_elements(${bloc(ids.map((id) => ({ id })))}) x;\n\n` +
    `create temporary table v5_apercu_retirees (id uuid) on commit drop;\n` +
    `insert into v5_apercu_retirees\n` +
    `select (x ->> 'id')::uuid from jsonb_array_elements(${bloc(retires.map((id) => ({ id })))}) x;\n\n` +
    `select 'cartes resolues toujours en base' as controle,\n` +
    `       (select count(*) from v5_apercu_gardees g join public.prompts p on p.id = g.id) as trouvees,\n` +
    `       ${ids.length} as attendues;\n\n` +
    `select 'visuels sur les cartes gardees' as controle,\n` +
    `       (select count(*) from public.prompt_media m join v5_apercu_gardees g on g.id = m.prompt_id) as fichiers;\n\n` +
    `select 'visuels sur les cartes retirees' as controle,\n` +
    `       (select count(*) from public.prompt_media m join v5_apercu_retirees r on r.id = m.prompt_id) as fichiers;\n\n` +
    `select p.status as statut_actuel, count(*) as cartes\n` +
    `from v5_apercu_retirees r join public.prompts p on p.id = r.id group by 1 order by 1;\n` +
    controle(
      `(select count(*) from v5_apercu_gardees g join public.prompts p on p.id = g.id) = ${ids.length}`,
      `Lot 000 : une carte resolue a disparu de la base depuis l'extraction. Relancer extract-catalogue-v5.py avant d'importer.`,
    ) +
    controle(
      `(select count(*) from public.prompt_media m join v5_apercu_retirees r on r.id = m.prompt_id) = 0`,
      `Lot 000 : un retrait emporterait un visuel. La refonte ne doit retirer que des cartes sans media.`,
    );
  fichiers.push(ecrire('000_apercu.sql', sql));
}

// --- 100 : la taxonomie -------------------------------------------------
{
  const cats = taxo.categories.map((c, i) => ({
    ref: `V5-${c.cle.toUpperCase()}`,
    slug: `v5-${c.cle}`,
    nom: c.libelle,
    mode: c.mode,
    ordre: (i + 1) * 10,
  }));
  const colls = taxo.collections.map((c, i) => ({
    ref: `V5C-${c.cle.toUpperCase().replace(/--/g, '-')}`,
    slug: `v5-${c.cle}`,
    nom: c.libelle,
    mode: c.mode,
    parent: `V5-${c.parent.toUpperCase()}`,
    ordre: (i + 1) * 10,
  }));
  const tags = taxo.tags.map((t, i) => ({ slug: t.slug, ordre: (i + 1) * 10 }));

  const sql =
    entete(
      'Lot 100 — douze rayons nets, un rayon de transition, 35 collections, 40 tags',
      `Douze rayons portent le catalogue valide ; le treizieme, « En cours de\n` +
        `reclassement », porte les 284 cartes Visuels que la refonte laisse en\n` +
        `brouillon. Leur promesse est ecrite et leur classement propose, mais\n` +
        `aucune n'a ete relue : les semer dans les douze rayons ferait annoncer\n` +
        `a ces rayons des cartes que personne n'a validees.\n\n` +
        `Le treizieme est visible comme les autres. Cela ne le fera pas\n` +
        `apparaitre vide pour autant : la Bibliotheque ne dessine une tuile que\n` +
        `pour un rayon qui porte au moins une commande publiee, et ses cartes\n` +
        `sont des brouillons. Il surgira le jour ou la premiere sera validee.\n\n` +
        `Coachs et Assistants metiers fusionnent pour tenir en douze. C'est la\n` +
        `seule fusion des treize qui ne coute rien : leurs quatre collections\n` +
        `survivent telles quelles, la ou fondre Produits dans Marketing\n` +
        `contredirait les regles de classement du dossier.\n\n` +
        `Les categories V5 portent un external_ref, unique quand il est renseigne :\n` +
        `c'est lui qui distingue un rayon V5 d'un rayon herite, et c'est sur lui\n` +
        `que l'upsert se fait. Rejouer ce lot ne cree pas un second jeu.\n\n` +
        `Les 287 categories heritees ne sont pas touchees ici. Elles sortiront de\n` +
        `la navigation quand plus aucune carte active ne les portera — ce que la\n` +
        `refonte produit, puisque les 642 cartes sont toutes rattachees a un rayon\n` +
        `V5. Aucune n'est supprimee par ce lot : une categorie encore referencee\n` +
        `par une archive doit rester, sous peine de casser cette relation.\n\n` +
        `Les 40 tags sont le referentiel ferme. L'extraction a verifie qu'aucune\n` +
        `carte n'en porte un autre, et qu'aucune n'en porte plus de quatre.\n` +
        `Les 147 tags actuels ne sont pas desactives ici : leurs associations\n` +
        `doivent d'abord migrer, ce que fait le lot 600.`,
    ) +
    `\ncreate temporary table v5_cat (ref text, slug text, nom text, mode text, ordre int) on commit drop;\n` +
    `insert into v5_cat select * from jsonb_to_recordset(${bloc(cats)})\n` +
    `  as t(ref text, slug text, nom text, mode text, ordre int);\n\n` +
    `insert into public.categories (external_ref, slug, name, mode, status, is_visible, sort_order)\n` +
    `select c.ref, c.slug, c.nom, c.mode::public.app_mode, 'published', true, c.ordre from v5_cat c\n` +
    `on conflict (external_ref) where external_ref is not null do update\n` +
    `  set name = excluded.name, mode = excluded.mode, status = 'published',\n` +
    `      is_visible = true, sort_order = excluded.sort_order, updated_at = now();\n` +
    controle(
      `(select count(*) from public.categories where external_ref like 'V5-%') = ${cats.length}`,
      `Lot 100 : les ${cats.length} categories V5 ne sont pas toutes en base.`,
    ) +
    `\ncreate temporary table v5_coll (ref text, slug text, nom text, mode text, parent text, ordre int) on commit drop;\n` +
    `insert into v5_coll select * from jsonb_to_recordset(${bloc(colls)})\n` +
    `  as t(ref text, slug text, nom text, mode text, parent text, ordre int);\n\n` +
    `insert into public.categories (external_ref, slug, name, mode, parent_id, status, is_visible, sort_order)\n` +
    `select c.ref, c.slug, c.nom, c.mode::public.app_mode,\n` +
    `       (select id from public.categories p where p.external_ref = c.parent),\n` +
    `       'published', true, c.ordre from v5_coll c\n` +
    `on conflict (external_ref) where external_ref is not null do update\n` +
    `  set name = excluded.name, mode = excluded.mode, parent_id = excluded.parent_id,\n` +
    `      status = 'published', is_visible = true, sort_order = excluded.sort_order,\n` +
    `      updated_at = now();\n` +
    controle(
      `(select count(*) from public.categories where external_ref like 'V5C-%') = ${colls.length}`,
      `Lot 100 : les ${colls.length} collections V5 ne sont pas toutes en base.`,
    ) +
    controle(
      `not exists (select 1 from public.categories where external_ref like 'V5C-%' and parent_id is null)`,
      `Lot 100 : une collection V5 n'est rattachee a aucune categorie.`,
    ) +
    `\ncreate temporary table v5_tag (slug text, ordre int) on commit drop;\n` +
    `insert into v5_tag select * from jsonb_to_recordset(${bloc(tags)}) as t(slug text, ordre int);\n\n` +
    `insert into public.tags (slug, name, groupe, is_active, sort_order)\n` +
    `select t.slug, initcap(replace(t.slug, '-', ' ')), 'fonction', true, t.ordre from v5_tag t\n` +
    `on conflict (slug) do update set is_active = true, sort_order = excluded.sort_order,\n` +
    `  updated_at = now();\n` +
    controle(
      `(select count(*) from public.tags where slug in (select slug from v5_tag) and is_active) = ${tags.length}`,
      `Lot 100 : les ${tags.length} tags du referentiel V5 ne sont pas tous actifs.`,
    );
  fichiers.push(ecrire('100_taxonomie.sql', sql));
}

// --- 200 : les alias, poses avant tout retrait --------------------------
{
  const liens = retraits
    .filter((r) => r.motif === 'regroupee')
    .map((r) => {
      const cible = cartes.find((c) => c.cle_carte === r.vers);
      return { alias: r.id, vers: cible.id_production, ref: cible.cle_carte };
    })
    .filter((l) => l.vers);
  const sql =
    entete(
      `Lot 200 — ${liens.length} alias poses, ${alias.perimes.length} retires, ${alias.repointes.length} repointes`,
      `Une carte regroupee n'est pas une carte perdue : sa fonction est reprise\n` +
        `par une autre, et son ancienne adresse doit continuer d'y mener. Les\n` +
        `alias sont poses AVANT les retraits du lot 300, pour qu'aucun favori ni\n` +
        `aucun lien ne pende, meme une seconde.\n\n` +
        `MAIS LA BASE PORTE DEJA UNE CARTE DE REDIRECTIONS, ecrite pour le\n` +
        `catalogue d'avant, et poser les nouvelles par-dessus sans la regarder\n` +
        `echoue — c'est arrive en production le 23 septembre 2026, sur\n` +
        `« prompt_aliases_sans_chaine ». Ce declencheur interdit qu'un alias\n` +
        `pointe\n` +
        `vers une carte qui est elle-meme un alias. Ce n'est pas une contrainte a\n` +
        `contourner : c'est elle qui garantit qu'une ancienne adresse mene en UN\n` +
        `saut a une fiche qui existe, plutot qu'a une chaine qui se perd.\n\n` +
        `Deux gestes la respectent, dans cet ordre :\n\n` +
        `  ${alias.perimes.length} liens dont la SOURCE est une carte que la V5 garde sont retires.\n` +
        `  Ils disaient « cette carte renvoie ailleurs » ; elle est canonique\n` +
        `  desormais, donc ils mentent.\n\n` +
        `  ${alias.repointes.length} liens dont la DESTINATION est une carte regroupee avancent d'un\n` +
        `  cran, vers la cible qui reprend la fonction. L'ancienne adresse\n` +
        `  continue de mener quelque part, toujours en un saut.\n\n` +
        `Les ${alias.inchanges} autres ne bougent pas. Ceux dont la destination part sans cible\n` +
        `cessent simplement de resoudre : leur source s'archive, et la page\n` +
        `d'archive dit ce qui s'est passe.\n\n` +
        `Un alias ne promet pas un resultat identique : il ouvre la bonne fiche.`,
    ) +
    `\n-- 1. Les liens que la refonte rend faux.\n` +
    `create temporary table v5_alias_perime (source uuid) on commit drop;\n` +
    `insert into v5_alias_perime select (x ->> 'source')::uuid\n` +
    `from jsonb_array_elements(${bloc(alias.perimes)}) x;\n\n` +
    `delete from public.prompt_aliases a using v5_alias_perime p\n` +
    `where a.alias_prompt_id = p.source;\n` +
    controle(
      `(select count(*) from public.prompt_aliases a join v5_alias_perime p
` + `        on p.source = a.alias_prompt_id) = 0`,
      `Lot 200 : un alias perime subsiste, il fera echouer les insertions.`,
    ) +
    `\n-- 2. Les liens qui menaient a une carte regroupee avancent d'un cran.\n` +
    `create temporary table v5_alias_repointe (source uuid, ancienne uuid, nouvelle uuid)\n` +
    `  on commit drop;\n` +
    `insert into v5_alias_repointe\n` +
    `select (x ->> 'source')::uuid, (x ->> 'ancienne')::uuid, (x ->> 'nouvelle')::uuid\n` +
    `from jsonb_array_elements(${bloc(alias.repointes)}) x;\n\n` +
    `update public.prompt_aliases a\n` +
    `set canonical_prompt_id = r.nouvelle, updated_at = now()\n` +
    `from v5_alias_repointe r\n` +
    `where a.alias_prompt_id = r.source and a.canonical_prompt_id = r.ancienne;\n` +
    controle(
      `not exists (select 1 from public.prompt_aliases a join v5_alias_repointe r
` +
        `            on r.source = a.alias_prompt_id
` +
        `            where a.canonical_prompt_id = r.ancienne)`,
      `Lot 200 : un alias pointe encore vers une carte regroupee.`,
    ) +
    `\n-- 3. Et seulement maintenant, les nouveaux.\n` +
    `create temporary table v5_alias (alias uuid, vers uuid, ref text) on commit drop;\n` +
    `insert into v5_alias select (x ->> 'alias')::uuid, (x ->> 'vers')::uuid, x ->> 'ref'\n` +
    `from jsonb_array_elements(${bloc(liens)}) x;\n\n` +
    `insert into public.prompt_aliases (alias_prompt_id, canonical_prompt_id)\n` +
    `select a.alias, a.vers from v5_alias a\n` +
    `where exists (select 1 from public.prompts p where p.id = a.alias)\n` +
    `  and exists (select 1 from public.prompts p where p.id = a.vers)\n` +
    `-- alias_prompt_id est unique : une carte ne redirige que vers une\n` +
    `-- seule autre. 71 des 700 en portaient deja un, ecrit pour le catalogue\n` +
    `-- d'avant. La decision V5 l'emporte — c'est le choix editorial le plus\n` +
    `-- recent, et il designe une carte qui survit, la ou l'ancienne cible\n` +
    `-- s'archive peut-etre. « do nothing » les aurait sautees en silence,\n` +
    `-- et c'est exactement ce qui est arrive au premier essai.\n` +
    `on conflict (alias_prompt_id) do update\n` +
    `  set canonical_prompt_id = excluded.canonical_prompt_id, updated_at = now();\n` +
    controle(
      `(select count(*) from public.prompt_aliases pa join v5_alias a\n` +
        `        on a.alias = pa.alias_prompt_id and a.vers = pa.canonical_prompt_id) = ${liens.length}`,
      `Lot 200 : les ${liens.length} alias de regroupement ne sont pas tous poses.`,
    ) +
    controle(
      `not exists (select 1 from public.prompt_aliases pa join v5_alias a on a.alias = pa.alias_prompt_id\n` +
        `            where pa.alias_prompt_id = pa.canonical_prompt_id)`,
      `Lot 200 : un alias pointe sur lui-meme.`,
    );
  fichiers.push(ecrire('200_aliases.sql', sql));
}

// --- 300 : les retraits, reversibles ------------------------------------
{
  const ids = retraits.map((r) => ({ id: r.id, motif: r.motif }));
  const parMotif = retraits.reduce((a, r) => ({ ...a, [r.motif]: (a[r.motif] || 0) + 1 }), {});
  const sql =
    entete(
      `Lot 300 — retrait de ${retraits.length} cartes de la selection active`,
      `${parMotif.hors_selection} cartes hors selection et ${parMotif.regroupee} cartes regroupees passent en\n` +
        `archive. Archiver, pas supprimer : le contenu reste, les payloads restent,\n` +
        `les favoris restent, et le geste se defait d'un UPDATE. Rien n'est detruit\n` +
        `par ce lot.\n\n` +
        `Il passe avant les cartes parce que l'unicite de slug ne porte que sur le\n` +
        `non-archive. /floatingproduct est le cas concret : le slug est detenu par\n` +
        `une carte publiee que la refonte archive, et reclame par une carte archivee\n` +
        `que la refonte reactive. Dans l'autre ordre, les deux seraient actives en\n` +
        `meme temps et l'index leverait.\n\n` +
        `Aucune de ces cartes ne porte de visuel : le lot 000 le verifie, et refuse\n` +
        `de laisser passer le contraire.`,
    ) +
    `\ncreate temporary table v5_retrait (id uuid, motif text) on commit drop;\n` +
    `insert into v5_retrait select (x ->> 'id')::uuid, x ->> 'motif'\n` +
    `from jsonb_array_elements(${bloc(ids)}) x;\n\n` +
    controle(
      `(select count(*) from public.prompt_media m join v5_retrait r on r.id = m.prompt_id) = 0`,
      `Lot 300 : une carte a retirer porte un visuel. Arret avant ecriture.`,
    ) +
    `\nupdate public.prompts p\n` +
    `set status = 'archived', updated_at = now()\n` +
    `from v5_retrait r\n` +
    `where p.id = r.id and p.status <> 'archived';\n` +
    controle(
      `(select count(*) from public.prompts p join v5_retrait r on r.id = p.id\n` +
        `        where p.status <> 'archived') = 0`,
      `Lot 300 : des cartes visees par le retrait sont encore actives.`,
    );
  fichiers.push(ecrire('300_retraits.sql', sql));
}

// --- 4NN : les 642 cartes -----------------------------------------------
const slugifier = (t) =>
  t
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, 80);

const TAILLE = 40;
const lots = [];
for (let i = 0; i < cartes.length; i += TAILLE) lots.push(cartes.slice(i, i + TAILLE));

lots.forEach((lot, n) => {
  const num = String(n + 1).padStart(2, '0');
  const lignes = lot.map((c) => ({
    ref: c.cle_carte,
    id: c.id_production,
    commande: c.commande,
    titre: c.titre,
    slug: c.id_production ? null : slugifier(c.titre),
    card_slug: slugifier(c.titre),
    description: c.description,
    entrees: c.entrees_minimum,
    sortie: c.sortie,
    format_sortie: c.format_sortie,
    ratio: c.ratio_sortie === 'sans_objet' ? null : c.ratio_sortie,
    temoin: c.type_temoin,
    mode: c.mode,
    library: c.library,
    statut: STATUT[c.statut_publication],
    // Une carte validee se range dans sa collection ; une carte en attente
    // de relecture se range directement dans le rayon de transition, qui
    // n'a pas de sous-rayon — ce qu'on y depose attend d'etre classe.
    cat: c.en_transition
      ? `V5-${c.rayon.toUpperCase()}`
      : `V5C-${c.collection.toUpperCase().replace(/--/g, '-')}`,
    champs_max: c.champs.length,
    regime: c.regime_champs,
    alias: c.aliases.map((a) => (typeof a === 'string' ? a : a.commande)).filter(Boolean),
  }));

  const maj = lignes.filter((l) => l.id).length;
  const neuf = lignes.length - maj;
  const sql =
    entete(
      `Lot 4${num} — cartes ${n * TAILLE + 1} a ${n * TAILLE + lot.length} sur ${cartes.length}`,
      `${maj} mises a jour sur une identite resolue, ${neuf} creations.\n\n` +
        `Une mise a jour porte sur l'identifiant reel, jamais sur le slug : cet\n` +
        `import renomme des titres, et resoudre par slug marcherait au premier\n` +
        `passage pour echouer au second. Le slug existant est conserve tel quel,\n` +
        `ce qui preserve les adresses deja partagees.\n\n` +
        `Ce lot n'ecrit ni like_count, ni created_at, ni is_free, ni un seul media.`,
    ) +
    `\ncreate temporary table v5_lot (\n` +
    `  ref text, id uuid, commande text, titre text, slug text, card_slug text,\n` +
    `  description text, entrees text, sortie text, format_sortie text, ratio text,\n` +
    `  temoin text, mode text, library text, statut text, cat text,\n` +
    `  champs_max int, regime text, alias jsonb\n) on commit drop;\n` +
    `insert into v5_lot select\n` +
    `  x ->> 'ref', nullif(x ->> 'id','')::uuid, x ->> 'commande', x ->> 'titre',\n` +
    `  x ->> 'slug', x ->> 'card_slug', x ->> 'description', x ->> 'entrees',\n` +
    `  x ->> 'sortie', x ->> 'format_sortie', x ->> 'ratio', x ->> 'temoin',\n` +
    `  x ->> 'mode', x ->> 'library', x ->> 'statut', x ->> 'cat',\n` +
    `  (x ->> 'champs_max')::int, x ->> 'regime', x -> 'alias'\n` +
    `from jsonb_array_elements(${bloc(lignes)}) x;\n\n` +
    `-- Les cartes resolues : mise a jour sur l'identifiant reel.\n` +
    `update public.prompts p set\n` +
    `  external_ref = l.ref, name = l.titre, short_description = l.description,\n` +
    `  command = l.commande, card_slug = l.card_slug,\n` +
    `  expected_input = l.entrees, expected_output = l.sortie,\n` +
    `  output_format = l.format_sortie, default_ratio = coalesce(l.ratio, p.default_ratio),\n` +
    `  witness_type = l.temoin, mode = l.mode::public.app_mode,\n` +
    `  library = l.library::public.app_library, status = l.statut::public.content_status,\n` +
    `  category_id = (select id from public.categories c where c.external_ref = l.cat),\n` +
    `  fiche_champs_max = l.champs_max, regime_champs = l.regime, catalog_version = 'v5',\n` +
    `  aliases = coalesce((select array_agg(a) from jsonb_array_elements_text(l.alias) a), '{}'),\n` +
    `  published_at = case when l.statut = 'published' then coalesce(p.published_at, now()) else p.published_at end,\n` +
    `  revised_at = now(), updated_at = now()\n` +
    `from v5_lot l where p.id = l.id;\n\n` +
    `-- Les cartes neuves : rejouables par external_ref, qui est unique.\n` +
    `insert into public.prompts (\n` +
    `  external_ref, command, name, slug, card_slug, short_description, expected_input,\n` +
    `  expected_output, output_format, default_ratio, witness_type, mode, library,\n` +
    `  status, category_id, fiche_champs_max, regime_champs, catalog_version, aliases, revised_at)\n` +
    `select l.ref, l.commande, l.titre, l.slug, l.card_slug, l.description, l.entrees,\n` +
    `  l.sortie, l.format_sortie, l.ratio, l.temoin, l.mode::public.app_mode,\n` +
    `  l.library::public.app_library, l.statut::public.content_status,\n` +
    `  (select id from public.categories c where c.external_ref = l.cat),\n` +
    `  l.champs_max, l.regime, 'v5',\n` +
    `  coalesce((select array_agg(a) from jsonb_array_elements_text(l.alias) a), '{}'), now()\n` +
    `from v5_lot l where l.id is null\n` +
    `on conflict (external_ref) do update set\n` +
    `  name = excluded.name, short_description = excluded.short_description,\n` +
    `  expected_input = excluded.expected_input, expected_output = excluded.expected_output,\n` +
    `  category_id = excluded.category_id, status = excluded.status,\n` +
    `  fiche_champs_max = excluded.fiche_champs_max, regime_champs = excluded.regime_champs,\n` +
    `  revised_at = now(), updated_at = now();\n` +
    controle(
      `(select count(*) from public.prompts p join v5_lot l on l.ref = p.external_ref) = ${lignes.length}`,
      `Lot 4${num} : les ${lignes.length} cartes du lot ne sont pas toutes en base.`,
    ) +
    controle(
      `not exists (select 1 from public.prompts p join v5_lot l on l.ref = p.external_ref\n` +
        `            where p.category_id is null)`,
      `Lot 4${num} : une carte est rattachee a aucun rayon. L'import s'arrete.`,
    );
  fichiers.push(ecrire(`4${num}_cartes_${num}.sql`, sql));
});

// --- 5NN : un seul payload, ecrit sur les trois variantes ---------------
lots.forEach((lot, n) => {
  const num = String(n + 1).padStart(2, '0');
  const lignes = lot.map((c) => ({ ref: c.cle_carte, payload: c.playloads }));
  const sql =
    entete(
      `Lot 5${num} — payloads ${n * TAILLE + 1} a ${n * TAILLE + lot.length}`,
      `Une commande porte un texte unique, copie tel quel quelle que soit l'IA.\n\n` +
        `Ce texte est ecrit sur LES TROIS variantes de la carte, identique sur\n` +
        `chacune. C'est deliberе : le membre obtient le meme texte quel que soit le\n` +
        `fournisseur — la regle est tenue — et le code qui resout encore par\n` +
        `provider_key continue de fonctionner sans modification. Quand l'interface\n` +
        `cessera de demander une IA, il n'y aura rien a remigrer.\n\n` +
        `L'ancienne version courante passe en 'retired', elle n'est pas detruite :\n` +
        `l'historique des payloads reste lisible.`,
    ) +
    `\ncreate temporary table v5_payload (ref text, payload text) on commit drop;\n` +
    `insert into v5_payload select x ->> 'ref', x ->> 'payload'\n` +
    `from jsonb_array_elements(${bloc(lignes)}) x;\n\n` +
    `-- Une variante par fournisseur actif, creee si elle manque.\n` +
    `insert into public.prompt_variants (prompt_id, provider_id, status, compatibility)\n` +
    `select p.id, f.id, 'published', 'bon'\n` +
    `from v5_payload v\n` +
    `join public.prompts p on p.external_ref = v.ref\n` +
    `cross join public.ai_providers f where f.is_active\n` +
    `on conflict (prompt_id, provider_id) do update set status = 'published', updated_at = now();\n\n` +
    `-- L'ancienne version courante se retire avant que la nouvelle prenne sa place :\n` +
    `-- l'index partiel n'admet qu'une seule version courante par variante.\n` +
    `update public.prompt_versions pv set is_current = false, status = 'retired', updated_at = now()\n` +
    `from public.prompt_variants pva\n` +
    `join public.prompts p on p.id = pva.prompt_id\n` +
    `join v5_payload v on v.ref = p.external_ref\n` +
    `where pv.variant_id = pva.id and pv.is_current\n` +
    `  and pv.payload is distinct from v.payload;\n\n` +
    `insert into public.prompt_versions (variant_id, version_label, payload, status, is_current, published_at)\n` +
    `select pva.id, 'v5', v.payload, 'published', true, now()\n` +
    `from v5_payload v\n` +
    `join public.prompts p on p.external_ref = v.ref\n` +
    `join public.prompt_variants pva on pva.prompt_id = p.id\n` +
    `where not exists (\n` +
    `  select 1 from public.prompt_versions x\n` +
    `  where x.variant_id = pva.id and x.is_current and x.payload = v.payload);\n` +
    controle(
      `not exists (\n` +
        `    select 1 from v5_payload v join public.prompts p on p.external_ref = v.ref\n` +
        `    join public.prompt_variants pva on pva.prompt_id = p.id\n` +
        `    left join public.prompt_versions pv on pv.variant_id = pva.id and pv.is_current\n` +
        `    where pv.id is null or pv.payload is distinct from v.payload)`,
      `Lot 5${num} : une variante ne sert pas le payload V5 attendu.`,
    );
  fichiers.push(ecrire(`5${num}_payloads_${num}.sql`, sql));
});

// --- 600 : champs et tags -----------------------------------------------
{
  const champs = [];
  const liens = [];
  const KIND = {
    texte: 'texte',
    texte_long: 'texte_long',
    nombre: 'nombre',
    liste: 'liste',
    choix: 'liste',
    number: 'nombre',
    text: 'texte',
  };
  for (const c of cartes) {
    c.champs.forEach((ch, i) => {
      champs.push({
        ref: c.cle_carte,
        cle: ch.cle,
        libelle: ch.libelle || ch.cle,
        indication: ch.exemple || null,
        kind: KIND[ch.type] || 'texte',
        requis: ch.requis === true,
        position: i + 1,
      });
    });
    for (const t of c.tags) liens.push({ ref: c.cle_carte, tag: t });
  }
  const sql =
    entete(
      `Lot 600 — ${champs.length} champs a remplir et ${liens.length} associations de tags`,
      `Les champs sont ce que le membre renseigne avant de copier. Depuis que le\n` +
        `texte ne depend plus de l'IA, c'est la seule personnalisation d'une carte.\n` +
        `La borne tient en base : trois au plus en regime standard, quatre en\n` +
        `marketing, et l'extraction a verifie que les 642 cartes la respectent.\n\n` +
        `Les champs sont reecrits entierement pour les cartes du lot, jamais\n` +
        `fusionnes : un champ retire du CSV doit disparaitre de la fiche, sinon la\n` +
        `borne se contourne d'elle-meme au fil des imports.\n\n` +
        `Les tags hors referentiel V5 sont desactives une fois leurs associations\n` +
        `migrees, pas avant, et ne sont pas supprimes : une archive peut encore\n` +
        `les porter.`,
    ) +
    `\ncreate temporary table v5_champ (ref text, cle text, libelle text, indication text,\n` +
    `  kind text, requis boolean, position int) on commit drop;\n` +
    `insert into v5_champ select x ->> 'ref', x ->> 'cle', x ->> 'libelle', x ->> 'indication',\n` +
    `  x ->> 'kind', (x ->> 'requis')::boolean, (x ->> 'position')::int\n` +
    `from jsonb_array_elements(${bloc(champs)}) x;\n\n` +
    `delete from public.prompt_fields f using public.prompts p\n` +
    `where f.prompt_id = p.id and p.external_ref like 'rc5-%';\n\n` +
    `insert into public.prompt_fields (prompt_id, cle, libelle, indication, kind, requis, position)\n` +
    `select p.id, c.cle, c.libelle, c.indication, c.kind::public.prompt_field_kind,\n` +
    `       c.requis, c.position\n` +
    `from v5_champ c join public.prompts p on p.external_ref = c.ref;\n` +
    controle(
      `(select count(*) from public.prompt_fields f join public.prompts p on p.id = f.prompt_id\n` +
        `        where p.external_ref like 'rc5-%') = ${champs.length}`,
      `Lot 600 : les ${champs.length} champs V5 ne sont pas tous poses.`,
    ) +
    `\ncreate temporary table v5_lien (ref text, tag text) on commit drop;\n` +
    `insert into v5_lien select x ->> 'ref', x ->> 'tag'\n` +
    `from jsonb_array_elements(${bloc(liens)}) x;\n\n` +
    `delete from public.prompt_tags pt using public.prompts p\n` +
    `where pt.prompt_id = p.id and p.external_ref like 'rc5-%';\n\n` +
    `insert into public.prompt_tags (prompt_id, tag_id)\n` +
    `select p.id, t.id from v5_lien l\n` +
    `join public.prompts p on p.external_ref = l.ref\n` +
    `join public.tags t on t.slug = l.tag\n` +
    `on conflict do nothing;\n` +
    controle(
      `(select count(*) from public.prompt_tags pt join public.prompts p on p.id = pt.prompt_id\n` +
        `        where p.external_ref like 'rc5-%') = ${liens.length}`,
      `Lot 600 : les ${liens.length} associations de tags V5 ne sont pas toutes posees.`,
    ) +
    `\n-- Les tags hors referentiel sortent de la decouverte, maintenant que plus\n` +
    `-- aucune carte active ne les porte. Desactives, pas supprimes.\n` +
    `update public.tags set is_active = false, updated_at = now()\n` +
    `where is_active and groupe not in ('bibliotheque', 'ia')\n` +
    `  and slug not in (select slug from jsonb_to_recordset(${bloc(taxo.tags.map((t) => ({ slug: t.slug })))}) as t(slug text))\n` +
    `  and not exists (\n` +
    `    select 1 from public.prompt_tags pt join public.prompts p on p.id = pt.prompt_id\n` +
    `    where pt.tag_id = tags.id and p.status <> 'archived');\n`;
  fichiers.push(ecrire('600_champs_et_tags.sql', sql));
}

// --- 900 : le bilan -----------------------------------------------------
{
  const publiees = cartes.filter((c) => c.statut_publication === 'conserver_publie').length;
  const brouillons = cartes.length - publiees;
  const sql =
    entete(
      'Lot 900 — le bilan de la refonte',
      `Ce lot n'ecrit rien non plus. Il compte ce que les lots precedents ont\n` +
        `produit et leve si le compte n'y est pas. Une refonte qui ne se compte\n` +
        `pas n'est pas une refonte terminee.\n\n` +
        `Une exception, voulue : les cartes actives hors V5 sont signalees, pas\n` +
        `condamnees. Une carte apparue depuis l'extraction est absente du\n` +
        `manifeste, et une carte absente du manifeste ne doit pas etre archivee\n` +
        `par un lot qui ne sait rien d'elle. On la compte, on la nomme, on\n` +
        `tranche a la main.`,
    ) +
    `\nselect 'cartes V5 en base' as controle, count(*) as n from public.prompts where catalog_version = 'v5';\n\n` +
    `select p.status as statut, count(*) as cartes from public.prompts p\n` +
    `where p.catalog_version = 'v5' group by 1 order by 1;\n\n` +
    `select c.name as rayon, count(*) as cartes from public.prompts p\n` +
    `join public.categories c on c.id = p.category_id\n` +
    `where p.catalog_version = 'v5' group by 1 order by 2 desc;\n\n` +
    `select 'visuels preserves' as controle, count(*) as fichiers from public.prompt_media;\n\n` +
    `select 'cartes actives hors V5' as controle, count(*) as n from public.prompts\n` +
    `where catalog_version is distinct from 'v5' and status <> 'archived';\n` +
    controle(
      `(select count(*) from public.prompts where catalog_version = 'v5') = ${cartes.length}`,
      `Lot 900 : la refonte devait produire ${cartes.length} cartes.`,
    ) +
    controle(
      `(select count(*) from public.prompts where catalog_version = 'v5' and status = 'published') = ${publiees}`,
      `Lot 900 : ${publiees} cartes devaient etre publiees.`,
    ) +
    controle(
      `(select count(*) from public.prompts where catalog_version = 'v5' and status = 'draft') = ${brouillons}`,
      `Lot 900 : ${brouillons} cartes devaient rester en brouillon.`,
    ) +
    controle(
      `(select count(*) from public.prompt_media) = 1064`,
      `Lot 900 : le nombre de visuels a change. La refonte ne devait en toucher aucun.`,
    ) +
    `\ndo $reste$\ndeclare\n  v_n integer;\nbegin\n` +
    `  select count(*) into v_n from public.prompts\n` +
    `  where catalog_version is distinct from 'v5' and status <> 'archived';\n` +
    `  if v_n > 0 then\n` +
    `    raise notice 'Cartes actives hors V5 : % — apparues depuis l''extraction. '\n` +
    `      'A trancher une par une ; la refonte ne les archive pas.', v_n;\n` +
    `  end if;\nend $reste$;\n`;
  fichiers.push(ecrire('900_bilan.sql', sql));
}

console.log(`${fichiers.length} lots ecrits dans supabase/seed/catalogue-final-v5/`);
console.log(
  `  cartes    : ${cartes.length} (${cartes.filter((c) => c.id_production).length} mises a jour, ${cartes.filter((c) => !c.id_production).length} creations)`,
);
console.log(`  retraits  : ${retraits.length}`);
console.log(
  `  taxonomie : ${taxo.categories.length} categories, ${taxo.collections.length} collections, ${taxo.tags.length} tags`,
);
