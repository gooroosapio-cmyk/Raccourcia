#!/usr/bin/env python3
"""
Extrait le catalogue editorial v2.0 du XLSX vers data/catalogue/*.json.

A rejouer uniquement lorsque le tableur source evolue AVANT la mise en
production. Une fois le back-office en service, Supabase devient la seule
source de verite runtime et le tableur redevient un export d'archive
(Document Technique V1, section 5.1).

L'import s'arrete si la feuille Audit_Controles contient une ERREUR :
le tableur lui-meme demande de bloquer la publication dans ce cas
(ordre d'implementation, etape 6).

    pip install openpyxl
    python3 scripts/extract-catalogue.py
"""

import json
import pathlib
import sys

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl est requis : pip install openpyxl")

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data" / "source" / "RaccourcIA_Catalogue_Complet_Prompts_v2.xlsx"
OUT = ROOT / "data" / "catalogue"

# Feuille source -> fichier JSON produit.
EXPORTS = {
    "prompts": "Catalogue_Complet",
    "qcm": "Questions_QCM",
    "taxonomie": "Taxonomie",
    "regles": "Regles_Impl",
    "audit": "Audit_Controles",
    "tests": "Tests_QA",
    "doublons": "Anti_Doublons",
}


def sheet_to_records(worksheet):
    rows = list(worksheet.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(h) if h is not None else "" for h in rows[0]]
    records = []
    for row in rows[1:]:
        if all(cell is None for cell in row):
            continue
        record = {}
        for key, value in zip(headers, row):
            record[key] = None if value is None else str(value).strip()
        records.append(record)
    return records


def check_audit(records):
    """Le tableur porte son propre controle qualite : on le respecte."""
    failures = [r for r in records if (r.get("statut") or "").upper() == "ERREUR"]
    if failures:
        for row in failures:
            print(
                f"  ERREUR {row.get('id')} : {row.get('controle')} "
                f"= {row.get('valeur_obtenue')} (attendu {row.get('valeur_attendue')})",
                file=sys.stderr,
            )
        sys.exit(
            f"{len(failures)} controle(s) en erreur dans Audit_Controles : "
            "publication bloquee (regle du tableur)."
        )


def main():
    if not SOURCE.exists():
        sys.exit(f"Fichier source introuvable : {SOURCE}")

    workbook = openpyxl.load_workbook(SOURCE, data_only=True)
    OUT.mkdir(parents=True, exist_ok=True)

    for name, sheet in EXPORTS.items():
        if sheet not in workbook.sheetnames:
            sys.exit(f"Feuille absente du tableur : {sheet}")
        records = sheet_to_records(workbook[sheet])
        if name == "audit":
            check_audit(records)
        path = OUT / f"{name}.json"
        path.write_text(
            json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"{path.relative_to(ROOT)} : {len(records)} lignes")


if __name__ == "__main__":
    main()
