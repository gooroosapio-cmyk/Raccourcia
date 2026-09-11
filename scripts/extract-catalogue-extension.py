#!/usr/bin/env python3
"""Extrait une extension IMAGE du classeur vers data/catalogue/<version>/.

    python3 scripts/extract-catalogue-extension.py <classeur.xlsx> <version>
    npx prettier --write data/catalogue/<version>

Par exemple : `extract-catalogue-extension.py classeur.xlsx v5-2`.

Une extension ajoute des commandes aux familles existantes ; aucune n'en
cree. Rien n'est mis a jour, tout est neuf — c'est ce qui rend ces imports
beaucoup plus surs que celui du catalogue V5, qui reecrivait 433 fiches.

Les classeurs d'extension recommandent de traiter certaines commandes comme
des modes de commandes existantes. Elles sont importees comme des commandes
a part entiere : le classeur livre trois textes propres a chacune, et un
« mode » n'est pas, dans ce produit, un raccourci visible mais un raccourci
retire dont l'adresse redirige. La recommandation est tracee dans
decisions.json.

Deux formes de classeur sont acceptees : payloads et questions dans leurs
propres onglets (V5.1), ou portes par les colonnes d'Import_Commandes
(V5.2). C'est la seule chose qui change d'un classeur a l'autre.
"""

import hashlib
import json
import sys
from pathlib import Path

from openpyxl import load_workbook

RACINE = Path(__file__).resolve().parent.parent
# Le dossier de sortie depend de la version passee en argument.

# Les six familles IMAGE du catalogue V5. Une famille inconnue arrete
# l'extraction : le classeur n'a pas vocation a en creer.
FAMILLES = {f'IMG-V5-0{n}' for n in range(1, 7)}

RISQUES = {
    'faible': 'faible', 'low': 'faible',
    'moyen': 'moyen', 'medium': 'moyen', 'modéré': 'moyen', 'modere': 'moyen',
    'élevé': 'eleve', 'eleve': 'eleve', 'high': 'eleve',
}


def lire(classeur, onglet):
    feuille = classeur[onglet]
    lignes = feuille.iter_rows(values_only=True)
    entetes = next(lignes)
    return [
        dict(zip(entetes, ligne)) for ligne in lignes if any(c is not None for c in ligne)
    ]


def liste(valeur):
    if not valeur:
        return []
    return [x.strip() for x in str(valeur).split(';') if x.strip()]


def nom_de_mode(preset):
    """Les classeurs ecrivent un mode tantot en clair, tantot en objet.

    V5.1 donne une chaine — « adsocial ». V5.2 donne un objet portant
    `mode_key`, la commande canonique visee et l'intention. Seul le nom sert
    ici : c'est par lui qu'une recherche retrouvera la commande.
    """
    if isinstance(preset, dict):
        valeur = preset.get('mode_key') or preset.get('mode') or ''
    else:
        valeur = preset
    return str(valeur or '').strip().lstrip('/')


def niveau(valeur):
    lettre = str(valeur or '').strip()[:1].upper()
    if lettre not in ('A', 'B', 'C', 'D', 'E'):
        raise SystemExit(f'Niveau d\'execution illisible : {valeur!r}')
    return lettre


def risque(valeur):
    cle = str(valeur or '').strip().lower()
    if cle not in RISQUES:
        raise SystemExit(f'Niveau de risque inconnu : {valeur!r}')
    return RISQUES[cle]


def main():
    if len(sys.argv) != 3:
        raise SystemExit('Usage : extract-catalogue-extension.py <classeur.xlsx> <version>')

    version = sys.argv[2]
    sortie = RACINE / 'data' / 'catalogue' / version

    classeur = load_workbook(sys.argv[1], read_only=True, data_only=True)
    commandes = lire(classeur, 'Import_Commandes')
    decisions = lire(classeur, 'Décisions_Integration')

    # Les payloads et les questions vivent tantot dans leurs propres onglets,
    # tantot dans les colonnes d'Import_Commandes. On lit ce qui existe.
    payloads = lire(classeur, 'Payloads') if 'Payloads' in classeur.sheetnames else None
    questions = lire(classeur, 'Questions') if 'Questions' in classeur.sheetnames else None

    inconnues = {c['family_id'] for c in commandes} - FAMILLES
    if inconnues:
        raise SystemExit(f'Familles inconnues dans le classeur : {sorted(inconnues)}')

    # --- Commandes -------------------------------------------------------
    # Aucun champ media n'est extrait : les visuels s'ajoutent depuis
    # l'administration, et un classeur ne doit pas pouvoir en poser.
    neuves = []
    for c in commandes:
        presets = json.loads(c['presets_json'])
        neuves.append({
            'ref': c['id'],
            'command': c['command'],
            'family_id': c['family_id'],
            'title': c['title'],
            'short_description': c['short_description'],
            'main_use_case': c['main_use_case'],
            'level': niveau(c['level']),
            'preset_key': nom_de_mode(presets[0]) or None if presets else None,
            # Les modes servent la recherche : quelqu'un qui tape un mot du
            # classeur doit tomber sur la commande qui le porte.
            'aliases': [n for n in (nom_de_mode(p) for p in presets) if n],
            'input_primary': c['input_primary'],
            'required_variables': liste(c['required_variables']),
            'optional_variables': liste(c['optional_variables']),
            'sufficient_context': c['sufficient_context'],
            'blocking_condition': c['blocking_condition'],
            'default_values': c['default_values'],
            'preserve': c['preserve'],
            'avoid': c['avoid'],
            'output_format': c['output_format'],
            'risk_level': risque(c['risk_level']),
            'content_version': c['content_version'],
        })

    # --- Payloads ---------------------------------------------------------
    # L'empreinte du classeur est reverifiee : un texte altere entre
    # l'edition et l'extraction ne doit pas entrer dans le depot.
    moteurs = {'ChatGPT': 'chatgpt', 'Claude': 'claude', 'Gemini': 'gemini'}
    textes = []
    if payloads is not None:
        for p in payloads:
            empreinte = hashlib.sha256(p['payload'].encode('utf-8')).hexdigest()
            if empreinte != p['sha256']:
                raise SystemExit(f"Empreinte incorrecte pour {p['id']} / {p['engine']}.")
            textes.append({
                'ref': p['id'],
                'moteur': moteurs[p['engine']],
                'payload': p['payload'],
                'sha256': empreinte,
            })
    else:
        for c in commandes:
            for moteur, colonne in (('chatgpt', 'chatgpt'), ('claude', 'claude'), ('gemini', 'gemini')):
                texte = c[f'payload_{colonne}']
                empreinte = hashlib.sha256(texte.encode('utf-8')).hexdigest()
                if empreinte != c[f'sha256_{colonne}']:
                    raise SystemExit(f"Empreinte incorrecte pour {c['id']} / {moteur}.")
                textes.append({
                    'ref': c['id'], 'moteur': moteur,
                    'payload': texte, 'sha256': empreinte,
                })

    # --- Questions --------------------------------------------------------
    if questions is not None:
        interrogations = [
            {
                'ref': q['id'],
                'sort_order': int(q['order']),
                'question': q['question'],
                'condition': q['condition'],
            }
            for q in questions
        ]
    else:
        # La condition de declenchement n'est pas portee ligne a ligne par ces
        # classeurs : c'est le champ `blocking_condition` de la commande qui la
        # dit, et c'est lui qui part dans `trigger_note`.
        interrogations = [
            {
                'ref': c['id'],
                'sort_order': n,
                'question': texte,
                'condition': c['blocking_condition'],
            }
            for c in commandes
            for n, texte in enumerate(json.loads(c['questions_successives_json']), start=1)
        ]

    # --- Decisions du classeur, conservees telles quelles ------------------
    # Neuf commandes y sont recommandees comme modes d'une commande
    # existante. Elles sont importees comme commandes a part entiere ; la
    # recommandation reste consignee pour que l'arbitrage soit relisible.
    arbitrages = [
        {
            'ref': d['id_propose'],
            'command': d['command'],
            'recommandation': d['decision_recommandee'],
            'cible': d['canonical_target'],
            'raison': d['raison'],
        }
        for d in decisions
        if 'preset' in str(d['decision_recommandee']).lower()
    ]

    sortie.mkdir(parents=True, exist_ok=True)
    for nom, donnees in (
        ('commandes', neuves),
        ('payloads', textes),
        ('questions', interrogations),
        ('decisions', arbitrages),
    ):
        chemin = sortie / f'{nom}.json'
        chemin.write_text(
            json.dumps(donnees, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
        )
        print(f'{nom:12s} {len(donnees):5d} lignes')


if __name__ == '__main__':
    main()
