#!/usr/bin/env python3
"""
Fabrique `tests/db/replica-v5.sql` depuis un inventaire de production.

  python3 scripts/make-replica-v5.py <production.json>

Le replica reprend ce dont la refonte a besoin pour etre eprouvee : les
identifiants reels, les commandes, les titres, les statuts, et le nombre
exact de visuels par carte. Il ne reprend pas les payloads — la refonte les
remplace, et aucun de ses controles ne les lit.

Les categories du replica ne sont qu'un echafaudage : elles portent un slug
prefixe, pour ne jamais heurter une categorie que les migrations creent
elles-memes. La refonte cree ses propres rayons V5 et rattache les 642
cartes ; celles du replica ne servent qu'a ce que les 2877 cartes aient un
rayon avant qu'elle passe.
"""

import io
import json
import os
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIBRARY = {'image': 'images', 'texte': 'textes', 'analyse': 'reflexions'}


def q(v):
    return 'null' if v is None else "'" + str(v).replace("'", "''") + "'"


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        return 1
    with io.open(sys.argv[1], encoding='utf-8') as f:
        prod = json.load(f)

    cats = {}
    for p in prod:
        if p['category_id']:
            cats.setdefault(p['category_id'], p['categorie'] or 'Rayon herite')

    out = [
        "-- =====================================================================",
        "-- Replica de production pour la repetition generale de la refonte V5.",
        "--",
        "-- Genere par scripts/make-replica-v5.py depuis l'inventaire reel.",
        "-- Memes identifiants, memes commandes, memes titres, memes statuts,",
        "-- meme nombre de visuels par carte. Les payloads ne sont pas repris.",
        "--",
        "-- Il existe pour une seule raison : passer les 40 lots sur la forme",
        "-- exacte de la base avant de les approcher de la vraie.",
        "-- =====================================================================",
        "alter table public.prompts disable trigger all;",
        "alter table public.categories disable trigger all;",
        "",
        "insert into public.categories (id, slug, name, mode, status, is_visible) values",
    ]
    out.append(',\n'.join(
        "  (%s::uuid, %s, %s, 'image', 'published', true)"
        % (q(cid), q('replica-' + cid[:8]), q(nom)) for cid, nom in cats.items()) + "\non conflict do nothing;\n")

    out.append("insert into public.prompts (id, card_id, command, name, slug, card_slug,"
               " mode, library, status, category_id, short_description) values")
    out.append(',\n'.join(
        "  (%s::uuid, %s, %s, %s, %s, %s, %s, %s, %s, %s::uuid, 'Replica')"
        % (q(p['id']), q(p['card_id']), q(p['command']), q(p['name']), q(p['slug']),
           q(p['card_slug']), q(p['mode']), q(LIBRARY[p['mode']]), q(p['status']),
           q(p['category_id'])) for p in prod) + "\non conflict do nothing;\n")

    med = []
    for p in prod:
        for i in range(p['medias']):
            kind = 'before' if i == 0 else ('after' if i == 1 else 'example')
            med.append("  (%s::uuid, %s, %s)" % (
                q(p['id']), q(kind),
                q('prompts/%s/%s-replica-%d.jpg' % (p['id'], kind, i))))
    out.append("insert into public.prompt_media (prompt_id, kind, storage_path) values")
    out.append(',\n'.join(med) + ";\n")

    out += ["alter table public.prompts enable trigger all;",
            "alter table public.categories enable trigger all;", ""]

    cible = os.path.join(RACINE, 'tests', 'db', 'replica-v5.sql')
    with io.open(cible, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))
    print('replica : %d categories, %d cartes, %d visuels' % (len(cats), len(prod), len(med)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
