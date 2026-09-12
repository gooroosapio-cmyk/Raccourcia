#!/usr/bin/env python3
"""Extrait la refonte globale des payloads depuis le classeur V6.

    python3 scripts/extract-payloads-v6.py <classeur.xlsx>

Ecrit data/catalogue/v6/. Le classeur porte, pour chacune des 533 commandes,
trois textes — un par IA — et leur empreinte sha256. L'empreinte est
verifiee ici et reportee dans le lot : elle voyage avec le texte jusqu'a la
base, ou le controle final la recalcule.

Ce que l'extracteur ne lit pas, deliberement : les colonnes de medias et de
relations. Le classeur porte lui-meme la consigne (« EXCLURE — ne pas
modifier les champs ni relations medias ») et la meilleure facon de la tenir
est de ne jamais charger ces donnees.
"""

import hashlib
import json
import sys
from pathlib import Path

import openpyxl

MOTEURS = ('chatgpt', 'claude', 'gemini')


def lignes(feuille):
    it = feuille.iter_rows(values_only=True)
    colonnes = next(it)
    for brut in it:
        if brut and brut[0]:
            yield dict(zip(colonnes, brut))


def main():
    if len(sys.argv) != 2:
        raise SystemExit('Usage : extract-payloads-v6.py <classeur.xlsx>')

    racine = Path(__file__).resolve().parent.parent
    sortie = racine / 'data' / 'catalogue' / 'v6'
    sortie.mkdir(parents=True, exist_ok=True)

    classeur = openpyxl.load_workbook(sys.argv[1], read_only=True, data_only=True)
    entrees = list(lignes(classeur['Import_Payloads']))

    commandes = []
    payloads = []
    ecarts = []

    for e in entrees:
        ref = str(e['id']).strip()
        commande = str(e['command']).strip()
        titre = str(e['title']).strip()

        if not titre:
            ecarts.append(f'{ref} : titre vide')
        if not commande.startswith('/'):
            ecarts.append(f'{ref} : commande « {commande} » sans barre oblique')

        commandes.append({
            'ref': ref,
            'command': commande,
            'titre': titre,
            'famille': str(e['family_id']).strip(),
            'domaine': str(e['domain']).strip().lower(),
        })

        for moteur in MOTEURS:
            texte = e[f'payload_{moteur}']
            if not texte or not str(texte).strip():
                ecarts.append(f'{ref} / {moteur} : payload vide')
                continue
            annoncee = str(e[f'sha256_{moteur}']).strip()
            calculee = hashlib.sha256(str(texte).encode('utf-8')).hexdigest()
            if annoncee != calculee:
                ecarts.append(f'{ref} / {moteur} : empreinte annoncee {annoncee[:12]} vs {calculee[:12]}')
            payloads.append({
                'ref': ref,
                'moteur': moteur,
                'payload': str(texte),
                'sha256': calculee,
            })

        distincts = {str(e[f'payload_{m}']) for m in MOTEURS}
        if len(distincts) < 3:
            ecarts.append(f'{ref} : les trois textes ne sont pas distincts')

    # Un classeur incoherent ne produit rien : mieux vaut aucune donnee qu'une
    # donnee a demi verifiee, qui passerait ensuite pour verifiee.
    if ecarts:
        for ligne in ecarts[:30]:
            print(f'  {ligne}', file=sys.stderr)
        raise SystemExit(f'{len(ecarts)} ecart(s) dans le classeur. Rien n a ete ecrit.')

    refs = [c['ref'] for c in commandes]
    if len(set(refs)) != len(refs):
        raise SystemExit('References en double dans le classeur.')

    (sortie / 'commandes.json').write_text(
        json.dumps(commandes, ensure_ascii=False, indent=1) + '\n', encoding='utf-8'
    )
    (sortie / 'payloads.json').write_text(
        json.dumps(payloads, ensure_ascii=False, indent=1) + '\n', encoding='utf-8'
    )

    print(f'{len(commandes)} commandes, {len(payloads)} payloads, {len(set(refs))} references distinctes.')


if __name__ == '__main__':
    main()
