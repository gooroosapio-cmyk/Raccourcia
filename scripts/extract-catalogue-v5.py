#!/usr/bin/env python3
"""
Lecture du catalogue V5 et resolution vers la production.

Ce script ne decide rien : il lit le CSV editorial, le rapproche de
l'inventaire reel, et ecrit ce qu'il a trouve dans `data/catalogue/v5/`.
Les anomalies sont signalees, jamais reparees en silence — une carte mal
rapprochee doit se voir, pas se deviner.

Le point sensible est la resolution. `cle_carte` (rc5-...) est une clef
d'import, `cle_audit` (pdf-...) une clef de page de PDF : ni l'une ni
l'autre n'est un identifiant de production. Le rapprochement se fait donc
sur la commande, le statut et le titre, et le titre du PDF peut etre
tronque ou porter une cesure. Chaque resolution garde sa methode, pour
qu'on puisse relire celles qui ont demande le plus d'interpretation.

  python3 scripts/extract-catalogue-v5.py <catalogue.csv> <production.json>
"""

import csv
import collections
import io
import json
import os
import sys
import unicodedata

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORTIE = os.path.join(RACINE, 'data', 'catalogue', 'final-v5')

# Le CSV parle en bibliotheques V5 ; la base parle encore en enums
# historiques. On renomme les libelles, pas les identifiants : changer
# l'enum demanderait de reecrire les URL, les index et les donnees.
BIBLIOTHEQUE = {
    'visuels': {'library': 'images', 'mode': 'image'},
    'redaction': {'library': 'textes', 'mode': 'texte'},
    'assistants': {'library': 'reflexions', 'mode': 'texte'},
}

# Les 40 tags du referentiel ferme. Un tag hors de cette liste est une
# anomalie : l'importeur doit refuser, pas inventer.
TAGS_AUTORISES = [
    'photo', 'portrait', 'objet', 'retouche', 'mode', 'souvenir', 'produit',
    'publicite', 'affiche', 'couverture', 'marque', 'reseaux', 'illustration',
    'anime', 'cinema', 'humour', 'montage', '3d', 'retro', 'architecture',
    'plan', 'schema', 'donnees', 'apprentissage', 'communication', 'synthese',
    'organisation', 'analyse', 'recherche', 'strategie', 'personnage', 'debat',
    'jeu', 'enquete', 'simulation', 'coaching', 'quotidien', 'finance',
    'juridique', 'code',
]

STATUT_SOURCE = {'P': 'published', 'A': 'archived'}

# --- La repartition finale : douze rayons nets, et un rayon de transition ---
#
# Le catalogue V5 propose treize categories. La demande est d'en avoir douze
# qui tiennent debout et une treizieme ou deposer ce qui n'est pas encore
# valide. Il faut donc une fusion, et toute fusion abime quelque chose : le
# dossier separe explicitement Produits de Marketing (§3), et Documents de
# Syntheses (produire un livrable n'est pas comprendre une source).
#
# Coachs et Assistants metiers sont les deux seules que rien n'oppose dans
# les regles de classement : ce sont toutes deux un accompagnement qui dure,
# l'un personnel, l'autre professionnel. Et cette distinction-la ne se perd
# pas en fusionnant, parce qu'elle vit deja un cran plus bas — les quatre
# collections survivent telles quelles sous le rayon fusionne. C'est la seule
# fusion des treize qui ne coute aucune information.
FUSION = {'coachs': 'experts'}
FUSION_LIBELLE = {'experts': 'Coachs & assistants'}

# Le rayon de transition. Il porte les cartes reprises ou creees que la
# refonte laisse en brouillon : leur promesse est ecrite, leur classement
# est propose, mais aucune n'a ete relue. Les y poser plutot que de les
# semer dans les douze rayons evite qu'un rayon annonce des cartes que
# personne n'a validees.
#
# Une categorie ne porte qu'un mode, et 284 des 293 brouillons sont des
# Visuels : le rayon est donc un rayon d'images. Les neuf autres (sept
# Assistants, deux Redaction) restent dans leur rayon final — les deplacer
# dans un rayon d'images casserait le filtre par bibliotheque pour ne ranger
# que neuf cartes.
TRANSITION = {
    'cle': 'transition',
    'libelle': 'En cours de reclassement',
    'bibliotheque': 'visuels',
}


def normaliser(texte):
    """Compare deux titres sans buter sur les accents ni sur les cesures
    que le PDF introduit en fin de ligne (« mi- eau » pour « mi-eau »)."""
    t = unicodedata.normalize('NFKD', texte or '').encode('ascii', 'ignore').decode()
    t = t.lower().replace('- ', '-').replace(' -', '-')
    return ' '.join(t.split())


def charger(chemin_csv, chemin_prod):
    with io.open(chemin_csv, encoding='utf-8-sig', newline='') as f:
        cartes = list(csv.DictReader(f))
    with io.open(chemin_prod, encoding='utf-8') as f:
        production = json.load(f)
    return cartes, production


def resoudre(cartes, production, anomalies):
    """Rapproche chaque source declaree d'une carte reelle.

    Rend (representante_par_cle, regroupees, non_resolues). La premiere
    source declaree est la representante : c'est elle qu'on met a jour ;
    les suivantes sont absorbees et deviennent des alias."""
    par_commande = collections.defaultdict(list)
    for p in production:
        par_commande[p['command'].strip().lower()].append(p)

    representante, regroupees, non_resolues = {}, {}, []
    methodes = collections.Counter()

    def une_source(entree):
        statut = entree.get('statut')
        commande = (entree.get('commande') or '').strip().lower()
        if statut == 'N':
            return None, 'proposition hors base'
        candidates = par_commande.get(commande, [])
        if not candidates:
            return None, 'commande absente de la base'
        filtrees = [c for c in candidates if c['status'] == STATUT_SOURCE[statut]] or candidates
        if len(filtrees) == 1:
            return filtrees[0], 'commande'
        titre = normaliser(entree.get('titre_exact_pdf', ''))
        exactes = [c for c in filtrees if normaliser(c['name']) == titre]
        if len(exactes) == 1:
            return exactes[0], 'titre exact'
        # Le titre du PDF est peut-etre tronque : on compare sur son debut,
        # mais seulement si ce debut designe une seule carte.
        if titre:
            prefixe = [c for c in filtrees
                       if normaliser(c['name']).startswith(titre[:max(12, len(titre) - 3)])]
            if len(prefixe) == 1:
                return prefixe[0], 'titre prefixe'
        return None, 'ambigu entre %d cartes' % len(filtrees)

    for carte in cartes:
        cle = carte['cle_carte']
        trouvees = []
        for entree in json.loads(carte['sources_json']):
            reelle, methode = une_source(entree)
            methodes[methode] += 1
            if reelle is None:
                if methode != 'proposition hors base':
                    non_resolues.append({
                        'cle_carte': cle, 'cle_audit': entree['cle_audit'],
                        'commande': entree.get('commande'), 'raison': methode,
                    })
                continue
            trouvees.append((reelle, methode, entree['cle_audit']))

        if trouvees:
            reelle, methode, cle_audit = trouvees[0]
            representante[cle] = {
                'id': reelle['id'], 'card_id': reelle['card_id'],
                'commande_reelle': reelle['command'], 'titre_reel': reelle['name'],
                'statut_reel': reelle['status'], 'medias': reelle['medias'],
                'methode': methode, 'cle_audit': cle_audit,
            }
            for reelle, methode, cle_audit in trouvees[1:]:
                regroupees[reelle['id']] = {
                    'vers': cle, 'commande_reelle': reelle['command'],
                    'titre_reel': reelle['name'], 'statut_reel': reelle['status'],
                    'medias': reelle['medias'], 'cle_audit': cle_audit,
                }

    # Une carte reelle ne peut alimenter qu'une seule cible. Si ce controle
    # leve, deux cibles se disputent la meme carte et l'import creerait un
    # doublon au lieu de le resoudre.
    vus = collections.Counter()
    for r in representante.values():
        vus[r['id']] += 1
    for pid in regroupees:
        vus[pid] += 1
    partagees = [pid for pid, n in vus.items() if n > 1]
    if partagees:
        anomalies.append({'type': 'carte_reelle_partagee', 'n': len(partagees),
                          'ids': partagees[:20]})

    return representante, regroupees, non_resolues, methodes


def construire(cartes, representante, regroupees, production, anomalies):
    couvertes = set(r['id'] for r in representante.values()) | set(regroupees)
    sorties = []

    for carte in cartes:
        cle = carte['cle_carte']
        biblio = BIBLIOTHEQUE[carte['bibliotheque']]
        tags = [t.strip() for t in carte['tags'].split(';') if t.strip()]
        inconnus = [t for t in tags if t not in TAGS_AUTORISES]
        if inconnus:
            anomalies.append({'type': 'tag_hors_referentiel', 'cle_carte': cle,
                              'tags': inconnus})
        if len(tags) > 4:
            anomalies.append({'type': 'plus_de_4_tags', 'cle_carte': cle, 'n': len(tags)})

        champs = json.loads(carte['personnalisation_json'])
        if str(len(champs)) != carte['nombre_champs']:
            anomalies.append({'type': 'nombre_champs_incoherent', 'cle_carte': cle,
                              'declare': carte['nombre_champs'], 'reel': len(champs)})
        borne = 4 if carte['regime_champs'] == 'marketing' else 3
        if len(champs) > borne:
            anomalies.append({'type': 'champs_hors_borne', 'cle_carte': cle,
                              'regime': carte['regime_champs'], 'n': len(champs)})

        # Aucun token {{cle}} du payload ne doit rester sans champ declare :
        # il partirait tel quel dans le presse-papiers.
        declares = set(c.get('cle') for c in champs)
        import re as _re
        tokens = set(_re.findall(r'\{\{([a-z0-9_]+)\}\}', carte['playloads'] or ''))
        orphelins = sorted(tokens - declares)
        if orphelins:
            anomalies.append({'type': 'token_non_declare', 'cle_carte': cle,
                              'tokens': orphelins})

        resolue = representante.get(cle)

        # La fusion : la carte change de rayon, jamais de collection.
        categorie = FUSION.get(carte['categorie'], carte['categorie'])
        categorie_libelle = FUSION_LIBELLE.get(categorie, carte['categorie_libelle'])

        # Le rayon de transition ne prend que les brouillons Visuels, et il
        # les prend a la place de leur collection : une carte en attente de
        # relecture n'a pas encore sa place dans le classement fin.
        en_transition = (
            carte['statut_publication'] != 'conserver_publie'
            and carte['bibliotheque'] == TRANSITION['bibliotheque']
        )
        rayon = TRANSITION['cle'] if en_transition else carte['collection']

        sorties.append({
            'cle_carte': cle,
            'rayon': rayon,
            'en_transition': en_transition,
            'categorie_finale': categorie,
            'categorie_finale_libelle': categorie_libelle,
            'action': 'mettre_a_jour' if resolue else 'creer',
            'id_production': resolue['id'] if resolue else None,
            'statut_reel': resolue['statut_reel'] if resolue else None,
            'methode_resolution': resolue['methode'] if resolue else None,
            'medias': resolue['medias'] if resolue else 0,
            'library': biblio['library'], 'mode': biblio['mode'],
            'bibliotheque': carte['bibliotheque'],
            'categorie': carte['categorie'], 'categorie_libelle': carte['categorie_libelle'],
            'collection': carte['collection'], 'collection_libelle': carte['collection_libelle'],
            'commande': carte['commande'], 'titre': carte['titre'],
            'description': carte['description'],
            'entrees_minimum': carte['entrees_minimum'],
            'sortie': carte['sortie'], 'format_sortie': carte['format_sortie'],
            'ratio_sortie': carte['ratio_sortie'], 'ratio_apercu': carte['ratio_apercu'],
            'type_livrable': carte['type_livrable'], 'medium': carte['medium'],
            'tags': tags, 'champs': champs,
            'references': json.loads(carte['references_json']),
            'regime_champs': carte['regime_champs'],
            'comportement_si_vide': carte['comportement_si_vide'],
            'playloads': carte['playloads'],
            'critere_acceptation': carte['critere_acceptation'],
            'capacites_requises': carte['capacites_requises'],
            'statut_publication': carte['statut_publication'],
            'type_temoin': carte['type_temoin'],
            'aliases': json.loads(carte['aliases_json']),
            'priorite': int(carte['priorite']),
        })

    retraits = [{
        'id': p['id'], 'commande': p['command'], 'titre': p['name'],
        'statut_actuel': p['status'], 'medias': p['medias'],
        'motif': 'regroupee', 'vers': regroupees[p['id']]['vers'],
    } if p['id'] in regroupees else {
        'id': p['id'], 'commande': p['command'], 'titre': p['name'],
        'statut_actuel': p['status'], 'medias': p['medias'],
        'motif': 'hors_selection', 'vers': None,
    } for p in production if p['id'] not in set(r['id'] for r in representante.values())]

    # Un retrait qui emporterait un visuel serait une perte seche : on veut
    # le savoir avant d'ecrire, pas apres.
    avec_media = [r for r in retraits if r['medias']]
    if avec_media:
        anomalies.append({'type': 'retrait_avec_media', 'n': len(avec_media),
                          'fichiers': sum(r['medias'] for r in avec_media)})
    return sorties, retraits, couvertes


def reconcilier_les_alias(sorties, regroupees, anomalies):
    """Ce que la refonte fait aux alias deja poses.

    La base porte deja une carte de redirections, ecrite pour le catalogue
    d'avant. Poser les 700 nouveaux par-dessus sans la regarder echoue :
    `prompt_aliases_sans_chaine` interdit qu'un alias pointe vers une carte
    qui est elle-meme un alias, et interdit qu'une carte deja destination
    devienne source. Ce n'est pas une contrainte a contourner — c'est elle
    qui garantit qu'une ancienne adresse mene en un saut a une fiche qui
    existe, et pas a une chaine qui se perd.

    Deux cas, et un seul geste chacun :

      * la SOURCE d'un ancien alias est une carte que la V5 garde. Le lien
        disait « cette carte renvoie ailleurs » ; elle est canonique
        desormais, donc il ment. On le retire.

      * la DESTINATION d'un ancien alias est une carte que la V5 regroupe.
        Le lien menait a une carte qui s'efface ; on le fait pointer un cran
        plus loin, vers la cible qui reprend la fonction. L'ancienne adresse
        continue de mener quelque part, en un saut.

    Un troisieme cas ne demande rien : la destination part sans cible. Le
    lien cesse de resoudre, la source s'archive, et la page d'archive prend
    le relais pour dire ce qui s'est passe.
    """
    chemin = os.path.join(SORTIE, 'alias-existants.json')
    if not os.path.exists(chemin):
        return {'perimes': [], 'repointes': [], 'inchanges': 0}

    with io.open(chemin, encoding='utf-8') as f:
        anciens = json.load(f)

    representantes = set(s['id_production'] for s in sorties if s['id_production'])
    cible_de = {}
    for cle, infos in regroupees.items():
        cible = next((s for s in sorties if s['cle_carte'] == infos['vers']), None)
        if cible and cible['id_production']:
            cible_de[cle] = cible['id_production']

    perimes, repointes, inchanges = [], [], 0
    for lien in anciens:
        if lien['source'] in representantes:
            perimes.append(lien)
        elif lien['destination'] in cible_de:
            repointes.append({'source': lien['source'],
                              'ancienne': lien['destination'],
                              'nouvelle': cible_de[lien['destination']]})
        else:
            inchanges += 1

    # Une reconciliation qui laisserait un conflit ne servirait a rien : on
    # verifie ici, pas en production.
    apres_sources = set()
    apres_destinations = set()
    for lien in anciens:
        if lien in perimes:
            continue
        d = next((r['nouvelle'] for r in repointes if r['source'] == lien['source']),
                 lien['destination'])
        apres_sources.add(lien['source'])
        apres_destinations.add(d)

    conflits = 0
    for cle, infos in regroupees.items():
        cible = cible_de.get(cle)
        if cible is None:
            continue
        if cible in apres_sources or cle in apres_destinations:
            conflits += 1
    if conflits:
        anomalies.append({'type': 'alias_en_conflit_apres_reconciliation', 'n': conflits})

    return {'perimes': perimes, 'repointes': repointes, 'inchanges': inchanges}


def taxonomie(cartes, sorties, anomalies):
    cats, colls = {}, {}
    for c in cartes:
        biblio = BIBLIOTHEQUE[c['bibliotheque']]
        categorie = FUSION.get(c['categorie'], c['categorie'])
        libelle = FUSION_LIBELLE.get(categorie, c['categorie_libelle'])
        cats.setdefault(categorie, {
            'cle': categorie, 'libelle': libelle,
            'bibliotheque': c['bibliotheque'], 'mode': biblio['mode'],
            'library': biblio['library'], 'cartes': 0})
        cats[categorie]['cartes'] += 1
        colls.setdefault(c['collection'], {
            'cle': c['collection'], 'libelle': c['collection_libelle'],
            'parent': categorie, 'mode': biblio['mode'], 'cartes': 0})
        colls[c['collection']]['cartes'] += 1
        if colls[c['collection']]['parent'] != categorie:
            anomalies.append({'type': 'collection_a_deux_parents',
                              'collection': c['collection']})

    # Le rayon de transition est une categorie racine, sans collection : ce
    # qu'on y depose attend d'etre classe, pas d'etre sous-classe.
    en_transition = sum(1 for s in sorties if s['en_transition'])
    biblio = BIBLIOTHEQUE[TRANSITION['bibliotheque']]
    cats[TRANSITION['cle']] = {
        'cle': TRANSITION['cle'], 'libelle': TRANSITION['libelle'],
        'bibliotheque': TRANSITION['bibliotheque'], 'mode': biblio['mode'],
        'library': biblio['library'], 'cartes': en_transition,
        'transition': True,
    }

    if len(cats) != 13:
        anomalies.append({'type': 'nombre_de_rayons', 'attendu': 13,
                          'trouve': len(cats)})
    utilises = collections.Counter()
    for c in cartes:
        for t in c['tags'].split(';'):
            if t.strip():
                utilises[t.strip()] += 1
    tags = [{'slug': s, 'cartes': utilises.get(s, 0)} for s in TAGS_AUTORISES]
    return list(cats.values()), list(colls.values()), tags


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        return 1
    anomalies = []
    cartes, production = charger(sys.argv[1], sys.argv[2])
    representante, regroupees, non_resolues, methodes = resoudre(cartes, production, anomalies)
    sorties, retraits, couvertes = construire(cartes, representante, regroupees,
                                              production, anomalies)
    alias = reconcilier_les_alias(sorties, regroupees, anomalies)
    cats, colls, tags = taxonomie(cartes, sorties, anomalies)

    os.makedirs(SORTIE, exist_ok=True)

    def ecrire(nom, donnees):
        with io.open(os.path.join(SORTIE, nom), 'w', encoding='utf-8') as f:
            json.dump(donnees, f, ensure_ascii=False, indent=1, sort_keys=True)
            f.write('\n')

    ecrire('cartes.json', sorties)
    ecrire('alias-reconcilies.json', alias)
    ecrire('retraits.json', retraits)
    ecrire('taxonomie.json', {'categories': cats, 'collections': colls, 'tags': tags})
    ecrire('resolution.json', {
        'representantes': representante,
        'regroupees': regroupees,
        'non_resolues': non_resolues,
    })

    par_action = collections.Counter(c['action'] for c in sorties)
    par_statut = collections.Counter(c['statut_publication'] for c in sorties)
    par_motif = collections.Counter(r['motif'] for r in retraits)
    ecrire('audit.json', {
        'cartes_cibles': len(sorties),
        'par_action': dict(par_action),
        'par_statut_publication': dict(par_statut),
        'representantes': len(representante),
        'regroupees': len(regroupees),
        'retraits': {'total': len(retraits), 'par_motif': dict(par_motif)},
        'production': len(production),
        'methodes_de_resolution': dict(methodes),
        'non_resolues': len(non_resolues),
        'anomalies': anomalies,
    })

    print('Cartes cibles          : %d (%s)' % (len(sorties), dict(par_action)))
    print('Statuts vises          : %s' % dict(par_statut))
    print('Representantes         : %d' % len(representante))
    print('Regroupees (alias)     : %d' % len(regroupees))
    print('Retraits               : %d %s' % (len(retraits), dict(par_motif)))
    print('Methodes de resolution : %s' % dict(methodes))
    print('Non resolues           : %d' % len(non_resolues))
    print('Alias deja en base     : %d perimes, %d repointes, %d inchanges'
          % (len(alias['perimes']), len(alias['repointes']), alias['inchanges']))
    print('Categories/collections : %d / %d' % (len(cats), len(colls)))
    print('   dont rayon de transition : %d carte(s)'
          % sum(1 for s in sorties if s['en_transition']))
    print('Anomalies              : %d' % len(anomalies))
    for a in anomalies[:15]:
        print('   - %s' % json.dumps(a, ensure_ascii=False)[:160])
    return 0


if __name__ == '__main__':
    sys.exit(main())
