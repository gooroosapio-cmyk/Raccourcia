#!/usr/bin/env node
/**
 * Ce que chaque commande rend, et ce que chaque rayon raconte.
 *
 *   node scripts/generer-formats-et-rayons.mjs <chemin-du-csv>
 *
 * TROIS MANQUES, UNE SEULE SOURCE.
 *
 * 1. LA COLONNE « VOUS OBTENEZ » EST VIDE. Le bloc de la fiche ne rend
 *    rien quand `output_formats` est vide — et l'import du catalogue ne
 *    l'a jamais rempli : la colonne `sortie` du referentiel n'etait lue
 *    par personne. Mille cinq cent quatre-vingt-quinze cartes annoncent
 *    donc leur resultat nulle part.
 *
 * 2. AUCUN TAG NE DIT LE FORMAT RENDU. On peut chercher « portrait » ou
 *    « juridique », pas « ce qui me rend un CSV ». C'est pourtant la
 *    question qu'on se pose quand on cherche un outil plutot qu'une idee.
 *    Les tags sont prefixes `sortie-` : `tableur` existe deja comme sujet,
 *    et deux tags de meme nom dans deux groupes seraient illisibles.
 *
 * 3. LES RAYONS DE TEXTES NE MONTRENT RIEN. Une carte de tag Images
 *    emprunte le visuel d'une de ses commandes ; « Synthese » n'a aucune
 *    image a emprunter. Une phrase tient cette place mieux qu'un compteur.
 *
 * Les descriptions sont ecrites ici, a la main, et non deduites : une
 * phrase generee a partir du nom du tag dirait « Tag redaction », ce qui
 * n'apprend rien a personne.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = process.argv[2];
if (!SOURCE) {
  console.error('Usage : node scripts/generer-formats-et-rayons.mjs <chemin-du-csv>');
  process.exit(1);
}

const DESTINATION = 'supabase/seed/formats-et-rayons';

/* ------------------------------------------------------------------ */
/* Lecture du CSV (RFC 4180)                                           */
/* ------------------------------------------------------------------ */

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
        } else entreGuillemets = false;
      } else champ += c;
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
    } else if (c !== '\r') champ += c;
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

const sql = (valeur) => `'${String(valeur ?? '').replace(/'/g, "''")}'`;

/* ------------------------------------------------------------------ */
/* Le vocabulaire                                                      */
/* ------------------------------------------------------------------ */

/**
 * Ce que le referentiel ecrit, et ce que la base sait nommer.
 *
 * `output_formats` est une enumeration courte et stable — c'est elle que
 * la fiche traduit en « 1 image finale », « 1 tableur ». Le referentiel,
 * lui, est plus precis : il distingue un XLSX d'un CSV. On garde les deux :
 * l'enumeration pour la phrase, le tag pour la recherche.
 */
const FORMAT = {
  image: 'image',
  chat: 'texte',
  pdf: 'pdf',
  docx: 'document',
  xlsx: 'tableur',
  csv: 'tableur',
  pptx: 'presentation',
  email: 'texte',
  formule: 'texte',
  prompt: 'texte',
  sql: 'code',
  html: 'code',
};

/** Un tag par format rendu, dans le groupe « Ce que vous obtenez ». */
const TAGS_DE_SORTIE = {
  image: ['sortie-image', 'Image', 'La commande rend une image à télécharger.'],
  chat: [
    'sortie-conversation',
    'Conversation',
    'La commande installe un échange : l’IA répond, vous relancez.',
  ],
  pdf: ['sortie-pdf', 'PDF', 'Le résultat se met en page et s’imprime tel quel.'],
  docx: [
    'sortie-document',
    'Document Word',
    'Un document structuré, à reprendre dans un traitement de texte.',
  ],
  xlsx: [
    'sortie-tableur',
    'Tableur',
    'Des lignes et des colonnes, prêtes à coller dans un tableur.',
  ],
  csv: ['sortie-csv', 'Fichier CSV', 'Des données séparées par des virgules, à importer ailleurs.'],
  pptx: [
    'sortie-presentation',
    'Présentation',
    'Un plan de diapositives, titre et contenu par écran.',
  ],
  email: ['sortie-email', 'E-mail', 'Un message prêt à envoyer, objet compris.'],
  formule: ['sortie-formule', 'Formule de calcul', 'Une formule à coller dans une cellule.'],
  prompt: ['sortie-prompt', 'Prompt', 'Un texte destiné à être donné à une autre IA.'],
  sql: ['sortie-sql', 'Requête SQL', 'Une requête à exécuter sur une base de données.'],
  html: ['sortie-html', 'Page HTML', 'Du code de page, à ouvrir dans un navigateur.'],
};

/**
 * Ce que chaque rayon de Textes et de Reflexions contient.
 *
 * Ecrites une par une. Elles disent ce qu'on trouve derriere, jamais ce
 * que le mot signifie : « Rédaction : des textes à écrire » ne fait
 * choisir personne.
 */
const DESCRIPTIONS = {
  texte: 'Tout ce qui se rend sous forme écrite, du message court au dossier.',
  professionnel: 'Des commandes pour le travail : clients, équipes, dossiers, décisions.',
  reflexion: 'L’IA raisonne avec vous plutôt que de produire un livrable d’un coup.',
  conversation: 'Un échange qui dure : l’IA garde le fil et vous relancez.',
  redaction: 'Écrire depuis une page blanche : articles, messages, argumentaires.',
  document: 'Des pièces structurées — rapports, comptes rendus, contrats, notes.',
  marketing: 'Vendre, présenter, convaincre : annonces, fiches, pages et campagnes.',
  decision: 'Peser le pour et le contre avant de trancher.',
  analyse: 'Lire un texte, un chiffre ou une situation, et en tirer ce qui compte.',
  interactif: 'La commande pose des questions et s’adapte à vos réponses.',
  assistant: 'Un rôle tenu dans la durée : l’IA endosse un métier et s’y tient.',
  jeu: 'Des règles, des tours, un objectif — on joue avec l’IA.',
  tableur: 'Des lignes et des colonnes, prêtes à coller dans une feuille de calcul.',
  pedagogie: 'Apprendre et faire apprendre : cours, exercices, révisions.',
  code: 'Du code à exécuter, à relire ou à corriger.',
  transformation: 'Reprendre un contenu existant et lui donner une autre forme.',
  coaching: 'L’IA vous accompagne pas à pas plutôt que de faire à votre place.',
  simulation: 'Répéter une situation — entretien, négociation, crise — avant la vraie.',
  fiction: 'Récits, personnages et univers inventés.',
  synthese: 'Faire court à partir de long, sans perdre l’essentiel.',
  technique: 'Des sujets d’ingénierie, d’outillage et de méthode.',
  personnage: 'L’IA incarne quelqu’un et répond depuis son point de vue.',
  finance: 'Chiffres d’activité, budgets, prévisions et arbitrages.',
  juridique: 'Contrats, clauses et conformité. À faire relire par un professionnel.',
  donnees: 'Tableaux, mesures et jeux de données à exploiter.',
  communication: 'Ce qu’on adresse à d’autres : annonces, réponses, prises de parole.',
  presentation: 'Des plans de diapositives, un écran par idée.',
  creatif: 'Des angles inattendus, quand la réponse évidente ne suffit pas.',
  calcul: 'Des formules et des opérations à appliquer.',
  prompt: 'Des textes destinés à être donnés à une autre IA.',
};

/* ------------------------------------------------------------------ */

const lignes = lireCsv(readFileSync(SOURCE, 'utf8').replace(/^﻿/, ''));
mkdirSync(DESTINATION, { recursive: true });

function enTete(titre, corps) {
  return `-- =====================================================================\n-- ${titre}\n-- =====================================================================\n\n${corps}\n`;
}

const ecrire = (nom, contenu) => writeFileSync(join(DESTINATION, nom), contenu, 'utf8');

/* --- 1. Les formats rendus --------------------------------------------- */

const inconnus = new Set();
const paires = lignes
  .map((l) => {
    const sortie = (l.sortie ?? '').trim().toLowerCase();
    const format = FORMAT[sortie];
    if (!format) {
      if (sortie) inconnus.add(sortie);
      return null;
    }
    return { carte: l.carte_id, sortie, format };
  })
  .filter(Boolean);

if (inconnus.size > 0) {
  console.error(`Sorties inconnues, non traduites : ${[...inconnus].join(', ')}`);
  process.exit(1);
}

const PAR_LOT = 400;
let lot = 0;
for (let i = 0; i < paires.length; i += PAR_LOT) {
  lot += 1;
  const tranche = paires.slice(i, i + PAR_LOT);
  const valeurs = tranche.map((p) => `  (${sql(p.carte)}, ${sql(p.format)}, ${sql(p.sortie)})`);

  ecrire(
    `0${String(lot).padStart(2, '0')}_formats_de_sortie.sql`,
    enTete(
      `Ce que rendent ${tranche.length} cartes`,
      `begin;

create temporary table lot_sortie (carte_id text, format text, sortie text)
  on commit drop;

insert into lot_sortie values
${valeurs.join(',\n')};

-- CE QUE CE LOT REPARE, ET POURQUOI IL DOIT ECRASER.
--
-- \`output_formats\` n'est jamais vide : un declencheur le remplit a
-- l'insertion, a partir de \`output_type\`. L'import du catalogue ne
-- renseigne pas \`output_type\` — il tombe donc sur sa valeur par defaut,
-- et les mille cinq cent quatre-vingt-quinze cartes ont recu
-- \`{texte}\`. Les mille deux cent quarante-deux commandes IMAGE
-- annoncaient donc « 1 texte » dans « Vous obtenez ».
--
-- Un lot qui ne remplirait que le vide ne corrigerait rien : il n'y a pas
-- de vide, il y a une valeur fausse. On remplace donc, mais seulement
-- \`{texte}\` — la valeur que le declencheur pose faute de mieux. Toute
-- autre valeur a ete choisie par quelqu'un, et un import ne defait pas une
-- correction.
--
-- \`output_type\` est corrige en meme temps : sans lui, la prochaine
-- reinsertion de la carte reposerait la meme valeur fausse.
update public.prompts p
set output_formats = array[l.format]::public.output_format_kind[],
    output_type = (case when l.format = 'image' then 'image' else 'text' end)::public.output_type,
    updated_at = now()
from lot_sortie l
where p.card_id = l.carte_id
  and p.output_formats is distinct from array[l.format]::public.output_format_kind[]
  and (
    coalesce(array_length(p.output_formats, 1), 0) = 0
    or p.output_formats = array['texte']::public.output_format_kind[]
  );

commit;`,
    ),
  );
}

/* --- 2. Les tags de sortie --------------------------------------------- */

const utilises = [...new Set(paires.map((p) => p.sortie))].sort();
const valeursTags = utilises.map((s) => {
  const [slug, nom, description] = TAGS_DE_SORTIE[s];
  return `  (${sql(s)}, ${sql(slug)}, ${sql(nom)}, ${sql(description)})`;
});

const valeursLiens = paires.map((p) => `  (${sql(p.carte)}, ${sql(p.sortie)})`);

ecrire(
  '100_tags_de_sortie.sql',
  enTete(
    `Un tag par format rendu (${utilises.length} formats)`,
    `begin;

create temporary table lot_tags_sortie (sortie text, slug text, nom text, description text)
  on commit drop;

insert into lot_tags_sortie values
${valeursTags.join(',\n')};

-- Groupe \`resultat\` : la Bibliotheque l'intitule « Ce que vous obtenez ».
-- C'est exactement la question a laquelle ces tags repondent, et c'est ce
-- qui les distingue de \`tableur\` ou \`document\`, qui disent un sujet.
insert into public.tags (slug, name, groupe, description, is_active)
select l.slug, l.nom, 'resultat'::public.tag_group, l.description, true
from lot_tags_sortie l
on conflict (slug) do update
set name = excluded.name,
    groupe = excluded.groupe,
    description = excluded.description,
    updated_at = now();

create temporary table lot_liens_sortie (carte_id text, sortie text) on commit drop;

insert into lot_liens_sortie values
${valeursLiens.join(',\n')};

insert into public.prompt_tags (prompt_id, tag_id)
select p.id, t.id
from lot_liens_sortie l
join public.prompts p on p.card_id = l.carte_id
join lot_tags_sortie s on s.sortie = l.sortie
join public.tags t on t.slug = s.slug
on conflict do nothing;

do $rapport$
declare v_tags integer; v_liens integer;
begin
  select count(*) into v_tags from public.tags where groupe = 'resultat' and slug like 'sortie-%';
  select count(*) into v_liens
  from public.prompt_tags pt
  join public.tags t on t.id = pt.tag_id
  where t.groupe = 'resultat' and t.slug like 'sortie-%';
  raise notice 'Formats de sortie : % tag(s), % association(s).', v_tags, v_liens;
end $rapport$;

commit;`,
  ),
);

/* --- 3. Les descriptions de rayons -------------------------------------- */

const valeursDescriptions = Object.entries(DESCRIPTIONS).map(
  ([slug, texte]) => `  (${sql(slug)}, ${sql(texte)})`,
);

ecrire(
  '200_descriptions_de_rayons.sql',
  enTete(
    `Ce que contient chaque rayon (${valeursDescriptions.length} tags)`,
    `begin;

create temporary table lot_descriptions (slug text, description text) on commit drop;

insert into lot_descriptions values
${valeursDescriptions.join(',\n')};

-- On ne remplace pas une description deja ecrite : l'administration passe
-- devant l'import, toujours.
update public.tags t
set description = l.description, updated_at = now()
from lot_descriptions l
where t.slug = l.slug
  and coalesce(btrim(t.description), '') = '';

do $rapport$
declare v_avec integer; v_total integer;
begin
  select count(*) filter (where coalesce(btrim(description), '') <> ''), count(*)
  into v_avec, v_total from public.tags where is_active;
  raise notice 'Rayons : % tag(s) decrits sur %.', v_avec, v_total;
end $rapport$;

commit;`,
  ),
);

console.log(`  ${lot + 2} fichiers ecrits dans ${DESTINATION}`);
console.log(
  `  ${paires.length} cartes, ${utilises.length} formats, ${valeursDescriptions.length} descriptions`,
);
