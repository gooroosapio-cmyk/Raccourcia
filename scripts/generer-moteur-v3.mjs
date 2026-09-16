#!/usr/bin/env node
/**
 * Genere les lots du moteur V3 depuis `data/catalogue-v3/moteur.json`.
 *
 * Trois choses, dans cet ordre :
 *
 *   000  les variantes. Les lots V2 n'en posaient aucune : une carte existait
 *        sans moteur, donc sans version, donc sans texte a copier. C'est ce
 *        qui laissait 615 commandes publiees et inutilisables.
 *   0NN  les payloads, en lots de cinquante cartes. Sept megaoctets de texte
 *        dans un seul fichier, c'est une transaction qu'on n'ose plus rejouer.
 *   900  les champs du moteur : ce que la commande sait faire, ce qu'elle
 *        rend, par quoi elle commence.
 *
 * L'appariement se fait sur `card_id`, jamais sur le titre ni la collection.
 * Le classeur porte encore la taxonomie d'avant le rangement — « Vedette
 * Afrobeats » y est toujours dans « Cinéma - personnages et scènes ». Ecrire
 * son titre ou son rayon defarait ce que l'administration a valide depuis.
 * Seule la matiere entre ; le classement reste celui de la base.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';

const SOURCE = 'data/catalogue-v3/moteur.json';
const DOSSIER = 'supabase/seed/moteur-v3';
const PAR_LOT = 50;
const MOTEURS = ['chatgpt', 'gemini', 'claude'];

const { cartes } = JSON.parse(readFileSync(SOURCE, 'utf8'));
rmSync(DOSSIER, { recursive: true, force: true });
mkdirSync(DOSSIER, { recursive: true });

/** Texte SQL echappe, ou `null` quand il n'y a rien a ecrire. */
const t = (valeur) => {
  const s = (valeur ?? '').trim();
  return s ? `'${s.replace(/'/g, "''")}'` : 'null';
};

// --- 000 : les variantes manquantes ---------------------------------------
writeFileSync(
  `${DOSSIER}/000_variantes.sql`,
  `-- =====================================================================
-- Une variante par moteur, pour chaque carte du catalogue V2.
--
-- Rejouable : la clause \`not exists\` reconnait ce qui est deja pose. Une
-- carte qui avait deja ses variantes — les 77 conservees de l'ancien
-- catalogue — n'en recoit pas de seconde.
-- =====================================================================

insert into public.prompt_variants (prompt_id, provider_id, compatibility, status)
select p.id, pr.id, 'excellent'::public.compatibility_level, 'published'::public.content_status
from public.prompts p
cross join public.ai_providers pr
where p.catalog_v2
  and pr.key in (${MOTEURS.map((m) => `'${m}'`).join(', ')})
  and pr.is_active
  and not exists (
    select 1 from public.prompt_variants v
    where v.prompt_id = p.id and v.provider_id = pr.id
  );

do $ctrl$
declare
  v_sans integer;
begin
  select count(*) into v_sans
  from public.prompts p
  where p.catalog_v2
    and (select count(*) from public.prompt_variants v where v.prompt_id = p.id) < ${MOTEURS.length};
  if v_sans <> 0 then
    raise exception 'Moteur V3 : % cartes n ont pas leurs trois variantes.', v_sans;
  end if;
end $ctrl$;
`,
);

// --- 0NN : les payloads ---------------------------------------------------
let lot = 0;
for (let debut = 0; debut < cartes.length; debut += PAR_LOT) {
  lot += 1;
  const tranche = cartes.slice(debut, debut + PAR_LOT);
  const valeurs = tranche.flatMap((carte) =>
    MOTEURS.filter((moteur) => carte.payloads[moteur]).map(
      (moteur) => `  (${t(carte.card_id)}, '${moteur}', ${t(carte.payloads[moteur])})`,
    ),
  );

  writeFileSync(
    `${DOSSIER}/${String(lot + 9).padStart(3, '0')}_payloads.sql`,
    `-- Moteur V3 — payloads, lot ${lot} (${tranche.length} cartes)
--
-- Tout tient dans une transaction : la table temporaire vit le temps du lot
-- et disparait avec lui. Sans le \`begin\`, chaque instruction forme sa
-- propre transaction et la table s'evapore avant d'avoir servi.
begin;

create temporary table lot_moteur_v3 (
  card_id text, moteur text, payload text
) on commit drop;

insert into lot_moteur_v3 (card_id, moteur, payload) values
${valeurs.join(',\n')};

-- La version courante ne cede la place que si le texte change reellement :
-- reposer un payload identique le compterait deux fois dans l'historique.
update public.prompt_versions pv
set is_current = false, status = 'retired'::public.version_status
from lot_moteur_v3 l
join public.prompts p on p.card_id = l.card_id
join public.prompt_variants v on v.prompt_id = p.id
join public.ai_providers pr on pr.id = v.provider_id and pr.key = l.moteur
where pv.variant_id = v.id
  and pv.is_current
  and pv.payload is distinct from l.payload;

insert into public.prompt_versions (variant_id, version_label, payload, status, is_current, published_at)
select v.id, 'moteur-v3', l.payload, 'published'::public.version_status, true, now()
from lot_moteur_v3 l
join public.prompts p on p.card_id = l.card_id
join public.prompt_variants v on v.prompt_id = p.id
join public.ai_providers pr on pr.id = v.provider_id and pr.key = l.moteur
where not exists (
  select 1 from public.prompt_versions pv where pv.variant_id = v.id and pv.is_current
);

commit;
`,
  );
}

// --- 900 : les champs du moteur -------------------------------------------
const champs = [
  'contexte',
  'specification',
  'livrables',
  'questions_cadrage',
  'criteres_reussite',
  'erreurs',
  'regle_sortie',
];
const maj = cartes
  .map(
    (carte) =>
      `update public.prompts set ${champs
        .map((champ) => `${champ} = ${t(carte[champ])}`)
        .join(', ')} where card_id = ${t(carte.card_id)};`,
  )
  .join('\n');

writeFileSync(
  `${DOSSIER}/900_champs.sql`,
  `-- =====================================================================
-- Les champs du moteur : contexte, capacites, livrables, cadrage.
--
-- Ni titre, ni categorie, ni collection, ni ordre. Le classeur porte encore
-- la taxonomie d'avant le rangement des rayons ; les ecrire deferait ce qui
-- a ete valide et deploye depuis. Seule la matiere entre.
-- =====================================================================

${maj}
`,
);

console.log(`${cartes.length} cartes, ${lot} lots de payloads, ${champs.length} champs.`);

// --- L'empreinte attendue par le test d'integration -----------------------
//
// Triee octet par octet, comme `order by ... collate "C"` cote base : sans
// cela le tri depend de la locale et la meme donnee donne deux empreintes.
const { createHash } = await import('node:crypto');
const tuples = [];
for (const carte of cartes) {
  for (const moteur of MOTEURS) {
    const payload = carte.payloads[moteur];
    if (!payload) continue;
    tuples.push([
      carte.card_id,
      moteur,
      createHash('sha256').update(payload, 'utf8').digest('hex'),
    ]);
  }
}
const octets = (s) => Buffer.from(s, 'utf8');
tuples.sort(
  (a, b) =>
    Buffer.compare(octets(a[0]), octets(b[0])) || Buffer.compare(octets(a[1]), octets(b[1])),
);
const empreinte = createHash('md5')
  .update(tuples.map((t) => t.join('|')).join(','), 'utf8')
  .digest('hex');
console.log(`${tuples.length} payloads, empreinte ${empreinte}`);
