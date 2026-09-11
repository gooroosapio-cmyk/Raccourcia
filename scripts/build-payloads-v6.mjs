#!/usr/bin/env node
/**
 * Genere les lots SQL de la refonte globale des payloads.
 *
 *   node scripts/build-payloads-v6.mjs
 *
 * Ce generateur est le premier du depot a REMPLACER du contenu plutot qu'a
 * en poser. Il ne detruit rien pour autant : la version courante passe en
 * `retired`, une nouvelle est creee a cote et devient courante. C'est ce que
 * le schema demande depuis le debut — « modifier un prompt ne detruit jamais
 * la version precedente » — et c'est ce qui rend un retour arriere possible.
 *
 * Ce qu'il ne touche pas, et qui n'apparait donc dans aucun lot : les
 * medias et leurs relations (le classeur porte lui-meme la consigne), les
 * champs de la fiche, les questions. Les questions sont attachees a la
 * commande et non a la version : creer une version ne les perd pas.
 *
 * Le classeur livre une empreinte sha256 par texte. Elle voyage jusqu'au
 * lot, et le controle final la recalcule en base : un texte abime en route
 * fait lever le lot plutot que de s'installer.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data', 'catalogue', 'v6');
const OUT = join(ROOT, 'supabase', 'seed', 'v6-payloads');

const TAG = '$raccourcia$';
/** Etiquette de la nouvelle version courante, lisible en base. */
const ETIQUETTE = 'v6-payloads';
/** Payloads par lot. Trois par commande : un lot couvre 50 commandes. */
const PAR_LOT = 150;

const lire = (nom) => JSON.parse(readFileSync(join(DATA, `${nom}.json`), 'utf8'));

const commandes = lire('commandes');
const payloads = lire('payloads');

function litteralJson(rows) {
  const json = JSON.stringify(rows);
  if (json.includes(TAG)) throw new Error(`Le delimiteur ${TAG} apparait dans les donnees.`);
  return `${TAG}${json}${TAG}`;
}

// --- Controles avant ecriture ---------------------------------------------
// Un generateur qui produit un lot faux coute plus cher qu'un generateur qui
// refuse de produire.

const refsConnues = new Set(commandes.map((c) => c.ref));
for (const p of payloads) {
  if (!refsConnues.has(p.ref))
    throw new Error(`Payload orphelin : ${p.ref} n'est pas dans commandes.json.`);
}
if (payloads.length !== commandes.length * 3) {
  throw new Error(`Attendu ${commandes.length * 3} payloads, trouve ${payloads.length}.`);
}
const vus = new Set();
for (const p of payloads) {
  const cle = `${p.ref}:${p.moteur}`;
  if (vus.has(cle)) throw new Error(`Payload en double : ${cle}.`);
  vus.add(cle);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const CHAMPS = 'ref text, moteur text, payload text, sha256 text';

const lots = [];
for (let i = 0; i < payloads.length; i += PAR_LOT) lots.push(payloads.slice(i, i + PAR_LOT));

lots.forEach((lot, index) => {
  const numero = String(index + 1).padStart(2, '0');
  const attendu = lot.length;

  const sql = `-- Lot ${numero} sur ${lots.length} : ${attendu} payloads de la refonte V6.
--
-- La version courante de chaque variante passe en « retired » et une
-- nouvelle prend sa place. Rien n'est efface : l'ancien texte reste lisible
-- et reactivable. Le lot est rejouable — au second passage la version
-- courante porte deja le nouveau texte, plus rien ne bouge.

begin;

drop table if exists lot_v6;
create temporary table lot_v6 as
select * from jsonb_to_recordset(${litteralJson(lot)}) as x(
  ${CHAMPS}
);

-- Retrait des seules versions dont le texte change reellement. Une commande
-- deja refondue n'est pas retiree puis reposee a l'identique : elle serait
-- comptee deux fois dans l'historique pour rien.
update public.prompt_versions pv
set is_current = false,
    status = 'retired'::public.version_status
from lot_v6 l
join public.prompts p on p.external_ref = l.ref
join public.prompt_variants v on v.prompt_id = p.id
join public.ai_providers pr on pr.id = v.provider_id and pr.key = l.moteur
where pv.variant_id = v.id
  and pv.is_current
  and pv.payload is distinct from l.payload;

insert into public.prompt_versions (variant_id, version_label, payload, status, is_current, published_at)
select v.id, '${ETIQUETTE}', l.payload, 'published'::public.version_status, true, now()
from lot_v6 l
join public.prompts p on p.external_ref = l.ref
join public.prompt_variants v on v.prompt_id = p.id
join public.ai_providers pr on pr.id = v.provider_id and pr.key = l.moteur
where not exists (
  select 1 from public.prompt_versions pv where pv.variant_id = v.id and pv.is_current
);

do $ctrl$
declare
  v_pose integer;
  v_empreintes integer;
  v_orphelines integer;
begin
  -- Le texte attendu est-il bien le texte courant ?
  select count(*) into v_pose
  from lot_v6 l
  join public.prompts p on p.external_ref = l.ref
  join public.prompt_variants v on v.prompt_id = p.id
  join public.ai_providers pr on pr.id = v.provider_id and pr.key = l.moteur
  join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
  where pv.payload = l.payload;
  if v_pose <> ${attendu} then
    raise exception 'Lot ${numero} : % payloads courants sur ${attendu}.', v_pose;
  end if;

  -- L'empreinte annoncee par le classeur decrit-elle le texte reellement en
  -- base ? C'est le seul controle qui attrape un texte abime en chemin.
  select count(*) into v_empreintes
  from lot_v6 l
  join public.prompts p on p.external_ref = l.ref
  join public.prompt_variants v on v.prompt_id = p.id
  join public.ai_providers pr on pr.id = v.provider_id and pr.key = l.moteur
  join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
  where extensions.digest(pv.payload, 'sha256') = decode(l.sha256, 'hex');
  if v_empreintes <> ${attendu} then
    raise exception 'Lot ${numero} : % empreintes exactes sur ${attendu}.', v_empreintes;
  end if;

  -- Aucune variante du lot ne doit se retrouver sans version courante : ce
  -- serait une commande publiee dont plus rien ne se copie.
  select count(*) into v_orphelines
  from lot_v6 l
  join public.prompts p on p.external_ref = l.ref
  join public.prompt_variants v on v.prompt_id = p.id
  join public.ai_providers pr on pr.id = v.provider_id and pr.key = l.moteur
  where not exists (
    select 1 from public.prompt_versions pv where pv.variant_id = v.id and pv.is_current
  );
  if v_orphelines > 0 then
    raise exception 'Lot ${numero} : % variantes sans version courante.', v_orphelines;
  end if;
end $ctrl$;

drop table lot_v6;

commit;
`;

  writeFileSync(join(OUT, `${numero}_payloads.sql`), sql);
});

// --- Controle de sortie ----------------------------------------------------
// Un lot final qui verifie l'ensemble, et non plus seulement sa tranche.

const controle = `-- Controle de sortie de la refonte V6.
--
-- Les lots verifient chacun leur tranche. Celui-ci verifie ce qu'aucun lot
-- ne voit : l'etat d'ensemble, et ce qui n'aurait pas du bouger.

do $ctrl$
declare
  v_courantes integer;
  v_sans_courante integer;
  v_anciennes integer;
begin
  select count(*) into v_courantes
  from public.prompt_versions pv
  where pv.is_current and pv.version_label = '${ETIQUETTE}';
  if v_courantes <> ${payloads.length} then
    raise exception 'Refonte V6 : % versions courantes sur ${payloads.length}.', v_courantes;
  end if;

  -- Aucune variante du catalogue, refondue ou non, ne doit rester muette.
  select count(*) into v_sans_courante
  from public.prompt_variants v
  join public.prompts p on p.id = v.prompt_id
  where p.status = 'published'
    and not exists (
      select 1 from public.prompt_versions pv where pv.variant_id = v.id and pv.is_current
    );
  if v_sans_courante > 0 then
    raise exception 'Refonte V6 : % variantes publiees sans version courante.', v_sans_courante;
  end if;

  -- L'historique est conserve : chaque variante refondue garde au moins une
  -- version retiree, celle qu'elle portait avant.
  select count(*) into v_anciennes
  from public.prompt_versions pv
  where pv.status = 'retired' and pv.version_label <> '${ETIQUETTE}';
  if v_anciennes < ${payloads.length} then
    raise exception 'Refonte V6 : seulement % versions retirees, l historique est incomplet.', v_anciennes;
  end if;

  raise notice 'Refonte V6 : % payloads courants, historique conserve.', v_courantes;
end $ctrl$;
`;

writeFileSync(join(OUT, '99_controles.sql'), controle);

console.log(`${lots.length} lots + 1 controle ecrits dans supabase/seed/v6-payloads/`);
console.log(`${commandes.length} commandes, ${payloads.length} payloads.`);
