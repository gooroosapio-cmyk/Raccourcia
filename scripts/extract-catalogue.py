#!/usr/bin/env python3
"""
Extrait le catalogue editorial du XLSX vers data/catalogue/*.json.

A rejouer uniquement lorsque le tableur source evolue AVANT la mise en
production. Une fois le back-office en service, Supabase devient la seule
source de verite runtime et le tableur redevient un export d'archive
(Document Technique V1, section 5.1).

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
SOURCE = ROOT / "data" / "source" / "RaccourcIA_Catalogue_Complet_Prompts.xlsx"
OUT = ROOT / "data" / "catalogue"


def sheet_to_records(worksheet):
    rows = list(worksheet.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(h) if h is not None else "" for h in rows[0]]
    records = []
    for row in rows[1:]:
        if row[0] is None:
            continue
        record = {}
        for key, value in zip(headers, row):
            record[key] = None if value is None else str(value).strip()
        records.append(record)
    return records


def main():
    if not SOURCE.exists():
        sys.exit(f"Fichier source introuvable : {SOURCE}")

    workbook = openpyxl.load_workbook(SOURCE, data_only=True)
    OUT.mkdir(parents=True, exist_ok=True)

    exports = {
        "prompts": "Catalogue",
        "qcm": "Variables_QCM",
        "compatibilite": "Compatibilite_IA",
        "regles": "Regles_Impl",
        "taxonomie": "Taxonomie",
    }

    for name, sheet in exports.items():
        records = sheet_to_records(workbook[sheet])
        path = OUT / f"{name}.json"
        path.write_text(
            json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"{path.relative_to(ROOT)} : {len(records)} lignes")


if __name__ == "__main__":
    main()
