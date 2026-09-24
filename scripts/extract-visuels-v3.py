#!/usr/bin/env python3
"""Extrait le catalogue Visuels V3 du CSV vers data/catalogue/visuels-v3/*.json.

Le CSV est la source editoriale ; le depot n'en garde que ce qui sert a
l'import, en JSON, pour que le generateur de lots n'ait jamais a parser de
CSV et pour qu'une revue de code voie les donnees.

    python3 scripts/extract-visuels-v3.py <catalogue.csv>
    npx prettier --write data/catalogue/visuels-v3

La seconde ligne n'est pas facultative : ces fichiers sont relus en revue de
code, et le depot verifie leur mise en forme comme celle du reste.

POURQUOI PYTHON ET PAS NODE. Le module `csv` de la bibliotheque standard est
un vrai parseur RFC 4180 : il tient les champs multilignes, les guillemets
echappes, les virgules dans une valeur citee. Le CSV V3 en contient — des
payloads de quarante lignes, des JSON avec des virgules. Un `split(',')`
produirait un catalogue silencieusement faux, ce qui est pire qu'une erreur.

CE QUE CE SCRIPT NE FAIT PAS. Il ne decide de rien et ne corrige rien. Les
incoherences sont comptees dans `audit.json` et signalees a l'ecran ; aucune
n'est reparee en silence. Une cellule commencant par `/` reste du texte :
rien n'est jamais evalue comme une formule.
"""

import csv
import json
import sys
from collections import Counter
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / 'data' / 'catalogue' / 'visuels-v3'

# Le CSV porte des payloads de plusieurs milliers de caracteres.
csv.field_size_limit(10**9)

# La categorie qui accueille ce que le CSV ne couvre pas.
#
# Le CSV decrit 862 cartes ; la bibliotheque Images en publie 1 768. Les 959
# restantes vivent dans l'ancienne taxonomie, que les douze categories V3
# remplacent en navigation. Sans porte, elles resteraient publiees et
# introuvables — visibles par la recherche, absentes de tout rayon. Cette
# treizieme categorie leur en donne une, le temps qu'elles soient reclassees.
TRANSITION = {
    'slug': 'a-reclasser',
    'nom': 'À reclasser',
    'description': 'Commandes du catalogue précédent qui attendent leur '
                   'catégorie V3. Elles fonctionnent normalement.',
    'ordre': 99,
}

# Le referentiel de tags du contrat V3 : slug, libelle, definition.
#
# Il ne vient pas du CSV, qui ne porte que des slugs. Il est recopie ici
# depuis le brief editorial, parce qu'un tag sans definition devient un tag
# qu'on repose differemment six mois plus tard.
TAGS = {
    'affiche': ('Affiche', "Composition d'affiche, avec ou sans texte."),
    'afrique': ('Afrique', 'Contexte africain explicitement choisi.'),
    'alimentation': ('Alimentation', 'Plat, ingrédient ou boisson.'),
    'animaux': ('Animaux', 'Animal comme sujet identifiable.'),
    'anime': ('Anime', "Langage graphique de l'animation japonaise."),
    'architecture': ('Architecture', "Bâtiments, plans d'espace ou aménagements."),
    'avant-apres': ('Avant / après', 'Comparaison explicite de deux états.'),
    'avatar': ('Avatar', 'Représentation personnelle utilisable comme identité '
                         'visuelle ou personnage.'),
    'aventure': ('Aventure', "Exploration ou scène d'action non documentaire."),
    'barbie': ('Barbie', "Carte explicitement située dans l'univers Barbie."),
    'bd': ('BD', 'Narration organisée en cases et bulles.'),
    'beaute': ('Beauté', 'Coiffure, maquillage, barbe, manucure ou apparence.'),
    'carrousel': ('Carrousel', 'Plusieurs images conçues pour être parcourues '
                               'dans un ordre.'),
    'cartoon': ('Cartoon', 'Personnages simplifiés à contours et aplats.'),
    'cinema': ('Cinema', "Esthétique de film, plateau ou affiche."),
    'collage': ('Collage', 'Assemblage de fragments photographiques ou de papier.'),
    'coupe': ('Coupe', 'Intérieur révélé par une section.'),
    'couverture': ('Couverture', 'Première page, pochette ou jaquette.'),
    'culture': ('Culture', "Évocation documentée d'un patrimoine."),
    'dragon-ball': ('Dragon Ball', "Carte explicitement située dans l'univers "
                                   'Dragon Ball.'),
    'ecommerce': ('E-commerce', 'Présentation pour une fiche produit ou une vente.'),
    'electronique': ('Électronique', 'Composants et circuits électriques ou '
                                     'électroniques.'),
    'evenement': ('Événement', "Annonce ou souvenir d'un événement."),
    'famille': ('Famille', 'Plusieurs proches ou un souvenir familial.'),
    'fantasy': ('Fantasy', 'Univers fantastique et créatures imaginaires.'),
    'figurine': ('Figurine', 'Sujet transformé en objet de collection ou en jouet.'),
    'fiction': ('Fiction', 'Récit ou univers inventé assumé comme tel.'),
    'fleurs': ('Fleurs', 'Fleurs comme élément majeur.'),
    'fond-ecran': ("Fond d'écran", 'Image conçue pour un écran personnel.'),
    'ghibli': ('Studio Ghibli', 'Carte inspirée du langage visuel du Studio Ghibli.'),
    'humour': ('Humour', 'Situation ou narration comique.'),
    'ia': ('IA', "Visualisation de concepts d'intelligence artificielle."),
    'illustration': ('Illustration', 'Rendu dessiné, peint ou graphiquement '
                                     'interprété.'),
    'infographie': ('Infographie', 'Informations hiérarchisées en une composition '
                                   'graphique.'),
    'instagram': ('Instagram', 'Usage prévu dans une publication ou un carrousel '
                               'Instagram.'),
    'lifestyle': ('Lifestyle', 'Scène quotidienne ou portrait spontané.'),
    'lumiere': ('Lumière', 'Traitement lumineux au cœur du concept.'),
    'luxe': ('Luxe', 'Direction esthétique sobre et raffinée.'),
    'marketing': ('Marketing', 'Visée commerciale ou promotionnelle assumée.'),
    'marque': ('Marque', 'Identité, cohérence ou univers de marque.'),
    'miniature': ('Miniature', "Changement d'échelle ou décor miniature."),
    'mode': ('Mode', 'Tenues, accessoires, essayage et éditorial vestimentaire.'),
    'montage': ('Montage', 'Assemblage visuel ou effet ajouté à une scène.'),
    'musique': ('Musique', 'Artiste, album ou univers musical.'),
    'naruto': ('Naruto', "Carte explicitement située dans l'univers Naruto."),
    'nature': ('Nature', 'Paysage, végétation ou milieu naturel.'),
    'noir-blanc': ('Noir et blanc', 'Image volontairement monochrome.'),
    'one-piece': ('One Piece', "Carte explicitement située dans l'univers One Piece."),
    'packaging': ('Packaging', 'Emballage ou étiquette.'),
    'pedagogie': ('Pédagogie', "But explicatif ou d'apprentissage."),
    'peinture': ('Peinture', 'Touches, pigments et matière picturale visibles.'),
    'personnage': ('Personnage', 'Figure incarnée, réelle ou inventée.'),
    'photographie': ('Photographie', 'Le rendu attendu imite une prise de vue réelle.'),
    'pokemon': ('Pokémon', 'Carte avec un personnage ou un univers Pokémon.'),
    'portrait': ('Portrait', 'Une personne est le sujet principal.'),
    'produit': ('Produit', 'Objet ou service présenté comme sujet commercial.'),
    'professionnel': ('Professionnel', 'Usage métier ou présentation professionnelle.'),
    'publicite': ('Publicité', 'Visuel destiné à communiquer une offre.'),
    'reels': ('Reels', 'Couverture ou image fixe pour une vidéo courte.'),
    'retouche': ('Retouche', "Modification ou correction d'une image existante."),
    'retro': ('Rétro', "Évocation d'une période passée."),
    'schema': ('Schéma', 'Relations ou structures représentées de manière explicative.'),
    'science': ('Science', 'Contenu scientifique documenté.'),
    'selfie': ('Selfie', 'Cadrage à bout de bras ou via un miroir.'),
    'serie': ('Série', 'Plusieurs vues ou images cohérentes.'),
    'simpsons': ('Les Simpson', "Carte explicitement située dans l'univers Les Simpson."),
    'south-park': ('South Park', "Carte explicitement située dans l'univers South Park."),
    'souvenir': ('Souvenir', 'Objet visuel lié à un moment personnel.'),
    'sport': ('Sport', 'Pratique, portrait ou ambiance sportive.'),
    'stickers': ('Stickers', 'Découpes visuelles destinées à être réutilisées.'),
    'story': ('Story', 'Visuel vertical prévu pour une story.'),
    'surrealisme': ('Surréalisme', 'Élément impossible intégré volontairement.'),
    'technique': ('Technique', 'Données, mécanismes ou construction à respecter.'),
    'tiktok': ('TikTok', 'Image fixe prévue pour TikTok ; aucune vidéo implicite.'),
    'trois-d': ('3D', 'Rendu de volume ou maquette numérique assumé.'),
    'typographie': ('Typographie', 'Texte organisé comme élément visuel essentiel.'),
    'voyage': ('Voyage', "Destination ou exploration d'un lieu."),
    'vue-eclatee': ('Vue éclatée', 'Composants séparés selon leur assemblage.'),
    'vues': ('Vues', 'Points de vue coordonnés du même sujet.'),
}


def liste(valeur, separateur=';'):
    """« a; b; c » -> ['a', 'b', 'c']. Une cellule vide rend une liste vide."""
    return [p.strip() for p in (valeur or '').split(separateur) if p.strip()]


def entier(valeur, defaut=0):
    try:
        return int(str(valeur).strip())
    except (TypeError, ValueError):
        return defaut


def json_strict(valeur, defaut):
    """Les cellules JSON sont du JSON, pas du JavaScript. Une valeur illisible
    est signalee par l'appelant plutot que remplacee en silence."""
    brut = (valeur or '').strip()
    if not brut:
        return defaut, None
    try:
        return json.loads(brut), None
    except json.JSONDecodeError as erreur:
        return defaut, str(erreur)


def ecrire(nom, donnees):
    SORTIE.mkdir(parents=True, exist_ok=True)
    chemin = SORTIE / f'{nom}.json'
    chemin.write_text(json.dumps(donnees, ensure_ascii=False, indent=2) + '\n',
                      encoding='utf-8')
    print(f'  {chemin.relative_to(RACINE)} — {len(donnees)} entrées')


def main(source):
    with open(source, newline='', encoding='utf-8-sig') as flux:
        lignes = list(csv.DictReader(flux))

    anomalies = Counter()
    cartes = []
    categories = {}
    collections = {}
    tags_vus = Counter()

    for ligne in lignes:
        champs, erreur = json_strict(ligne['personnalisation_json'], [])
        if erreur:
            anomalies['personnalisation_json illisible'] += 1
        references, erreur = json_strict(ligne['references_json'], [])
        if erreur:
            anomalies['references_json illisible'] += 1
        defauts, erreur = json_strict(ligne['defauts_json'], {})
        if erreur:
            anomalies['defauts_json illisible'] += 1
        temoins, erreur = json_strict(ligne['temoins_attendus_json'], [])
        if erreur:
            anomalies['temoins_attendus_json illisible'] += 1

        # Le contrat annonce `nombre_champs` egal a la taille du tableau. On ne
        # recopie pas la colonne : on prend la source, et on signale l'ecart.
        if entier(ligne['nombre_champs'], -1) != len(champs):
            anomalies['nombre_champs different du JSON'] += 1

        etiquettes = liste(ligne['tags'])
        if not 1 <= len(etiquettes) <= 4:
            anomalies['tags hors 1-4'] += 1
        for etiquette in etiquettes:
            tags_vus[etiquette] += 1
            if etiquette not in TAGS:
                anomalies['tag hors referentiel'] += 1

        cat = ligne['categorie_slug']
        categories.setdefault(cat, {
            'slug': cat,
            'nom': ligne['categorie'],
            'ordre': entier(ligne['ordre_categorie']),
        })
        col = ligne['collection_slug']
        if col:
            collections.setdefault(col, {
                'slug': col,
                'nom': ligne['collection'],
                'categorie': cat,
            })

        cartes.append({
            'carteId': ligne['carte_id'],
            'slug': ligne['carte_slug'],
            'titre': ligne['carte_titre'],
            'variante': ligne['variante'] or None,
            'commande': ligne['commande'],
            'commandeTitre': ligne['commande_titre'],
            'commandeObjectif': ligne['commande_objectif'],
            'categorie': cat,
            'collection': col or None,
            'descriptionCourte': ligne['description_courte'],
            'descriptionDetaillee': ligne['description_detaillee'],
            'casUsage': ligne['cas_usage'],
            'tags': etiquettes,
            'operation': ligne['operation'],
            'medium': ligne['medium'],
            'usagePrincipal': ligne['usage_principal'],
            'plateformes': liste(ligne['plateformes']),
            'donneesPersonnalisables': ligne['donnees_personnalisables'] or None,
            'personnalisation': champs,
            'regime': ligne['regime_personnalisation'],
            'modeCopie': ligne['mode_copie'],
            'references': references,
            'typeReference': ligne['type_reference'] or None,
            'conditionReference': ligne['condition_reference'] or None,
            'defauts': defauts,
            'politiqueQuestions': ligne['politique_questions'] or None,
            'ratioApercu': ligne['ratio_apercu'],
            'ratioSortie': ligne['ratio_sortie'],
            'ratioSortieRepli': ligne['ratio_sortie_repli'],
            'nombreImages': entier(ligne['nombre_images'], 1),
            'organisationSortie': ligne['organisation_sortie'],
            'formatFichier': ligne['format_fichier'],
            'renduGalerie': ligne['rendu_galerie'],
            'texteImage': ligne['texte_image'],
            'specification': ligne['specification_visuelle'],
            'pistesCreatives': ligne['pistes_creatives'],
            'reglesQualite': ligne['regles_qualite'],
            'capacitesRequises': liste(ligne['capacites_requises']),
            'politiqueRecherche': ligne['politique_recherche'] or None,
            'compatibiliteIa': ligne['compatibilite_ia'],
            'statutTestIa': ligne['statut_test_ia'],
            'payload': ligne['payload'],
            'typeTemoin': ligne['type_temoin'],
            'temoinsAttendus': temoins,
            'statutEditorial': ligne['statut_editorial'],
            'statutValidation': ligne['statut_validation'],
            'origine': ligne['origine'],
            'referenceInspiration': ligne['reference_inspiration'] or None,
            'versionPrompt': ligne['version_prompt'],
            'dateRevision': ligne['date_revision'],
            'ordre': entier(ligne['ordre_carte']),
            'ancienneCategorie': ligne['ancienne_categorie'] or None,
            'ancienneCollection': ligne['ancienne_collection'] or None,
            'ancienSlug': ligne['ancien_slug'] or None,
            'ancienTitre': ligne['ancien_titre'] or None,
            'testNominal': ligne['test_nominal'],
            'testPersonnalisation': ligne['test_personnalisation'],
            'testManquant': ligne['test_manquant'],
            'testVisuel': ligne['test_visuel'],
        })

    # Les identifiants doivent etre uniques : c'est la clef d'upsert.
    doublons = [c for c, n in Counter(x['carteId'] for x in cartes).items() if n > 1]
    if doublons:
        anomalies['carte_id en double'] = len(doublons)

    rangs = sorted(categories.values(), key=lambda c: c['ordre'])
    rangs.append({'slug': TRANSITION['slug'], 'nom': TRANSITION['nom'],
                  'ordre': TRANSITION['ordre'], 'description': TRANSITION['description']})

    etiquettes = [
        {'slug': slug, 'nom': TAGS[slug][0], 'definition': TAGS[slug][1],
         'cartes': nombre}
        for slug, nombre in sorted(tags_vus.items(), key=lambda kv: (-kv[1], kv[0]))
        if slug in TAGS
    ]

    audit = {
        'cartes': len(cartes),
        'commandes': len(set(c['commande'] for c in cartes)),
        'categories': len(categories),
        'collections': len(collections),
        'tags': len(etiquettes),
        'historiques': sum(1 for c in cartes if c['origine'] == 'existant_revise'),
        'nouvelles': sum(1 for c in cartes if c['origine'] == 'ajout_v3'),
        'copieDirecte': sum(1 for c in cartes if c['modeCopie'] == 'direct'),
        'anomalies': dict(anomalies),
    }

    print(f'Lecture de {source} — {len(lignes)} lignes')
    ecrire('cartes', cartes)
    ecrire('categories', rangs)
    ecrire('collections', sorted(collections.values(), key=lambda c: c['slug']))
    ecrire('tags', etiquettes)
    ecrire('audit', audit)

    if anomalies:
        print('\nAnomalies relevees (rien n\'a ete corrige) :')
        for nom, nombre in anomalies.most_common():
            print(f'  {nombre:5d}  {nom}')
        return 1
    print('\nAucune anomalie : le CSV respecte son propre contrat.')
    return 0


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__)
        raise SystemExit(2)
    raise SystemExit(main(sys.argv[1]))
