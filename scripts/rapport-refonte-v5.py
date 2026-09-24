#!/usr/bin/env python3
"""
Ecrit `data/catalogue/final-v5/etat-refonte-v5.tsv` : une ligne par carte,
les 642 retenues et les 2276 retirees, avec la decision qui les concerne.

  python3 scripts/rapport-refonte-v5.py

Le format est tabule plutot que virgule : les titres du catalogue portent
des virgules, et un tableur ouvre l'un comme l'autre. C'est le document a
lire avant de lancer le workflow, pas un fichier que l'import consomme.
"""

import collections
import io
import json
import os
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOSSIER = os.path.join(RACINE, 'data', 'catalogue', 'final-v5')

DECISION = {
    'conserver_publie': 'PUBLIER',
    'brouillon_reactive': 'BROUILLON (reprise)',
    'brouillon_nouveau': 'BROUILLON (nouvelle)',
}


def main():
    def lire(nom):
        with io.open(os.path.join(DOSSIER, nom), encoding='utf-8') as f:
            return json.load(f)

    cartes, retraits = lire('cartes.json'), lire('retraits.json')

    lignes = ['commande\tcarte\tbibliotheque\tcategorie\tcollection\t'
              'decision\tetat_actuel\tvisuels']
    for c in sorted(cartes, key=lambda x: (x['bibliotheque'], x['categorie'], x['commande'])):
        lignes.append('\t'.join((
            c['commande'], c['titre'], c['bibliotheque'], c['categorie_libelle'],
            c['collection_libelle'], DECISION[c['statut_publication']],
            c['statut_reel'] or 'absente', str(c['medias']))))
    for r in sorted(retraits, key=lambda x: x['commande']):
        lignes.append('\t'.join((
            r['commande'], r['titre'], '-', '-', '-',
            'ARCHIVER (%s)' % r['motif'], r['statut_actuel'], str(r['medias']))))

    cible = os.path.join(DOSSIER, 'etat-refonte-v5.tsv')
    with io.open(cible, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lignes) + '\n')

    par = collections.Counter(DECISION[c['statut_publication']] for c in cartes)
    par.update('ARCHIVER' for _ in retraits)
    print('%d lignes' % (len(lignes) - 1))
    for k, v in par.most_common():
        print('   %5d  %s' % (v, k))
    return 0


if __name__ == '__main__':
    sys.exit(main())
