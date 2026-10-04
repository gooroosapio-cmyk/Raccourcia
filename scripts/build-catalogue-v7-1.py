#!/usr/bin/env python3
"""
Genere les lots `supabase/seed/catalogue-v7-1/` depuis la base consolidee du
3 octobre 2026 (`data/catalogue/v7-1/base-consolidee.csv`, 200 cartes Visuels).

CE QUE FONT LES LOTS — UNE SEULE TRANSACTION, COMME LE CATALOGUE V7
  000 ouvre, 999 valide. Le workflow Catalogue les concatene ; la repetition
  remplace le 999 par `catalogue-v7-1-repetition.sql`, qui leve et annule.

  010  les cartes du fichier en table temporaire ;
  100  apercu : aucune carte ne heurte un card_id, un slug, un couple
       (commande, card_slug), un code ou une reference deja en base ;
  600  insertion, publication, texte unique ;
  700  champs a completer et tags ;
  900  controles de sortie.

DECISIONS (4 octobre 2026)
  * les 200 cartes sont PUBLIEES, sans visuel : l'administration les depose
    ensuite depuis la console ;
  * champs : le fichier en declare 5, 7 ou 12, sans libelle ni jeton. On en
    garde trois — quatre pour les flyers, en regime marketing — que la
    personnalisation ajoute en fin de texte copie ;
  * code : `RCIA-C-001400` et suivants, dans l'ordre des codes du fichier ;
    le code du fichier (`VIV2-STU-001`) devient la reference externe ;
  * photo facultative pour les cartes dont la ressemblance part d'une photo.

LE LOT N'ECRIT QUE DES CARTES NOUVELLES. Il ne modifie ni ne supprime rien de
ce qui existe : ni carte, ni visuel, ni tag, ni rangement.

Usage : python3 scripts/build-catalogue-v7-1.py
"""
import csv
import hashlib
import json
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
DONNEES = RACINE / 'data' / 'catalogue' / 'v7-1'
LOTS = RACINE / 'supabase' / 'seed' / 'catalogue-v7-1'
REPETITION = RACINE / 'supabase' / 'seed' / 'catalogue-v7-1-repetition.sql'
TAGS_V7 = RACINE / 'data' / 'catalogue' / 'v7' / 'tags.csv'
PREMIER_CODE = 1400
BALISE = '$raccourcia_v71$'

attendues = json.loads((DONNEES / 'SHA256.json').read_text(encoding='utf-8'))
for nom, empreinte in attendues.items():
    if hashlib.sha256((DONNEES / nom).read_bytes()).hexdigest() != empreinte:
        raise SystemExit(f'Empreinte differente pour {nom} : le fichier a ete modifie.')

with open(DONNEES / 'base-consolidee.csv', encoding='utf-8-sig', newline='') as f:
    cartes = list(csv.DictReader(f))
with open(TAGS_V7, encoding='utf-8-sig', newline='') as f:
    tags_connus = {t['tag_key'] for t in csv.DictReader(f)}

RAYON_REF = {
    'Créations & montages': 'V5-CREATION', 'Portraits & sujets': 'V5-PORTRAITS', 'Espaces': 'V5-ESPACES',
    'Marketing & édition': 'V5-MARKETING', 'Schémas & technique': 'V5-TECHNIQUE', 'Produits': 'V5-PRODUITS',
}

# Les champs retenus, par famille de cartes, et leur libelle. Le fichier ne
# donne que des cles : le libelle est ce que la fiche affiche.
RETENUS = {
    ('portrait', 'contexte', 'activite', 'texte', 'preferences', 'format', 'contraintes_pose'):
        ('standard', ['contexte', 'texte', 'preferences']),
    ('texte', 'intention', 'langue', 'couleurs', 'format'):
        ('standard', ['texte', 'intention', 'couleurs']),
    ('nom_entreprise', 'activite', 'objectif', 'offre', 'texte', 'prix', 'date', 'contact', 'logo', 'images',
     'couleurs', 'format'):
        ('marketing', ['nom_entreprise', 'offre', 'prix', 'date']),
}
LIBELLES = {
    'contexte': ('Contexte', 'Votre univers, le lieu ou l’occasion'),
    'texte': ('Texte à afficher', 'Le texte exact, s’il y en a un'),
    'preferences': ('Préférences', 'Style, tenue ou ambiance souhaités'),
    'intention': ('Intention', 'Ce que l’image doit dire ou faire ressentir'),
    'couleurs': ('Couleurs', 'La palette souhaitée'),
    'nom_entreprise': ('Nom de l’entreprise', 'Le nom exact à afficher'),
    'offre': ('Offre', 'Ce que vous proposez'),
    'prix': ('Prix', 'Le prix exact, s’il y en a un'),
    'date': ('Date', 'Date ou période de l’offre'),
}
# Une indication qui dit « Facultatif : l'IA utilise le contexte » n'aide
# personne a remplir : l'exemple du fichier, quand il est parlant, la vaut
# mieux.
EXEMPLE_GENERIQUE = ('Utilise ce qui est disponible', 'Facultatif')


def sql_json(valeur):
    texte = json.dumps(valeur, ensure_ascii=False)
    if BALISE in texte:
        raise SystemExit('Le fichier contient la balise de citation SQL.')
    return f'{BALISE}{texte}{BALISE}'


# --- Controles du fichier ---------------------------------------------------------
assert len(cartes) == 200
for cle in ('card_id', 'slug', 'card_code'):
    assert len({c[cle] for c in cartes}) == 200, f'{cle} en double'
for c in cartes:
    assert c['universe'] == 'Visuels' and c['category'] in RAYON_REF, c['card_code']
    assert set(json.loads(c['tag_keys_json'])) <= tags_connus, c['card_code']
    assert 1 <= len(json.loads(c['tag_keys_json'])) <= 4, c['card_code']
    assert '{{' not in c['payload'], c['card_code']
    assert tuple(f['key'] for f in json.loads(c['prompt_fields_json'])) in RETENUS, c['card_code']

cartes.sort(key=lambda c: c['card_code'])
lignes = []
for i, c in enumerate(cartes):
    regime, cles = RETENUS[tuple(f['key'] for f in json.loads(c['prompt_fields_json']))]
    exemples = json.loads(c['example_inputs_json'] or '{}')
    champs = []
    for position, cle in enumerate(cles, start=1):
        libelle, indication = LIBELLES[cle]
        exemple = exemples.get(cle) or ''
        if exemple and not exemple.startswith(EXEMPLE_GENERIQUE):
            indication = exemple
        champs.append({'cle': cle, 'libelle': libelle, 'indication': indication, 'kind': 'texte',
                       'requis': False, 'position': position})
    lignes.append({
        'card_id': c['card_id'],
        'card_code': f'RCIA-C-{PREMIER_CODE + i:06d}',
        'external_ref': c['card_code'],
        'command_id': c['command_id'],
        'slug': c['slug'],
        'card_slug': c['slug'],
        'command': c['command'],
        'name': c['name'],
        'rayon_ref': RAYON_REF[c['category']],
        'collection': c['collection'],
        'short_description': c['short_description'],
        'result_summary': c['editorial_angle'] or c['short_description'],
        'intention': c['render_direction'] or None,
        'expected_input': c['expected_input'],
        'identity_policy': c['identity_policy'],
        'input_type': 'image' if c['identity_policy'].startswith('ressemblance_si_photo') else 'text',
        'default_ratio': c['default_ratio'] or None,
        'regime_champs': regime,
        'fiche_champs_max': len(champs),
        'revised_at': c['revision_date'] or None,
        'payload': c['payload'],
        'payload_md5': hashlib.md5(c['payload'].encode('utf-8')).hexdigest(),
        'champs': champs,
        'tags': json.loads(c['tag_keys_json']),
    })

# --- Ecriture ------------------------------------------------------------------------
LOTS.mkdir(parents=True, exist_ok=True)
for ancien in LOTS.glob('*.sql'):
    ancien.unlink()


def ecrire(nom, contenu):
    (LOTS / nom).write_text(contenu.strip() + '\n', encoding='utf-8')


n_champs = sum(len(l['champs']) for l in lignes)
n_liens = sum(len(l['tags']) for l in lignes)

ecrire('000_debut.sql', """
-- Catalogue v7.1 / 000 — 200 cartes Visuels de la base consolidee du
-- 3 octobre 2026. Une seule transaction ; le 999 la valide.
-- Genere par scripts/build-catalogue-v7-1.py : ne pas modifier a la main.
begin;
set local lock_timeout = '15s';
""")

ecrire('010_cartes.sql', f"""
-- Catalogue v7.1 / 010 — les cartes du fichier, en table temporaire.
create temporary table v71_carte (
  card_id text primary key, card_code text not null unique, external_ref text not null unique,
  command_id uuid, slug text not null unique, card_slug text not null, command text not null,
  name text not null, rayon_ref text not null, collection text not null,
  short_description text not null, result_summary text, intention text, expected_input text,
  identity_policy text, input_type public.input_type not null, default_ratio text,
  regime_champs text not null, fiche_champs_max smallint not null, revised_at date,
  payload text not null, payload_md5 text not null, champs jsonb not null, tags text[] not null
) on commit drop;

insert into v71_carte
select * from jsonb_populate_recordset(null::v71_carte, {sql_json(lignes)}::jsonb);
""")

ecrire('100_apercu.sql', """
-- =====================================================================
-- Catalogue v7.1 / 100 — apercu, avant toute ecriture
--
-- Une carte deja inseree par un passage precedent porte le meme card_id :
-- c'est la meme carte, pas une collision. Tout autre recouvrement leve.
-- =====================================================================
create temporary table v71_collection on commit drop as
select distinct k.collection, k.rayon_ref, c.id as category_id
from v71_carte k
join public.categories r on r.external_ref = k.rayon_ref
left join public.categories c on c.parent_id = r.id and c.name = k.collection and c.status = 'published';

do $apercu$
declare v_n integer;
begin
  if (select count(*) from v71_carte) <> 200 then
    raise exception 'Catalogue v7.1 : le fichier charge ne compte pas 200 cartes.';
  end if;
  if exists (select 1 from v71_collection where category_id is null) then
    raise exception 'Catalogue v7.1 : collection(s) introuvable(s) : %',
      (select string_agg(collection, ', ') from v71_collection where category_id is null);
  end if;

  select count(*) into v_n from v71_carte k
  where exists (
    select 1 from public.prompts p
    where p.card_id is distinct from k.card_id
      and (p.slug = k.slug or p.card_code = k.card_code or p.external_ref = k.external_ref
           or (p.command::text = k.command and coalesce(p.card_slug, '') = k.card_slug)));
  if v_n > 0 then
    raise exception 'Catalogue v7.1 : % carte(s) heurtent une carte existante.', v_n;
  end if;

  select count(*) into v_n from v71_carte k
  join public.prompts p on p.card_id = k.card_id
  where p.card_code is distinct from k.card_code;
  if v_n > 0 then
    raise exception 'Catalogue v7.1 : % card_id deja en base sous un autre code.', v_n;
  end if;

  select count(*) into v_n from v71_carte k
  where exists (select 1 from unnest(k.tags) s(slug)
                where not exists (select 1 from public.tags t where t.slug = s.slug));
  if v_n > 0 then
    raise exception 'Catalogue v7.1 : % carte(s) portent un tag absent de la taxonomie.', v_n;
  end if;
end $apercu$;

-- Le bilan : rien ne part, tout arrive.
select
  (select count(*) from v71_carte k where not exists (select 1 from public.prompts p where p.card_id = k.card_id)) as cartes_a_ajouter,
  (select count(*) from v71_carte k where exists (select 1 from public.prompts p where p.card_id = k.card_id)) as cartes_deja_presentes,
  0 as suppressions;
""")

ecrire('600_cartes.sql', """
-- Catalogue v7.1 / 600 — insertion, publication et texte unique.
create temporary table v71_avant on commit drop as
select (select count(*) from public.prompts) as cartes, (select count(*) from public.prompt_media) as visuels,
       (select count(*) from public.tags) as tags, (select count(*) from public.categories) as rangements,
       (select count(*) from v71_carte k
         where exists (select 1 from public.prompts p where p.card_id = k.card_id)) as deja_presentes;

insert into public.prompts (
  card_id, card_code, command_id, external_ref, command, name, slug, card_slug, mode, library,
  entity_type, category_id, short_description, result_summary, intention, expected_input,
  identity_policy, input_type, output_type, output_formats, images_min, default_ratio,
  organisation_sortie, show_image_card, regime_champs, fiche_champs_max, is_free, status,
  published_at, catalog_version, revised_at)
select k.card_id, k.card_code, k.command_id, k.external_ref, k.command, k.name, k.slug, k.card_slug,
       'image', 'images', 'commande_image', c.category_id, k.short_description, k.result_summary,
       k.intention, k.expected_input, k.identity_policy, k.input_type, 'image', '{image}', 1,
       k.default_ratio, 'image_unique', true, k.regime_champs, k.fiche_champs_max, false,
       'published', now(), 'v7.1', k.revised_at
from v71_carte k
join v71_collection c on c.collection = k.collection and c.rayon_ref = k.rayon_ref
where not exists (select 1 from public.prompts p where p.card_id = k.card_id);

insert into public.prompt_variants (prompt_id, provider_id, status, compatibility)
select p.id, a.id, 'published', 'bon'
from v71_carte k
join public.prompts p on p.card_id = k.card_id
cross join public.ai_providers a
where a.key = 'universel'
on conflict (prompt_id, provider_id) do nothing;

insert into public.prompt_versions (variant_id, version_label, payload, status, is_current, published_at)
select v.id, 'v7.1', k.payload, 'published', true, now()
from v71_carte k
join public.prompts p on p.card_id = k.card_id
join public.prompt_variants v on v.prompt_id = p.id
join public.ai_providers a on a.id = v.provider_id and a.key = 'universel'
where not exists (select 1 from public.prompt_versions x where x.variant_id = v.id and x.is_current);
""")

ecrire('700_champs_et_tags.sql', """
-- Catalogue v7.1 / 700 — champs a completer et tags. N'ajoute que ce qui
-- manque.
insert into public.prompt_fields (prompt_id, cle, libelle, indication, kind, requis, position)
select p.id, f ->> 'cle', f ->> 'libelle', f ->> 'indication', (f ->> 'kind')::public.prompt_field_kind,
       (f ->> 'requis')::boolean, (f ->> 'position')::smallint
from v71_carte k
join public.prompts p on p.card_id = k.card_id
cross join jsonb_array_elements(k.champs) f
where not exists (select 1 from public.prompt_fields x where x.prompt_id = p.id and x.cle = f ->> 'cle');

insert into public.prompt_tags (prompt_id, tag_id)
select p.id, t.id
from v71_carte k
join public.prompts p on p.card_id = k.card_id
cross join unnest(k.tags) s(slug)
join public.tags t on t.slug = s.slug
on conflict do nothing;
""")

ecrire('900_controles.sql', f"""
-- =====================================================================
-- Catalogue v7.1 / 900 — controles de sortie. Un echec annule tout.
-- =====================================================================
do $ctrl$
declare v_n integer;
begin
  select count(*) into v_n from v71_carte k
  join public.prompts p on p.card_id = k.card_id and p.card_code = k.card_code and p.status = 'published';
  if v_n <> 200 then raise exception 'Controle v7.1 : % cartes publiees sur 200.', v_n; end if;

  select count(*) into v_n from v71_carte k
  join public.prompts p on p.card_id = k.card_id
  where md5(coalesce((select pv.payload from public.prompt_versions pv
                       join public.prompt_variants v on v.id = pv.variant_id
                       join public.ai_providers a on a.id = v.provider_id and a.key = 'universel'
                      where v.prompt_id = p.id and pv.is_current), '')) <> k.payload_md5
     or not p.payload_ready;
  if v_n > 0 then raise exception 'Controle v7.1 : % carte(s) ne servent pas leur texte.', v_n; end if;

  if (select count(*) from public.prompt_fields f join public.prompts p on p.id = f.prompt_id
      join v71_carte k on k.card_id = p.card_id) <> {n_champs} then
    raise exception 'Controle v7.1 : les champs ne sont pas ceux attendus.';
  end if;
  if (select count(*) from public.prompt_tags pt join public.prompts p on p.id = pt.prompt_id
      join v71_carte k on k.card_id = p.card_id) <> {n_liens} then
    raise exception 'Controle v7.1 : les tags ne sont pas ceux du fichier.';
  end if;
  if exists (select 1 from public.prompts p where p.status <> 'archived'
             and (select count(*) from public.prompt_fields f where f.prompt_id = p.id)
                 > case when p.regime_champs = 'marketing' then 4 else 3 end) then
    raise exception 'Controle v7.1 : une carte depasse sa borne de champs.';
  end if;

  -- Rien d'existant n'a bouge : seules des cartes se sont ajoutees.
  if (select count(*) from public.prompt_media) <> (select visuels from v71_avant)
     or (select count(*) from public.tags) <> (select tags from v71_avant)
     or (select count(*) from public.categories) <> (select rangements from v71_avant)
     or (select count(*) from public.prompts)
        <> (select cartes + 200 - deja_presentes from v71_avant) then
    raise exception 'Controle v7.1 : le lot a touche autre chose que ses cartes.';
  end if;
  if exists (select slug from public.prompts group by slug having count(*) > 1) then
    raise exception 'Controle v7.1 : un slug en double dans le catalogue.';
  end if;
end $ctrl$;

select
  (select count(*) from public.prompts where status = 'published') as publiees,
  (select count(*) from public.prompts where status = 'draft') as brouillons,
  (select count(*) from v71_carte k join public.prompts p on p.card_id = k.card_id) as cartes_du_lot,
  (select count(*) from public.prompt_media) as visuels;
""")

ecrire('999_valider.sql', """
-- Catalogue v7.1 / 999 — tout a passe : on valide.
commit;
""")

REPETITION.write_text("""-- =====================================================================
-- Catalogue v7.1 — repetition sur la base reelle, annulee
--
-- Remplace le lot 999 : tout s'est ecrit et les controles sont passes ;
-- cette levee annule la transaction et rend ce qui aurait ete ecrit.
-- =====================================================================
do $repetition$
begin
  raise exception 'REPETITION v7.1 (annulee) : %', (select row_to_json(x) from (select
    (select count(*) from public.prompts where status = 'published') as publiees,
    (select count(*) from public.prompts where status = 'draft') as brouillons,
    (select count(*) from v71_carte k join public.prompts p on p.card_id = k.card_id) as cartes_du_lot,
    (select count(*) from public.prompt_fields f join public.prompts p on p.id = f.prompt_id
       join v71_carte k on k.card_id = p.card_id) as champs_du_lot,
    (select count(*) from public.prompt_tags t join public.prompts p on p.id = t.prompt_id
       join v71_carte k on k.card_id = p.card_id) as tags_du_lot,
    (select count(*) from public.prompt_media) as visuels) x);
end $repetition$;
""", encoding='utf-8')

print(f'{len(list(LOTS.glob("*.sql")))} lots, {len(lignes)} cartes, {n_champs} champs, {n_liens} liens de tags, '
      f'codes {lignes[0]["card_code"]} a {lignes[-1]["card_code"]}')
