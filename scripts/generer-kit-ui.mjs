/**
 * Transforme le kit UI en sources du depot.
 *
 * Le kit arrive en trois morceaux : un manifeste qui dit quelle icone et
 * quelle illustration vont a quelle clef de taxonomie, un module de SVG
 * complets, et des jetons de couleur. Rien n'est redessine ici : les traces
 * sont recopies caractere pour caractere. Deux choses seulement changent.
 *
 * 1. Les couleurs. Les illustrations portent quatre valeurs ecrites en dur,
 *    dont le bleu #1761F5 du kit. Le depot a son propre bleu, et le prompt
 *    demande de garder celui du depot. Une illustration qui garderait le
 *    sien jurerait a cote d'un bouton a deux centimetres. Les quatre valeurs
 *    deviennent donc des variables CSS : la substitution est litterale, elle
 *    ne touche aucune donnee de trace.
 *
 * 2. Les clefs. Le manifeste vient du classeur V2, donc d'avant le rangement
 *    des rayons. Neuf rayons vivants portent aujourd'hui un autre slug ;
 *    `data/kit-ui/heritages.json` dit lequel herite de quoi.
 *
 * Sortie : deux modules de code et un lot SQL. Le SQL porte les descriptions
 * de rayon, qui sont de la donnee de catalogue et n'ont rien a faire dans le
 * frontend — la regle du depot est explicite la-dessus.
 *
 *   node scripts/generer-kit-ui.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (chemin) => readFileSync(join(racine, chemin), 'utf8');

const SOURCE_ASSETS = 'data/kit-ui/09_ASSETS_CLAUDE.ts';
const SOURCE_MANIFESTE = 'data/kit-ui/03_TAXONOMIE_ASSETS.json';
const SOURCE_HERITAGES = 'data/kit-ui/heritages.json';

/**
 * Les quatre couleurs du kit, et le jeton qui les remplace.
 *
 * L'ordre n'a pas d'importance : les quatre valeurs sont distinctes et la
 * substitution est litterale. Le compte attendu est verifie plus bas — une
 * valeur qui cesserait d'apparaitre signalerait un kit different de celui
 * sur lequel cette correspondance a ete etablie.
 */
const TEINTES = [
  ['#1761F5', 'var(--illus-trait)'],
  ['#EAF1FF', 'var(--illus-fond)'],
  ['#D8E5FF', 'var(--illus-forme)'],
  ['#DDE8FF', 'var(--illus-vague)'],
];

/** Extrait un dictionnaire du module du kit, sans l'executer. */
function lireDictionnaire(source, nom) {
  const debut = source.indexOf(`export const ${nom}`);
  if (debut === -1) throw new Error(`Dictionnaire ${nom} absent du kit.`);
  const fin = source.indexOf('\n};', debut);
  const bloc = source.slice(debut, fin);

  const entrees = new Map();
  for (const ligne of bloc.matchAll(/^ {2}"([^"]+)": "((?:[^"\\]|\\.)*)",?$/gm)) {
    entrees.set(ligne[1], JSON.parse(`"${ligne[2]}"`));
  }
  if (entrees.size === 0) throw new Error(`Dictionnaire ${nom} vide.`);
  return entrees;
}

function teinter(svg) {
  let resultat = svg;
  for (const [valeur, jeton] of TEINTES) resultat = resultat.split(valeur).join(jeton);
  return resultat;
}

/**
 * Prepare un SVG pour un rendu en ligne.
 *
 * Le kit fixe `viewBox` mais pas les dimensions : c'est l'appelant qui les
 * donne par CSS. L'attribut `xmlns` ne sert qu'a un fichier autonome ; dans
 * un document HTML il n'apporte rien et pese sur chaque rendu.
 */
function nettoyer(svg) {
  return svg.replace(' xmlns="http://www.w3.org/2000/svg"', '').replace(/\s+>/g, '>');
}

const source = lire(SOURCE_ASSETS);
const icones = lireDictionnaire(source, 'ICONS');
const illustrations = lireDictionnaire(source, 'MENU_ILLUSTRATIONS');
const manifeste = JSON.parse(lire(SOURCE_MANIFESTE));
const { heritages } = JSON.parse(lire(SOURCE_HERITAGES));

// --- Controles avant ecriture -------------------------------------------
//
// Un kit incomplet doit arreter la generation, pas produire des ecrans avec
// des trous : une illustration manquante ne se voit qu'a l'execution, et
// seulement sur le rayon concerne.
const attenduesIcones = [
  ...manifeste.ui_icons.map((entree) => entree.icon_id),
  ...manifeste.categories.map((entree) => entree.icon_id),
  ...manifeste.collections.map((entree) => entree.icon_id),
];
const manquantes = attenduesIcones.filter((id) => !icones.has(id));
if (manquantes.length > 0) throw new Error(`Icones absentes du kit : ${manquantes.join(', ')}`);

const manquantesIllus = manifeste.collections
  .map((entree) => entree.illustration_id)
  .filter((id) => !illustrations.has(id));
if (manquantesIllus.length > 0) {
  throw new Error(`Illustrations absentes du kit : ${manquantesIllus.join(', ')}`);
}

// Ces chaines sont injectees telles quelles dans le HTML : rien d'autre
// qu'un dessin n'a le droit d'y entrer. Le kit est un fichier qu'on nous
// remet, pas une source que l'on ecrit — le verifier ici coute une boucle et
// evite qu'un contenu actif traverse la generation sans qu'on le voie.
for (const [nom, svg] of [...icones, ...illustrations]) {
  if (/<script|\son\w+\s*=|javascript:/i.test(svg)) {
    throw new Error(`Asset ${nom} : contenu actif dans un SVG, generation interrompue.`);
  }
  if (!svg.startsWith('<svg ') || !svg.endsWith('</svg>')) {
    throw new Error(`Asset ${nom} : ce n'est pas un SVG complet.`);
  }
}

const teintes = [...illustrations.values()].join('');
for (const [valeur] of TEINTES) {
  if (!teintes.includes(valeur)) throw new Error(`Couleur ${valeur} absente : kit different.`);
}

// --- Correspondance clef de rayon -> assets ------------------------------
const parClefDuKit = new Map(
  manifeste.collections.map((entree) => [entree.collection_key, entree]),
);
const rayons = new Map();

for (const entree of manifeste.collections) {
  rayons.set(entree.collection_key, {
    icone: entree.icon_id,
    illustration: entree.illustration_id,
    description: entree.description,
  });
}

for (const heritage of heritages) {
  const ancetre = parClefDuKit.get(heritage.kit);
  if (!ancetre)
    throw new Error(`Heritage ${heritage.slug} : clef ${heritage.kit} inconnue du kit.`);
  rayons.set(heritage.slug, {
    icone: ancetre.icon_id,
    illustration: ancetre.illustration_id,
    description: heritage.description ?? ancetre.description,
  });
  // La clef d'origine disparait : le rayon qui la portait n'existe plus, et
  // la laisser ouvrirait la porte a deux rayons sur la meme illustration.
  rayons.delete(heritage.kit);
}

const familles = new Map(
  manifeste.categories.map((entree) => [
    entree.key,
    { icone: entree.icon_id, description: entree.description },
  ]),
);

// --- Ecriture ------------------------------------------------------------
const entete = (source) => `// Genere par scripts/generer-kit-ui.mjs — ne pas modifier a la main.
// Source : ${source}
`;

const dictionnaire = (entrees, transformer) =>
  [...entrees]
    .map(([clef, valeur]) => `  ${JSON.stringify(clef)}: ${JSON.stringify(transformer(valeur))},`)
    .join('\n');

writeFileSync(
  join(racine, 'lib/ui/kit-icones.ts'),
  `${entete(SOURCE_ASSETS)}
/**
 * Les 72 symboles du kit, traces Lucide, couleur portee par \`currentColor\`.
 *
 * Un dictionnaire et non 72 composants : une icone se choisit ici par une
 * clef de taxonomie venue de la base, jamais par un nom ecrit dans l'ecran.
 */
export const ICONES_DU_KIT: Record<string, string> = {
${dictionnaire(icones, nettoyer)}
};
`,
);

writeFileSync(
  join(racine, 'lib/ui/kit-illustrations.ts'),
  `${entete(SOURCE_ASSETS)}import 'server-only';

/**
 * Les 50 illustrations de rayon, en 320 x 200.
 *
 * Reservees au serveur. Elles pesent cinquante kilo-octets a elles seules et
 * ne servent qu'aux tuiles de la Bibliotheque, qui sont rendues au serveur :
 * les embarquer dans le navigateur ferait voyager les cinquante pour en
 * afficher six.
 *
 * Les quatre couleurs du kit sont devenues des variables CSS ; les traces
 * sont ceux du kit, caractere pour caractere.
 */
export const ILLUSTRATIONS_DU_KIT: Record<string, string> = {
${dictionnaire(illustrations, (svg) => nettoyer(teinter(svg)))}
};
`,
);

const lignes = (entrees) =>
  [...entrees]
    .map(([clef, valeur]) => `  ${JSON.stringify(clef)}: ${JSON.stringify(valeur)},`)
    .join('\n');

writeFileSync(
  join(racine, 'lib/ui/kit-taxonomie.ts'),
  `${entete(`${SOURCE_MANIFESTE} + ${SOURCE_HERITAGES}`)}
/** Ce qu'un rayon ou une famille emprunte au kit. */
export type AssetsDuRayon = { icone: string; illustration: string; description: string };
export type AssetsDeLaFamille = { icone: string; description: string };

/**
 * Par slug de rayon, tel que la base le porte apres le rangement.
 *
 * Neuf entrees sont des heritages : le kit decrit la taxonomie du classeur
 * V2, neuf rayons ont depuis change de nom ou fusionne. Les clefs d'origine
 * ne figurent plus ici — les rayons qui les portaient n'existent plus.
 */
export const ASSETS_PAR_RAYON: Record<string, AssetsDuRayon> = {
${lignes(rayons)}
};

/** Par slug de famille. Les huit clefs du classeur sont restees valides. */
export const ASSETS_PAR_FAMILLE: Record<string, AssetsDeLaFamille> = {
${lignes(familles)}
};
`,
);

// --- Les descriptions partent en base ------------------------------------
//
// Elles remplacent les compteurs sous les tuiles : « 16 commandes » ne dit
// pas si le rayon contient ce qu'on cherche. Elles vont dans `categories`,
// pas dans un fichier du frontend : une description de rayon est de la
// donnee de catalogue, elle se corrige depuis l'administration et non par un
// deploiement.
const citer = (texte) => `'${texte.replaceAll("'", "''")}'`;

const majs = [
  ...[...familles].map(
    ([slug, assets]) =>
      `update public.categories set short_description = ${citer(assets.description)} where slug = ${citer(slug)} and parent_id is null;`,
  ),
  ...[...rayons].map(
    ([slug, assets]) =>
      `update public.categories set short_description = ${citer(assets.description)} where slug = ${citer(slug)} and parent_id is not null;`,
  ),
];

mkdirSync(join(racine, 'supabase/seed/kit-ui'), { recursive: true });
writeFileSync(
  join(racine, 'supabase/seed/kit-ui/001_descriptions.sql'),
  `-- =====================================================================
-- Descriptions des familles et des rayons
--
-- Genere par scripts/generer-kit-ui.mjs depuis ${SOURCE_MANIFESTE}.
-- Ne pas modifier a la main : regenerer.
--
-- Ce que la tuile d'un rayon disait jusqu'ici, c'etait son nombre de
-- commandes. Un compteur ne fait pas choisir : « 16 commandes » ne dit pas
-- si l'on y trouvera ce qu'on cherche. Une phrase le dit.
--
-- Deux rayons ont vu leur description reecrite plutot que reprise : « Cinema »
-- et « Editorial » reunissent chacun plusieurs anciens rayons, et la phrase
-- du manifeste, ecrite pour un seul d'entre eux, aurait annonce trop peu.
--
-- Rejouable : des affectations, aucune insertion, aucune suppression. Un
-- slug absent de la base ne fait rien.
-- =====================================================================

${majs.join('\n')}

do $verif$
declare
  v_n integer;
begin
  select count(*) into v_n
  from public.categories
  where is_visible and coalesce(short_description, '') = '';

  if v_n > 0 then
    raise notice 'Descriptions : % rayon(s) visible(s) encore sans phrase.', v_n;
  end if;
end $verif$;
`,
);

console.log(`Descriptions : ${majs.length} affectations`);
console.log(`Icones      : ${icones.size}`);
console.log(`Illustrations : ${illustrations.size}`);
console.log(`Rayons      : ${rayons.size} (dont ${heritages.length} heritages)`);
console.log(`Familles    : ${familles.size}`);
