#!/usr/bin/env python3
"""Extrait l'extension IMAGE V5.1 du classeur vers data/catalogue/v5-1/*.json.

    python3 scripts/extract-catalogue-v5-1.py <classeur.xlsx>
    npx prettier --write data/catalogue/v5-1

Cinquante commandes IMAGE qui s'ajoutent aux six familles existantes : le
classeur ne cree aucune famille. Rien n'est mis a jour ici, tout est neuf —
c'est ce qui rend cet import beaucoup plus sur que le precedent, il ne peut
rien ecraser.

Le classeur recommande de traiter neuf de ces commandes comme des modes de
commandes existantes. Elles sont importees comme des commandes a part
entiere : le classeur livre trois textes propres a chacune, et un « mode »
n'est pas, dans ce produit, un raccourci visible mais un raccourci retire
dont l'adresse redirige. La decision est tracee dans decisions.json.
"""

import hashlib
import json
import sys
from pathlib import Path

from openpyxl import load_workbook

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / 'data' / 'catalogue' / 'v5-1'

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
    if len(sys.argv) != 2:
        raise SystemExit('Usage : extract-catalogue-v5-1.py <classeur.xlsx>')

    classeur = load_workbook(sys.argv[1], read_only=True, data_only=True)
    commandes = lire(classeur, 'Import_Commandes')
    payloads = lire(classeur, 'Payloads')
    questions = lire(classeur, 'Questions')
    decisions = lire(classeur, 'Décisions_Integration')

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
            'preset_key': presets[0] if presets else None,
            # Les modes servent la recherche : quelqu'un qui tape un mot du
            # classeur doit tomber sur la commande qui le porte.
            'aliases': [p.strip().lstrip('/') for p in presets if str(p).strip()],
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
    moteurs = {'ChatGPT': 'chatgpt', 'Claude': 'claude', 'Gemini': 'gemini'}
    textes = []
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

    # --- Questions --------------------------------------------------------
    interrogations = [
        {
            'ref': q['id'],
            'sort_order': int(q['order']),
            'question': q['question'],
            'condition': q['condition'],
        }
        for q in questions
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

    SORTIE.mkdir(parents=True, exist_ok=True)
    for nom, donnees in (
        ('commandes', neuves),
        ('payloads', textes),
        ('questions', interrogations),
        ('decisions', arbitrages),
    ):
        chemin = SORTIE / f'{nom}.json'
        chemin.write_text(
            json.dumps(donnees, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
        )
        print(f'{nom:12s} {len(donnees):5d} lignes')


if __name__ == '__main__':
    main()
