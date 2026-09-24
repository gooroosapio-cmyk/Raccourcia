#!/usr/bin/env python3
"""
Genere les lots `supabase/seed/catalogue-v7/` depuis le kit « RaccourcIA-final »
(contrat 7.0, 24 septembre 2026), range dans `data/catalogue/v7/`.

CE QUE FONT LES LOTS, DANS UNE SEULE TRANSACTION
  Le lot 000 ouvre la transaction, le 999 la valide. Le workflow Catalogue les
  concatene et les passe a psql d'un bloc : si un controle leve, rien n'est
  ecrit. En repetition, `catalogue-v7-repetition.sql` remplace le 999 et leve
  apres les controles, avec le bilan : tout est annule.

  010-019  le kit en tables temporaires (cartes, tags, correspondances) ;
  100      apercu : ce que la base doit etre pour recevoir le kit, et le
           bilan chiffre de ce qui va partir. Leve si la base a change ;
  200      menage decide le 24 septembre : commandes archivees (journal,
           favoris, recents et anciens liens compris), variantes archivees,
           trois brouillons qui doublent une famille du kit, rangements vides ;
  300      taxonomie : les collections que le kit ajoute ;
  400      tags : les 72 du kit remplacent les anciens ;
  500      identifiants : `card_id` et `card_code` ;
  600      cartes : 760 inserees, 349 mises a jour, texte unique compris ;
  700      champs et tags des cartes, puis tags des brouillons ;
  900      controles de sortie.

DECISIONS DE CADRAGE (24 septembre 2026)
  * les 760 nouvelles cartes sont publiees directement ;
  * les commandes archivees sont supprimees sans reserve ;
  * brouillons effaces : les trois qui partagent une famille du kit ;
  * un champ vide garde la regle actuelle (« a preciser ») : le lot n'y
    touche pas, c'est la route de resolution qui l'applique ;
  * groupe de tags « Lieu » cree (migration 20260924140000) ;
  * brouillons retagues par `migration_tags.csv` ;
  * photo facultative : `input_type = 'image'` pour les Visuels dont la
    politique d'identite part d'une photo ;
  * les 306 variantes par IA archivees partent aussi.

CE QUE LE LOT NE TOUCHE PAS
  Les visuels (`prompt_media`), les comptes, les sessions, les acces. Pour les
  349 cartes publiees : nom, slug, commande, acces, rangement et resume public
  restent ceux du site. Le kit porte 27 resumes prefixes par « Nouveau » (le
  badge du PDF colle au texte) : on ne les reprend pas.

Usage : python3 scripts/build-catalogue-v7.py
"""
import csv
import hashlib
import json
import re
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
DONNEES = RACINE / 'data' / 'catalogue' / 'v7'
LOTS = RACINE / 'supabase' / 'seed' / 'catalogue-v7'
REPETITION = RACINE / 'supabase' / 'seed' / 'catalogue-v7-repetition.sql'

CARTES_PAR_LOT = 100
BALISE = '$raccourcia_v7$'


def lire(nom):
    with open(DONNEES / nom, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def verifier_empreintes():
    attendues = json.loads((DONNEES / 'SHA256.json').read_text(encoding='utf-8'))
    for fichier in DONNEES.iterdir():
        if fichier.name in attendues:
            reelle = hashlib.sha256(fichier.read_bytes()).hexdigest()
            if reelle != attendues[fichier.name]:
                raise SystemExit(f'Empreinte differente pour {fichier.name} : le kit a ete modifie.')


verifier_empreintes()
cartes = lire('cartes.csv')
tags = lire('tags.csv')
carte_tags = lire('carte_tags.csv')
migration_tags = lire('migration_tags.csv')
taxonomie = lire('taxonomie.csv')
brouillons = lire('identifiants-brouillons.csv')

# --- Correspondances ---------------------------------------------------------
BIBLIOTHEQUE = {'Visuels': 'images', 'Rédaction': 'textes', 'Assistants': 'reflexions'}
MODE = {'Visuels': 'image', 'Rédaction': 'texte', 'Assistants': 'texte'}
SORTIE = {'Visuels': 'image', 'Rédaction': 'text', 'Assistants': 'analysis'}
GROUPE = {
    'Ce que ça fait': 'fonction', 'Style': 'style', 'Domaine': 'usage',
    'Ce que vous obtenez': 'resultat', 'Lieu': 'lieu', 'Expérience': 'experience', 'Autres': 'autre',
}
CHAMP = {'text': 'texte', 'textarea': 'texte_long'}

# Rayons et collections du site, par libelle. Le kit reprend les libelles du
# site ; les quatre collections qu'il ajoute recoivent une reference V5C.
RAYON_REF = {
    'Créations & montages': 'V5-CREATION', 'Portraits & sujets': 'V5-PORTRAITS', 'Espaces': 'V5-ESPACES',
    'Marketing & édition': 'V5-MARKETING', 'Schémas & technique': 'V5-TECHNIQUE', 'Produits': 'V5-PRODUITS',
    'Écrire & améliorer': 'V5-ECRIRE', 'Synthèses & analyses': 'V5-ANALYSER', 'Documents': 'V5-DOCUMENTS',
    'Personnages & recul': 'V5-PERSONNAGES', 'Jeux & simulations': 'V5-JEUX', 'Coachs & assistants': 'V5-EXPERTS',
}
COLLECTIONS_NOUVELLES = {
    # libelle : (reference, slug, rayon, ordre)
    'Voyages & horizons': ('V5C-PORTRAITS-VOYAGES', 'v5-portraits--voyages', 'V5-PORTRAITS', 360),
    'Scénographies': ('V5C-PRODUITS-SCENOGRAPHIES', 'v5-produits--scenographies', 'V5-PRODUITS', 370),
    'Matières & conception': ('V5C-PRODUITS-MATIERES', 'v5-produits--matieres', 'V5-PRODUITS', 380),
    'Présentations professionnelles': ('V5C-MARKETING-PRESENTATIONS', 'v5-marketing--presentations', 'V5-MARKETING', 390),
}
DEFINITION_GENERIQUE = 'Lieu principal de rangement'


def sql_json(valeur):
    texte = json.dumps(valeur, ensure_ascii=False)
    if BALISE in texte:
        raise SystemExit('Le texte du kit contient la balise de citation SQL.')
    return f'{BALISE}{texte}{BALISE}'


def resume_propre(texte):
    """« Nouveau Athlete heroique — ... » : le badge du PDF colle au resume."""
    return re.sub(r'^Nouveau (?=[A-ZÀ-Ý])', '', texte)


def card_slug(carte):
    base = carte['command'].lstrip('/')
    slug = carte['slug']
    return slug[len(base) + 1:] if slug.startswith(base + '-') else slug


# --- Controles du kit avant generation ----------------------------------------
ids = [c['card_id'] for c in cartes]
assert len(ids) == len(set(ids)) == 1109, 'card_id en double ou compte inattendu'
assert len({c['slug'] for c in cartes}) == 1109, 'slug en double'
assert len({c['card_code'] for c in cartes}) == 1109, 'card_code en double'
couples = [(c['command'], card_slug(c)) for c in cartes]
assert len(couples) == len(set(couples)), '(commande, card_slug) en double dans le kit'
tous_ids = set(ids) | {b['card_id'] for b in brouillons}
assert len(tous_ids) == 1109 + len(brouillons), 'un card_id de brouillon recoupe le kit'
codes = {c['card_code'] for c in cartes} | {b['card_code'] for b in brouillons}
assert len(codes) == 1109 + len(brouillons), 'un code de brouillon recoupe le kit'
for c in cartes:
    assert c['category'] in RAYON_REF, c['category']
    champs = json.loads(c['prompt_fields_json'] or '[]')
    jetons = set(re.findall(r'\{\{([^{}]+)\}\}', c['prompt']))
    assert jetons == {f['key'] for f in champs}, c['card_code']
    assert len(champs) <= (4 if c['fields_regime'] == 'marketing' else 3), c['card_code']
    assert c['fields_regime'] != 'marketing' or len(champs) >= 2, c['card_code']

# --- Les cartes, sous la forme que les lots lisent ---------------------------------
def carte_pour_sql(c):
    univers = c['universe']
    champs = json.loads(c['prompt_fields_json'] or '[]')
    photo = univers == 'Visuels' and c['identity_policy'].startswith('Avec une photo')
    ratio = c['default_ratio'] if c['default_ratio'] not in ('', 'sans_objet') else None
    organisation = c['output_type'] if c['output_type'] in ('image_unique', 'planche_unique') else None
    return {
        'card_id': c['card_id'],
        'card_code': c['card_code'],
        'command_id': c['command_id'],
        'publiee': c['status_before'] == 'published',
        'slug': c['slug'],
        'card_slug': card_slug(c),
        'command': c['command'],
        'name': c['name'],
        'library': BIBLIOTHEQUE[univers],
        'mode': MODE[univers],
        'entity_type': 'commande_image' if univers == 'Visuels' else ('mode_ia' if univers == 'Assistants' else None),
        'rayon_ref': RAYON_REF[c['category']],
        'collection': c['collection'],
        'is_free': c['is_free'] == 'true',
        'short_description': resume_propre(c['short_description']),
        'result_summary': resume_propre(c['result_summary']),
        'intention': c['intention'],
        'use_cases': json.loads(c['use_cases_json'] or '[]'),
        'expected_input': c['expected_input'],
        'identity_policy': c['identity_policy'],
        'input_type': 'image' if photo else ('text' if univers == 'Visuels' else 'mixed'),
        'output_type': SORTIE[univers],
        'output_formats': ['image'] if univers == 'Visuels' else ['texte'],
        'images_min': int(c['images_min']) if c['images_min'] not in ('', '0') else None,
        'default_ratio': ratio,
        'organisation_sortie': organisation,
        'show_image_card': univers == 'Visuels',
        'regime_champs': c['fields_regime'],
        'fiche_champs_max': len(champs),
        'revised_at': c['revision_date'] or None,
        'payload': c['prompt'],
        'payload_md5': hashlib.md5(c['prompt'].encode('utf-8')).hexdigest(),
        'champs': [
            {'cle': f['key'], 'libelle': f['label'], 'indication': f.get('placeholder') or f.get('example') or None,
             'kind': CHAMP[f['type']], 'requis': bool(f.get('required')), 'position': i + 1}
            for i, f in enumerate(champs)
        ],
        'tags': json.loads(c['tag_keys_json'] or '[]'),
    }


# --- Ecriture ---------------------------------------------------------------------
LOTS.mkdir(parents=True, exist_ok=True)
for ancien in LOTS.glob('*.sql'):
    ancien.unlink()


def ecrire(nom, contenu):
    (LOTS / nom).write_text(contenu.strip() + '\n', encoding='utf-8')


ecrire('000_debut.sql', """
-- =====================================================================
-- Catalogue v7 / 000 — ouverture de la transaction
--
-- Les lots de ce dossier forment UNE transaction : ils se passent ensemble,
-- dans l'ordre, par le workflow Catalogue (psql lit leur concatenation). Le
-- 999 valide ; la repetition remplace le 999 par un echec volontaire.
--
-- Genere par scripts/build-catalogue-v7.py depuis data/catalogue/v7/ :
-- ne pas modifier a la main.
-- =====================================================================
begin;
set local lock_timeout = '15s';
""")

# 010 : structure des tables temporaires.
ecrire('010_kit_tables.sql', """
-- Catalogue v7 / 010 — le kit en tables temporaires, jetees a la fin de la
-- transaction.
create temporary table v7_carte (
  card_id text primary key, card_code text not null unique, command_id uuid,
  publiee boolean not null, slug text not null unique, card_slug text not null,
  command text not null, name text not null, library public.app_library not null,
  mode public.app_mode not null, entity_type text, rayon_ref text not null,
  collection text not null, is_free boolean not null, short_description text not null,
  result_summary text, intention text, use_cases text[] not null, expected_input text,
  identity_policy text, input_type public.input_type not null,
  output_type public.output_type not null, output_formats public.output_format_kind[] not null,
  images_min smallint, default_ratio text, organisation_sortie text,
  show_image_card boolean not null, regime_champs text not null, fiche_champs_max smallint not null,
  revised_at date, payload text not null, payload_md5 text not null,
  champs jsonb not null, tags text[] not null
) on commit drop;

create temporary table v7_tag (
  slug text primary key, name text not null, groupe public.tag_group not null,
  description text not null, sort_order integer not null
) on commit drop;

create temporary table v7_migration_tag (
  source_norm text primary key, target_slug text
) on commit drop;

create temporary table v7_brouillon (
  card_id text primary key, card_code text not null unique, slug text not null unique,
  command text not null, card_slug text not null
) on commit drop;
""")

# 011-0NN : cartes, par paquets.
lignes = [carte_pour_sql(c) for c in cartes]
for i in range(0, len(lignes), CARTES_PAR_LOT):
    paquet = lignes[i:i + CARTES_PAR_LOT]
    n = i // CARTES_PAR_LOT + 1
    ecrire(f'0{10 + n:02d}_kit_cartes_{n:02d}.sql', f"""
-- Catalogue v7 / cartes {i + 1} a {i + len(paquet)} du kit.
insert into v7_carte
select * from jsonb_populate_recordset(null::v7_carte, {sql_json(paquet)}::jsonb);
""")

liste_tags = [
    {'slug': t['tag_key'], 'name': t['label'], 'groupe': GROUPE[t['group']],
     'description': t['definition'], 'sort_order': (i + 1) * 10}
    for i, t in enumerate(tags)
]
assert all(t['description'].strip() for t in liste_tags), 'tag sans definition'
correspondances = {}
for r in migration_tags:
    cible = r['target_key'] if not r['operation'].startswith('retire') else None
    correspondances[r['source_label']] = cible
liste_migration = [{'source_label': k, 'target_slug': v} for k, v in correspondances.items()]
liste_brouillons = [
    {'card_id': b['card_id'], 'card_code': b['card_code'], 'slug': b['slug'], 'command': b['command'],
     'card_slug': b['card_slug']}
    for b in brouillons
]
# Les liens carte-tag du kit doivent etre ceux que portent les cartes.
assert len(carte_tags) == sum(len(l['tags']) for l in lignes), 'carte_tags.csv et cartes.csv divergent'

ecrire('030_kit_tags.sql', f"""
-- Catalogue v7 / tags du kit, correspondance des anciens tags, brouillons.
insert into v7_tag
select * from jsonb_populate_recordset(null::v7_tag, {sql_json(liste_tags)}::jsonb);

insert into v7_migration_tag (source_norm, target_slug)
select public.texte_normalise(x ->> 'source_label'), x ->> 'target_slug'
from jsonb_array_elements({sql_json(liste_migration)}::jsonb) x
on conflict (source_norm) do nothing;

insert into v7_brouillon
select * from jsonb_populate_recordset(null::v7_brouillon, {sql_json(liste_brouillons)}::jsonb);
""")

n_publiees = sum(1 for l in lignes if l['publiee'])
n_nouvelles = len(lignes) - n_publiees
n_champs = sum(len(l['champs']) for l in lignes)
n_liens = sum(len(l['tags']) for l in lignes)

ecrire('100_apercu.sql', f"""
-- =====================================================================
-- Catalogue v7 / 100 — apercu et bilan, avant toute ecriture
--
-- Ce que la base doit etre pour recevoir le kit :
--   * chaque carte publiee du kit retrouve UNE carte vivante du site, par
--     card_id sinon par slug, et elle est publiee ;
--   * aucune nouvelle carte ne heurte un card_id, un slug ou un couple
--     (commande, card_slug) qui restera en base ;
--   * les brouillons du registre sont bien ceux du site.
-- Puis le bilan chiffre de ce qui part, affiche avant de l'emporter.
-- =====================================================================
create temporary table v7_correspondance on commit drop as
select k.card_id, coalesce(
  (select p.id from public.prompts p where p.card_id = k.card_id and p.status <> 'archived'),
  (select p.id from public.prompts p where p.slug = k.slug and p.status <> 'archived')
) as prompt_id
from v7_carte k where k.publiee;

create temporary table v7_brouillons_exclus on commit drop as
select p.id from public.prompts p
where p.status = 'draft'
  and (p.command::text, p.card_slug) in (('/adcreative', 'creatif-publicitaire'),
                                          ('/timeslice', 'tranche-temporelle'),
                                          ('/mirrorworld', 'monde-miroir'));

do $apercu$
declare v_n integer;
begin
  if (select count(*) from v7_carte) <> 1109 or (select count(*) from v7_carte where publiee) <> {n_publiees} then
    raise exception 'Catalogue v7 : le kit charge ne compte pas 1109 cartes dont {n_publiees} publiees.';
  end if;

  select count(*) into v_n from v7_correspondance where prompt_id is null;
  if v_n > 0 then
    raise exception 'Catalogue v7 : % carte(s) publiee(s) du kit introuvable(s) sur le site.', v_n;
  end if;
  select count(*) into v_n from v7_correspondance c join public.prompts p on p.id = c.prompt_id
  where p.status <> 'published';
  if v_n > 0 then
    raise exception 'Catalogue v7 : % carte(s) publiee(s) du kit ne le sont pas sur le site.', v_n;
  end if;
  if (select count(distinct prompt_id) from v7_correspondance) <> {n_publiees} then
    raise exception 'Catalogue v7 : deux cartes du kit designent la meme carte du site.';
  end if;

  -- Ce qui restera en base apres le menage : les cartes vivantes, moins les
  -- trois brouillons exclus.
  -- Une carte deja inseree par un passage precedent porte le meme card_id :
  -- ce n'est pas une collision, c'est la meme carte.
  select count(*) into v_n from v7_carte k
  where not k.publiee and exists (
    select 1 from public.prompts p
    where p.status <> 'archived' and p.id not in (select id from v7_brouillons_exclus)
      and p.card_id is distinct from k.card_id
      and (p.slug = k.slug
           or (p.command::text = k.command and coalesce(p.card_slug, '') = k.card_slug)));
  if v_n > 0 then
    raise exception 'Catalogue v7 : % nouvelle(s) carte(s) heurte(nt) une carte vivante du site.', v_n;
  end if;

  select count(*) into v_n from v7_brouillon b
  where not exists (select 1 from public.prompts p where p.status = 'draft' and p.slug = b.slug);
  if v_n > 0 then
    raise exception 'Catalogue v7 : % brouillon(s) du registre absent(s) du site.', v_n;
  end if;
  if (select count(*) from public.prompts where status = 'draft')
     <> (select count(*) from v7_brouillon) + (select count(*) from v7_brouillons_exclus) then
    raise exception 'Catalogue v7 : le site porte des brouillons que le registre ne connait pas.';
  end if;
  if (select count(*) from v7_brouillons_exclus) > 3 then
    raise exception 'Catalogue v7 : plus de trois brouillons exclus.';
  end if;
end $apercu$;

-- Le bilan : ce qui part avec le menage, ce qui arrive avec le kit.
select
  (select count(*) from public.prompts where status = 'archived') as commandes_archivees_supprimees,
  (select count(*) from public.copy_events e join public.prompts p on p.id = e.prompt_id
     where p.status = 'archived' or p.id in (select id from v7_brouillons_exclus)) as lignes_du_journal_supprimees,
  (select count(*) from public.copy_events e join public.prompt_variants v on v.id = e.variant_id
     where v.status = 'archived') as lignes_du_journal_sans_version,
  (select count(*) from public.favorites f join public.prompts p on p.id = f.prompt_id
     where p.status = 'archived' or p.id in (select id from v7_brouillons_exclus)) as favoris_supprimes,
  (select count(*) from public.recent_items r join public.prompts p on p.id = r.prompt_id
     where p.status = 'archived' or p.id in (select id from v7_brouillons_exclus)) as recents_supprimes,
  (select count(*) from public.prompt_aliases a
     where a.alias_prompt_id in (select id from public.prompts where status = 'archived')
        or a.canonical_prompt_id in (select id from public.prompts where status = 'archived')) as anciens_liens_supprimes,
  (select count(*) from public.prompt_variants where status = 'archived') as variantes_archivees_supprimees,
  (select count(*) from v7_brouillons_exclus) as brouillons_supprimes,
  (select count(*) from public.tags) as tags_remplaces,
  (select count(*) from v7_tag) as tags_du_kit,
  {n_publiees} as cartes_mises_a_jour,
  {n_nouvelles} as cartes_ajoutees,
  {n_champs} as champs_du_kit,
  {n_liens} as liens_de_tags_du_kit;
""")

ecrire('200_menage.sql', """
-- =====================================================================
-- Catalogue v7 / 200 — menage decide le 24 septembre 2026
--
-- Les commandes archivees partent avec tout ce qui leur tient : lignes du
-- journal des copies, favoris et recents qui les citent, anciens liens.
-- Decision explicite, qui leve pour ce chantier la regle de CLAUDE.md sur
-- le journal. Aucune ne porte de visuel (controle 900).
-- =====================================================================
create temporary table v7_visuels_avant on commit drop as
select count(*) as n from public.prompt_media;

delete from public.prompt_aliases a
 where a.alias_prompt_id in (select id from public.prompts where status = 'archived')
    or a.canonical_prompt_id in (select id from public.prompts where status = 'archived');
delete from public.prompts where status = 'archived';
delete from public.prompt_variants where status = 'archived';
delete from public.prompts where id in (select id from v7_brouillons_exclus);

-- Les brouillons de « Vie quotidienne », collection que le kit ne reprend
-- pas, attendent dans le rayon de transition.
update public.prompts p
   set category_id = (select id from public.categories where external_ref = 'V5-TRANSITION')
  from public.categories c
 where c.id = p.category_id and c.name = 'Vie quotidienne' and c.external_ref like 'V5C-%';

-- Les rangements qui ne servent plus : rayons « Commandes retirees » vides,
-- « Vie quotidienne » et « Mises en scene creatives ».
delete from public.categories c
 where (c.external_ref like 'ARCHIVES-%'
        or (c.external_ref like 'V5C-%' and c.name in ('Vie quotidienne', 'Mises en scène créatives')))
   and not exists (select 1 from public.prompts p where p.category_id = c.id)
   and not exists (select 1 from public.categories e where e.parent_id = c.id);
""")

nouvelles_collections = []
for nom, (ref, slug, rayon, ordre) in COLLECTIONS_NOUVELLES.items():
    ligne = next(t for t in taxonomie if t['label'] == nom)
    definition = ligne['definition'] if not ligne['definition'].startswith(DEFINITION_GENERIQUE) else None
    nouvelles_collections.append({'ref': ref, 'slug': slug, 'rayon': rayon, 'nom': nom, 'ordre': ordre,
                                  'description': definition})

ecrire('300_taxonomie.sql', f"""
-- Catalogue v7 / 300 — les collections que le kit ajoute. Les autres existent
-- deja sous le meme libelle ; « Amenagements », que le kit annonce comme
-- creee, existe aussi.
insert into public.categories (parent_id, mode, slug, name, short_description, status, sort_order, external_ref)
select r.id, r.mode, x ->> 'slug', x ->> 'nom', x ->> 'description', 'published', (x ->> 'ordre')::int, x ->> 'ref'
from jsonb_array_elements({sql_json(nouvelles_collections)}::jsonb) x
join public.categories r on r.external_ref = x ->> 'rayon'
on conflict (slug) do nothing;

-- Chaque carte du kit trouve sa collection, sous son rayon.
create temporary table v7_collection on commit drop as
select distinct k.collection, k.rayon_ref, c.id as category_id
from v7_carte k
join public.categories r on r.external_ref = k.rayon_ref
left join public.categories c on c.parent_id = r.id and c.name = k.collection and c.status <> 'archived';

do $ctrl$
begin
  if exists (select 1 from v7_collection where category_id is null) then
    raise exception 'Catalogue v7 : collection(s) du kit introuvable(s) : %',
      (select string_agg(collection, ', ') from v7_collection where category_id is null);
  end if;
end $ctrl$;
""")

ecrire('400_tags.sql', """
-- =====================================================================
-- Catalogue v7 / 400 — les 72 tags du kit remplacent les anciens
--
-- Les anciens tags des brouillons sont notes avant l'effacement : ils se
-- convertissent ensuite par migration_tags.csv (lot 700).
-- =====================================================================
create temporary table v7_anciens_tags_brouillons on commit drop as
select pt.prompt_id, public.texte_normalise(t.name) as source_norm
from public.prompt_tags pt
join public.tags t on t.id = pt.tag_id
join public.prompts p on p.id = pt.prompt_id and p.status = 'draft';

delete from public.tags t where not exists (select 1 from v7_tag k where k.slug = t.slug);

insert into public.tags (slug, name, groupe, description, is_active, sort_order)
select slug, name, groupe, description, true, sort_order from v7_tag
on conflict (slug) do update
  set name = excluded.name, groupe = excluded.groupe, description = excluded.description,
      is_active = true, sort_order = excluded.sort_order;
""")

ecrire('500_identifiants.sql', """
-- =====================================================================
-- Catalogue v7 / 500 — identifiants
--
-- card_id est l'identite. Les 106 cartes publiees que le site connaissait
-- sans UUID (66 sans identifiant, 40 avec une chaine historique) recoivent
-- celui du kit ; les brouillons, celui du registre
-- data/catalogue/v7/identifiants-brouillons.csv (UUIDv5, meme espace de
-- noms que le kit). card_code suit.
-- =====================================================================
update public.prompts p
   set card_id = k.card_id
  from v7_correspondance c
  join v7_carte k on k.card_id = c.card_id
 where p.id = c.prompt_id and p.card_id is distinct from k.card_id;

update public.prompts p
   set card_id = b.card_id, card_code = b.card_code
  from v7_brouillon b
 where p.status = 'draft' and p.slug = b.slug
   and (p.card_id is distinct from b.card_id or p.card_code is distinct from b.card_code);
""")

ecrire('600_cartes.sql', """
-- =====================================================================
-- Catalogue v7 / 600 — les cartes
--
-- Nouvelles : inserees et publiees (decision du 24 septembre). Publiees :
-- seul ce que le kit modifie change — contexte, texte, champs, intention.
-- Nom, slug, commande, acces, rangement et resume public restent ceux du
-- site. Le texte unique est porte par la variante « universel » ; l'ancien
-- texte reste dans l'historique des versions.
-- =====================================================================
insert into public.prompts (
  card_id, card_code, command_id, external_ref, command, name, slug, card_slug, mode, library,
  entity_type, category_id, short_description, result_summary, intention, use_cases,
  expected_input, identity_policy, input_type, output_type, output_formats, images_min,
  default_ratio, organisation_sortie, show_image_card, regime_champs, fiche_champs_max,
  is_free, status, published_at, catalog_version, revised_at)
select k.card_id, k.card_code, k.command_id, k.card_code, k.command, k.name, k.slug, k.card_slug,
       k.mode, k.library, k.entity_type, c.category_id, k.short_description, k.result_summary,
       k.intention, k.use_cases, k.expected_input, k.identity_policy, k.input_type, k.output_type,
       k.output_formats, k.images_min, k.default_ratio, k.organisation_sortie, k.show_image_card,
       k.regime_champs, k.fiche_champs_max, k.is_free, 'published', now(), 'v7', k.revised_at
from v7_carte k
join v7_collection c on c.collection = k.collection and c.rayon_ref = k.rayon_ref
where not k.publiee
  and not exists (select 1 from public.prompts p where p.card_id = k.card_id);

update public.prompts p
   set card_code = k.card_code,
       command_id = k.command_id,
       intention = k.intention,
       expected_input = k.expected_input,
       identity_policy = k.identity_policy,
       input_type = case when p.library = 'images' then k.input_type else p.input_type end,
       default_ratio = k.default_ratio,
       organisation_sortie = coalesce(k.organisation_sortie, p.organisation_sortie),
       regime_champs = k.regime_champs,
       fiche_champs_max = k.fiche_champs_max,
       catalog_version = 'v7',
       revised_at = k.revised_at
  from v7_carte k
 where k.publiee and p.card_id = k.card_id
   and (p.card_code, p.command_id, p.intention, p.expected_input, p.identity_policy,
        p.input_type, p.default_ratio, p.regime_champs, p.fiche_champs_max, p.catalog_version)
       is distinct from
       (k.card_code, k.command_id, k.intention, k.expected_input, k.identity_policy,
        case when p.library = 'images' then k.input_type else p.input_type end, k.default_ratio,
        k.regime_champs, k.fiche_champs_max, 'v7');

-- Le texte unique.
insert into public.prompt_variants (prompt_id, provider_id, status, compatibility)
select p.id, a.id, 'published', 'bon'
from v7_carte k
join public.prompts p on p.card_id = k.card_id
cross join public.ai_providers a
where a.key = 'universel'
on conflict (prompt_id, provider_id) do update set status = 'published', updated_at = now()
  where public.prompt_variants.status <> 'published';

update public.prompt_versions pv
   set is_current = false, status = 'retired', updated_at = now()
  from public.prompt_variants v
  join public.ai_providers a on a.id = v.provider_id and a.key = 'universel'
  join public.prompts p on p.id = v.prompt_id
  join v7_carte k on k.card_id = p.card_id
 where pv.variant_id = v.id and pv.is_current and pv.payload is distinct from k.payload;

insert into public.prompt_versions (variant_id, version_label, payload, status, is_current, published_at)
select v.id, 'v7', k.payload, 'published', true, now()
from v7_carte k
join public.prompts p on p.card_id = k.card_id
join public.prompt_variants v on v.prompt_id = p.id
join public.ai_providers a on a.id = v.provider_id and a.key = 'universel'
where not exists (select 1 from public.prompt_versions x where x.variant_id = v.id and x.is_current);
""")

ecrire('700_champs_et_tags.sql', """
-- =====================================================================
-- Catalogue v7 / 700 — champs a completer et tags
--
-- Rejouable sans rien recreer : ne part que ce qui differe du kit, n'arrive
-- que ce qui manque.
-- =====================================================================
create temporary table v7_champ on commit drop as
select p.id as prompt_id, f ->> 'cle' as cle, f ->> 'libelle' as libelle, f ->> 'indication' as indication,
       (f ->> 'kind')::public.prompt_field_kind as kind, (f ->> 'requis')::boolean as requis,
       (f ->> 'position')::smallint as position
from v7_carte k
join public.prompts p on p.card_id = k.card_id
cross join jsonb_array_elements(k.champs) f;

delete from public.prompt_fields f
 using public.prompts p, v7_carte k
 where f.prompt_id = p.id and p.card_id = k.card_id
   and not exists (
     select 1 from v7_champ c
     where c.prompt_id = f.prompt_id and c.cle = f.cle and c.libelle = f.libelle
       and c.indication is not distinct from f.indication and c.kind = f.kind
       and c.requis = f.requis and c.position = f.position);

insert into public.prompt_fields (prompt_id, cle, libelle, indication, kind, requis, position)
select c.prompt_id, c.cle, c.libelle, c.indication, c.kind, c.requis, c.position
from v7_champ c
where not exists (select 1 from public.prompt_fields f where f.prompt_id = c.prompt_id and f.cle = c.cle);

-- Tags des cartes du kit.
create temporary table v7_lien on commit drop as
select p.id as prompt_id, t.id as tag_id
from v7_carte k
join public.prompts p on p.card_id = k.card_id
cross join unnest(k.tags) s(slug)
join public.tags t on t.slug = s.slug;

delete from public.prompt_tags pt
 using public.prompts p, v7_carte k
 where pt.prompt_id = p.id and p.card_id = k.card_id
   and not exists (select 1 from v7_lien l where l.prompt_id = pt.prompt_id and l.tag_id = pt.tag_id);

insert into public.prompt_tags (prompt_id, tag_id)
select prompt_id, tag_id from v7_lien
on conflict do nothing;

-- Tags des brouillons, convertis par migration_tags.csv. Un ancien tag
-- retire (Bibliotheque, IA) ou sans correspondance ne donne rien.
insert into public.prompt_tags (prompt_id, tag_id)
select distinct a.prompt_id, t.id
from v7_anciens_tags_brouillons a
join v7_migration_tag m on m.source_norm = a.source_norm and m.target_slug is not null
join public.tags t on t.slug = m.target_slug
on conflict do nothing;
""")

ecrire('900_controles.sql', f"""
-- =====================================================================
-- Catalogue v7 / 900 — controles de sortie
--
-- Chaque garantie de CLAUDE.md, verifiee sur la base telle qu'elle sortira.
-- Un seul echec et la transaction entiere est annulee.
-- =====================================================================
do $ctrl$
declare v_n integer;
begin
  -- Les 1109 cartes du kit, par leur identite, publiees, avec leur code.
  select count(*) into v_n from v7_carte k
  join public.prompts p on p.card_id = k.card_id and p.card_code = k.card_code and p.status = 'published';
  if v_n <> 1109 then raise exception 'Controle v7 : % cartes du kit publiees sur 1109.', v_n; end if;

  -- Chacune sert exactement le texte du kit.
  select count(*) into v_n from v7_carte k
  join public.prompts p on p.card_id = k.card_id
  where md5(coalesce((select pv.payload from public.prompt_versions pv
                       join public.prompt_variants v on v.id = pv.variant_id
                       join public.ai_providers a on a.id = v.provider_id and a.key = 'universel'
                      where v.prompt_id = p.id and pv.is_current), '')) <> k.payload_md5
     or public.variante_servie(p.id, null) is distinct from (
          select v.id from public.prompt_variants v join public.ai_providers a on a.id = v.provider_id
          where v.prompt_id = p.id and a.key = 'universel');
  if v_n > 0 then raise exception 'Controle v7 : % carte(s) ne servent pas le texte du kit.', v_n; end if;
  if exists (select 1 from public.prompts where status = 'published' and not payload_ready) then
    raise exception 'Controle v7 : une carte publiee n''a pas de texte a copier.';
  end if;

  -- Champs et tags.
  if (select count(*) from public.prompt_fields f join public.prompts p on p.id = f.prompt_id
      join v7_carte k on k.card_id = p.card_id) <> {n_champs} then
    raise exception 'Controle v7 : les champs des cartes ne sont pas ceux du kit.';
  end if;
  if (select count(*) from public.prompt_tags pt join public.prompts p on p.id = pt.prompt_id
      join v7_carte k on k.card_id = p.card_id) <> {n_liens} then
    raise exception 'Controle v7 : les tags des cartes ne sont pas ceux du kit.';
  end if;
  if (select count(*) from public.tags) <> (select count(*) from v7_tag)
     or exists (select 1 from public.tags where coalesce(btrim(description), '') = '') then
    raise exception 'Controle v7 : la taxonomie des tags n''est pas celle du kit.';
  end if;
  if exists (select 1 from public.prompts p where p.status <> 'archived'
             and (select count(*) from public.prompt_fields f where f.prompt_id = p.id)
                 > case when p.regime_champs = 'marketing' then 4 else 3 end) then
    raise exception 'Controle v7 : une carte depasse sa borne de champs.';
  end if;

  -- Plus d'archive, plus d'orphelin.
  if exists (select 1 from public.prompts where status = 'archived')
     or exists (select 1 from public.prompt_variants where status = 'archived') then
    raise exception 'Controle v7 : une archive subsiste.';
  end if;
  if exists (select 1 from public.prompt_field_choices ch
             where not exists (select 1 from public.prompt_fields f where f.id = ch.field_id)) then
    raise exception 'Controle v7 : choix de champ orphelin.';
  end if;

  -- Identite et unicite.
  if exists (select 1 from public.prompts where card_id is null or card_code is null) then
    raise exception 'Controle v7 : une carte sans card_id ou sans code.';
  end if;
  if exists (select slug from public.prompts group by slug having count(*) > 1) then
    raise exception 'Controle v7 : un slug en double dans le catalogue.';
  end if;

  -- Brouillons : ceux du registre, et eux seuls.
  if (select count(*) from public.prompts p join v7_brouillon b on b.card_id = p.card_id
      where p.status = 'draft') <> (select count(*) from v7_brouillon)
     or (select count(*) from public.prompts where status = 'draft') <> (select count(*) from v7_brouillon) then
    raise exception 'Controle v7 : les brouillons ne sont pas ceux du registre.';
  end if;

  -- Rangement : aucune collection visible vide, rien de publie en transition.
  if exists (select 1 from public.categories c where c.parent_id is not null and c.is_visible
             and not exists (select 1 from public.prompts p where p.category_id = c.id)) then
    raise exception 'Controle v7 : une collection visible est vide : %',
      (select string_agg(c.name, ', ') from public.categories c where c.parent_id is not null and c.is_visible
        and not exists (select 1 from public.prompts p where p.category_id = c.id));
  end if;
  if exists (select 1 from public.prompts p join public.categories c on c.id = p.category_id
             where c.external_ref = 'V5-TRANSITION' and p.status = 'published') then
    raise exception 'Controle v7 : une carte publiee attend encore en transition.';
  end if;

  -- Visuels intacts.
  if (select count(*) from public.prompt_media) <> (select n from v7_visuels_avant) then
    raise exception 'Controle v7 : des visuels ont disparu.';
  end if;
end $ctrl$;

select
  (select count(*) from public.prompts where status = 'published') as publiees,
  (select count(*) from public.prompts where status = 'draft') as brouillons,
  (select count(*) from public.prompts where status = 'archived') as archivees,
  (select count(*) from public.tags) as tags,
  (select count(*) from public.prompt_tags) as liens_de_tags,
  (select count(*) from public.prompt_fields) as champs,
  (select count(*) from public.categories where parent_id is not null and status <> 'archived') as collections,
  (select count(*) from public.prompt_media) as visuels,
  (select count(*) from public.copy_events) as copies_du_journal;
""")

ecrire('999_valider.sql', """
-- Catalogue v7 / 999 — tout a passe : on valide.
commit;
""")

REPETITION.write_text("""-- =====================================================================
-- Catalogue v7 — repetition sur la base reelle, annulee
--
-- Remplace le lot 999 : tout le catalogue v7 s'est ecrit et ses controles
-- sont passes, puis cette levee annule la transaction. Rien n'est garde ;
-- le message rend ce qui aurait ete ecrit.
-- =====================================================================
do $repetition$
begin
  raise exception 'REPETITION v7 (annulee) : %', (select row_to_json(x) from (select
    (select count(*) from public.prompts where status = 'published') as publiees,
    (select count(*) from public.prompts where status = 'draft') as brouillons,
    (select count(*) from public.prompts where status = 'archived') as archivees,
    (select count(*) from public.tags) as tags,
    (select count(*) from public.prompt_tags) as liens_de_tags,
    (select count(*) from public.prompt_fields) as champs,
    (select count(*) from public.categories where parent_id is not null and status <> 'archived') as collections,
    (select count(*) from public.prompt_media) as visuels,
    (select count(*) from public.copy_events) as copies_du_journal,
    (select count(*) from public.favorites) as favoris) x);
end $repetition$;
""", encoding='utf-8')

print(f'{len(list(LOTS.glob("*.sql")))} lots ecrits dans {LOTS.relative_to(RACINE)}')
print(f'{n_publiees} publiees, {n_nouvelles} nouvelles, {n_champs} champs, {n_liens} liens de tags, '
      f'{len(liste_tags)} tags, {len(liste_brouillons)} brouillons')
