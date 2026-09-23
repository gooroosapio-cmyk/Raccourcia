#!/usr/bin/env node
/**
 * Genere les lots SQL de l'effacement des visuels deposes avant le
 * 18 septembre 2026, et le lot qui les restaure.
 *
 *   node scripts/build-purge-visuels.mjs
 *
 * La source est `data/visuels/purge-avant-18-septembre.json`, un manifeste
 * ferme : les lots n'effacent QUE les lignes qu'il nomme, par identifiant.
 * Aucun `where created_at < ...` ne decide seul de ce qui part — une regle
 * de date appliquee en aveugle emporterait aussi une ligne inseree demain
 * avec une date fausse.
 *
 * La date sert de garde-fou, pas de critere : le lot refuse de toucher une
 * ligne du manifeste dont la date serait posterieure au seuil. Si la base a
 * change depuis l'inventaire, il leve au lieu d'effacer.
 *
 * L'ordre complet de l'operation :
 *   1. sauvegarde des fichiers (workflow Visuels, tache purge-sauvegarde) ;
 *   2. lots 000 puis 100 de ce dossier (workflow Catalogue) ;
 *   3. suppression des fichiers (workflow Visuels, tache purge-fichiers),
 *      qui refuse d'effacer un fichier encore reference par une ligne.
 * Le retour arriere prend le chemin inverse : fichiers restaures depuis la
 * sauvegarde, puis lot de restauration.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = dirname(dirname(fileURLToPath(import.meta.url)));
const man = JSON.parse(
  readFileSync(join(RACINE, 'data/visuels/purge-avant-18-septembre.json'), 'utf8'),
);
const lignes = man.visuels.map((v) => ({
  id: v.id,
  prompt_id: v.prompt_id,
  kind: v.kind,
  storage_path: v.storage_path,
  created_at: v.created_at,
}));
const N = lignes.length;
const SEUIL = man.seuil;
const bloc = (o) => `$raccourcia$${JSON.stringify(o)}$raccourcia$`;
const controle = (condition, message) =>
  `\ndo $ctrl$\nbegin\n  if not (${condition}) then\n    raise exception '${message.replace(/'/g, "''")}';\n  end if;\nend $ctrl$;\n`;
const table = (nom) =>
  `create temporary table ${nom} (id uuid, prompt_id uuid, kind public.media_kind, storage_path text, created_at timestamptz) on commit drop;\n` +
  `insert into ${nom}\nselect (x ->> 'id')::uuid, (x ->> 'prompt_id')::uuid, (x ->> 'kind')::public.media_kind,\n` +
  `       x ->> 'storage_path', (x ->> 'created_at')::timestamptz\nfrom jsonb_array_elements(${bloc(lignes)}) x;\n`;

const dossier = join(RACINE, 'supabase/seed/purge-visuels-avant-18');
const restau = join(RACINE, 'supabase/seed/purge-visuels-avant-18-restauration');
for (const d of [dossier, restau]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}

// --- 000 : l'apercu, sans une ecriture -----------------------------------
writeFileSync(
  join(dossier, '000_apercu.sql'),
  `-- =====================================================================
-- Lot 000 — apercu de l'effacement. Ce lot n'ecrit rien.
--
-- Il repond avant toute ecriture : combien des ${N} lignes du manifeste
-- sont encore en base, aucune n'est-elle posterieure au ${SEUIL.slice(0, 10)},
-- et combien de cartes perdraient leur dernier visuel.
-- =====================================================================
begin;
${table('purge_apercu')}
select 'lignes du manifeste encore en base' as controle,
       (select count(*) from public.prompt_media m join purge_apercu a on a.id = m.id) as n,
       ${N} as manifeste;

select 'cartes qui perdent leur dernier visuel' as controle, count(*) as n
from (select distinct a.prompt_id from purge_apercu a) c
where not exists (select 1 from public.prompt_media m
                  where m.prompt_id = c.prompt_id and m.id not in (select id from purge_apercu));

select p.status as statut, count(distinct p.id) as cartes_touchees
from public.prompts p join purge_apercu a on a.prompt_id = p.id group by 1 order by 1;
${controle(
  `not exists (select 1 from public.prompt_media m join purge_apercu a on a.id = m.id where m.created_at >= '${SEUIL}')`,
  `Lot 000 : une ligne du manifeste est datee apres le seuil. La base a change depuis l'inventaire : ne pas effacer.`,
)}
commit;
`,
);

// --- 100 : l'effacement -----------------------------------------------------
writeFileSync(
  join(dossier, '100_effacer.sql'),
  `-- =====================================================================
-- Lot 100 — effacement des ${N} lignes de visuels deposees avant le
-- ${SEUIL.slice(0, 10)}.
--
-- Seules les lignes nommees par le manifeste partent, et seulement si leur
-- date est anterieure au seuil : la date garde, le manifeste decide.
-- L'indicateur « visuel pret » des cartes se recalcule de lui-meme, par le
-- declencheur prompt_media_refresh_ready.
--
-- Les fichiers ne sont PAS touches ici : ils partent apres, par le workflow
-- Visuels, qui refuse d'effacer un fichier encore reference. Rejouer ce lot
-- n'efface rien de plus et ne leve pas.
-- =====================================================================
begin;
${table('purge_lot')}${controle(
    `not exists (select 1 from public.prompt_media m join purge_lot a on a.id = m.id where m.created_at >= '${SEUIL}')`,
    `Lot 100 : une ligne du manifeste est datee apres le seuil. Arret avant ecriture.`,
  )}
delete from public.prompt_media m
using purge_lot a
where m.id = a.id and m.created_at < '${SEUIL}';
${controle(
  `not exists (select 1 from public.prompt_media m join purge_lot a on a.id = m.id)`,
  `Lot 100 : des lignes du manifeste sont encore en base.`,
)}${controle(
    `not exists (select 1 from public.prompt_media where created_at < '${SEUIL}')`,
    `Lot 100 : un visuel anterieur au seuil subsiste hors manifeste. A examiner avant de purger les fichiers.`,
  )}
commit;
`,
);

// --- 900 : le bilan ---------------------------------------------------------
writeFileSync(
  join(dossier, '900_bilan.sql'),
  `-- Lot 900 — bilan. N'ecrit rien.
select 'visuels restants' as quoi, count(*) as n from public.prompt_media
union all select 'visuels anterieurs au seuil', count(*) from public.prompt_media where created_at < '${SEUIL}'
union all select 'cartes publiees Visuels avec visuel', count(distinct p.id) from public.prompts p
  join public.prompt_media m on m.prompt_id = p.id where p.status = 'published' and p.library = 'images'
union all select 'cartes publiees Visuels sans visuel', count(*) from public.prompts p
  where p.status = 'published' and p.library = 'images'
    and not exists (select 1 from public.prompt_media m where m.prompt_id = p.id);
`,
);

// --- Restauration -----------------------------------------------------------
writeFileSync(
  join(restau, '100_restaurer.sql'),
  `-- =====================================================================
-- Retour arriere de l'effacement des visuels anterieurs au ${SEUIL.slice(0, 10)}.
--
-- A jouer APRES avoir restaure les fichiers depuis la sauvegarde (workflow
-- Visuels, tache purge-restauration). Une ligne n'est reposee que si son
-- fichier est de nouveau dans le stockage : reposer une ligne sans fichier,
-- c'est afficher une image cassee.
--
-- Memes identifiants qu'avant : les favoris, l'historique et tout ce qui
-- pointait vers ces lignes retrouvent leur cible. Rejouable.
-- =====================================================================
begin;
${table('purge_restau')}
insert into public.prompt_media (id, prompt_id, kind, storage_path, created_at)
select a.id, a.prompt_id, a.kind, a.storage_path, a.created_at
from purge_restau a
where exists (select 1 from public.prompts p where p.id = a.prompt_id)
  and exists (select 1 from storage.objects o where o.bucket_id = 'prompt-media' and o.name = a.storage_path)
on conflict (id) do nothing;

select 'lignes reposees' as quoi,
       (select count(*) from public.prompt_media m join purge_restau a on a.id = m.id) as n,
       ${N} as manifeste;
commit;
`,
);
console.log(`lots ecrits : ${N} visuels, seuil ${SEUIL}`);
