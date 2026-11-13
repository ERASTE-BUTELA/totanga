"""Lecture du répertoire et règles de nettoyage. Le registre garde le texte brut."""

import csv
import os
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path

from apps.catalog.models import REGISTER_FIELDS

HEADERS = [header for header, _field in REGISTER_FIELDS]


def repertoire_path():
    """Chemin du CSV d'import (miroir de REPERTOIRE.xls, colonne Editeur incluse)."""

    configured = os.environ.get("REPERTOIRE_CSV", "").strip()
    if configured:
        return Path(configured)
    mounted = Path("/data/import/repertoire.csv")
    if mounted.is_file():
        return mounted
    return Path(__file__).resolve().parents[3] / "data" / "import" / "repertoire.csv"
YEAR = re.compile(r"\d{4}")
IGNORED_INVENTORY = "99999"
IGNORED_TITLE = "abc"


def read_repertoire(path):
    file_path = Path(path)
    with file_path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if list(reader.fieldnames or []) != HEADERS:
            raise ValueError("Les en-têtes du répertoire ne correspondent pas au fichier attendu.")
        rows = []
        for line_number, raw in enumerate(reader, start=2):
            rows.append((line_number, {header: raw.get(header) or "" for header in HEADERS}))
    return rows


def tidy(value):
    return " ".join(str(value or "").split())


def group_key(title, author, publisher):
    def norm(value):
        return "".join(tidy(value).casefold().split())

    return (norm(title), norm(author), norm(publisher))


def call_number(code1, code2, dewey):
    left = tidy(code1)
    right = tidy(code2)
    letters = tidy(dewey)[:3]
    base = f"{left}.{right}" if left and right else left or right
    if base and letters:
        return f"{base} {letters}"
    return base or letters


def secondary_call_number(code3, code4):
    left = tidy(code3)
    right = tidy(code4)
    if left and right:
        return f"{left}.{right}"
    return left or right


def publication_year(value):
    """Retourne (année ou None, invalide)."""
    text = tidy(value)
    if not text:
        return None, True
    match = YEAR.search(text)
    if match is None:
        return None, True
    year = int(match.group(0))
    if year < 1800 or year > 2026:
        return None, True
    return year, False


def acquisition_price(value):
    text = tidy(value).replace(" ", "").replace(",", ".")
    if not text:
        return None
    try:
        amount = Decimal(text)
    except InvalidOperation:
        return None
    if amount == 0:
        return None
    return amount.quantize(Decimal("0.01"))


def summary_text(value):
    text = tidy(value)
    if text.casefold() in {"no", "non"}:
        return ""
    return text


def is_ignored(cells):
    return tidy(cells["N.  e."]) == IGNORED_INVENTORY and tidy(cells["Titre"]).casefold() == IGNORED_TITLE


def plan(rows):
    """Décide le sort de chaque ligne, sans écrire."""
    seen = {}
    decisions = []
    for line_number, cells in rows:
        inventory = tidy(cells["N.  e."])
        reasons = []
        duplicate_of = None
        if is_ignored(cells):
            reasons.append("ignoree")
        elif inventory in seen:
            reasons.append("doublon")
            duplicate_of = seen[inventory]
        else:
            seen[inventory] = line_number
        _year, invalid_year = publication_year(cells["Date publ."])
        if invalid_year and "ignoree" not in reasons and "doublon" not in reasons:
            reasons.append("annee")
        if "ignoree" in reasons:
            status = "ignorée"
        elif reasons:
            status = "anomalie"
        else:
            status = "importée"
        decisions.append(
            {
                "line": line_number,
                "cells": cells,
                "inventory": inventory,
                "status": status,
                "reasons": reasons,
                "duplicate_of": duplicate_of,
                "imports_copy": "ignoree" not in reasons and "doublon" not in reasons,
            }
        )
    copies = sum(1 for item in decisions if item["imports_copy"])
    books = len(
        {
            group_key(item["cells"]["Titre"], item["cells"]["Auteur"], item["cells"]["Editeur"])
            for item in decisions
            if item["imports_copy"]
        }
    )
    sans_classe = sum(
        1
        for item in decisions
        if item["imports_copy"] and not tidy(item["cells"]["CLASSE"]) and not tidy(item["cells"]["SOUS-CLASSE"])
    )
    totals = {
        "lignes": len(decisions),
        "ignorees": sum(1 for item in decisions if "ignoree" in item["reasons"]),
        "doublons": sum(1 for item in decisions if "doublon" in item["reasons"]),
        "annees": sum(1 for item in decisions if "annee" in item["reasons"]),
        "exemplaires": copies,
        "livres": books,
        "sans_classe": sans_classe,
    }
    return decisions, totals


def anomaly_rows(decisions):
    labels = {
        "ignoree": "Ligne de test ignorée",
        "doublon": "Numéro d'inventaire déjà vu",
        "annee": "Année absente, illisible ou hors 1800-2026",
    }
    for item in decisions:
        for reason in item["reasons"]:
            detail = labels[reason]
            if reason == "doublon":
                detail = f"Déjà vu à la ligne {item['duplicate_of']}"
            elif reason == "annee":
                detail = f"Valeur brute : {item['cells']['Date publ.']}"
            yield {
                "type": reason,
                "ligne": item["line"],
                "numero": item["inventory"],
                "detail": detail,
            }
