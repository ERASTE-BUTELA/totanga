"""Lecture du répertoire Excel (xlsx) sans dépendance externe.

Onglet « Codes et descriptions » : CLASSES (vertes) et SOUS-CLASSES (bleues).
Onglet « Repertoire » : livres ; la classe / sous-classe est déduite de code1.
"""

from __future__ import annotations

import csv
import re
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path

from apps.catalog.models import REGISTER_FIELDS
from apps.catalog.repertoire import tidy

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
HEADERS = [header for header, _field in REGISTER_FIELDS]
COL = re.compile(r"([A-Z]+)")


def _col(ref: str) -> str:
    match = COL.match(ref or "")
    return match.group(1) if match else ""


def _shared_strings(archive: zipfile.ZipFile) -> list[str]:
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    rows = []
    for item in root.findall("m:si", NS):
        rows.append("".join(node.text or "" for node in item.findall(".//m:t", NS)))
    return rows


def _cell_text(cell, strings: list[str]) -> str:
    kind = cell.get("t")
    value = cell.find("m:v", NS)
    if value is None:
        inline = cell.find("m:is", NS)
        if inline is None:
            return ""
        return "".join(node.text or "" for node in inline.findall(".//m:t", NS))
    raw = value.text or ""
    if kind == "s":
        return strings[int(raw)]
    return raw


def _sheet_rows(archive: zipfile.ZipFile, sheet_path: str, strings: list[str]):
    root = ET.fromstring(archive.read(sheet_path))
    for row in root.findall("m:sheetData/m:row", NS):
        values = {}
        for cell in row.findall("m:c", NS):
            values[_col(cell.get("r"))] = _cell_text(cell, strings)
        yield int(row.get("r") or 0), values


def _clean_label(value: str) -> str:
    text = tidy(value.replace("\xa0", " "))
    return " ".join(text.split())


def _excel_date(value: str) -> str:
    text = tidy(value)
    if not text:
        return ""
    try:
        serial = float(text.replace(",", "."))
    except ValueError:
        return text
    # Numéro de série Excel (jours depuis 1899-12-30).
    if 200 <= serial <= 80000:
        day = datetime(1899, 12, 30) + timedelta(days=int(serial))
        return day.strftime("%d/%m/%Y")
    if serial.is_integer() and 1800 <= int(serial) <= 2026:
        return str(int(serial))
    return text


def _dewey_stem(code1: str) -> str:
    digits = "".join(character for character in tidy(code1) if character.isdigit())
    if not digits:
        return ""
    return digits[:3].zfill(3)


def read_dewey_tree(path: Path) -> tuple[dict[str, str], dict[str, tuple[str, str]]]:
    """Retourne (classes code→nom, sous-classes code→(nom_classe, nom_sous))."""

    with zipfile.ZipFile(path) as archive:
        strings = _shared_strings(archive)
        classes: dict[str, str] = {}
        subclasses: dict[str, tuple[str, str]] = {}
        section = None
        for _line, values in _sheet_rows(archive, "xl/worksheets/sheet1.xml", strings):
            marker = _clean_label(values.get("C", "")).casefold()
            if marker == "classes":
                section = "classes"
                continue
            if marker.replace(" ", "") in {"sous-classes", "sousclasses"}:
                section = "sous"
                continue
            if marker == "sections":
                section = "sections"
                continue
            code = tidy(values.get("A", ""))
            name = _clean_label(values.get("C", ""))
            if not code.isdigit() or not name:
                continue
            if section == "classes" and len(code) == 3 and code.endswith("00"):
                classes[code] = name
            elif section == "sous" and len(code) == 3:
                parent_code = code[0] + "00"
                parent_name = classes.get(parent_code, "")
                if parent_name:
                    subclasses[code] = (parent_name, name)
        return classes, subclasses


def classify_code(code1: str, classes: dict[str, str], subclasses: dict[str, tuple[str, str]]) -> tuple[str, str]:
    stem = _dewey_stem(code1)
    if not stem:
        return "", ""
    tens = stem[0] + stem[1] + "0"
    hundreds = stem[0] + "00"
    if tens in subclasses:
        return subclasses[tens]
    if hundreds in classes:
        return classes[hundreds], ""
    if stem in subclasses:
        return subclasses[stem]
    return "", ""


def iter_repertoire_rows(path: Path):
    classes, subclasses = read_dewey_tree(path)
    with zipfile.ZipFile(path) as archive:
        strings = _shared_strings(archive)
        header = None
        for line, values in _sheet_rows(archive, "xl/worksheets/sheet2.xml", strings):
            if header is None:
                header = {column: tidy(label) for column, label in values.items() if tidy(label)}
                continue
            raw = {name: "" for name in HEADERS}
            mapping = {
                "N.  e.": "A",
                "F.N.": "B",
                "Auteur": "C",
                "Titre": "D",
                "Editeur": "E",
                "code1": "F",
                "code2": "G",
                "Dewey": "H",
                "Date publ.": "I",
                "Prix": "J",
                "Resumé": "K",
            }
            for name, column in mapping.items():
                raw[name] = values.get(column, "")
            raw["Date publ."] = _excel_date(raw["Date publ."])
            raw["Prix"] = tidy(raw["Prix"]).replace(".", ",")
            classe, subclass = classify_code(raw["code1"], classes, subclasses)
            raw["CLASSE"] = classe
            raw["SOUS-CLASSE"] = subclass
            if not tidy(raw["N.  e."]) and not tidy(raw["Titre"]):
                continue
            yield line, raw


def write_repertoire_csv(xlsx_path: Path, csv_path: Path) -> dict[str, int]:
    """Écrit le CSV attendu par import_repertoire. Retourne des compteurs."""

    classes, subclasses = read_dewey_tree(xlsx_path)
    count = 0
    with_subclass = 0
    class_only = 0
    without = 0
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=HEADERS)
        writer.writeheader()
        for _line, row in iter_repertoire_rows(xlsx_path):
            writer.writerow(row)
            count += 1
            if row["SOUS-CLASSE"]:
                with_subclass += 1
            elif row["CLASSE"]:
                class_only += 1
            else:
                without += 1
    return {
        "lignes": count,
        "classes": len(classes),
        "sous_classes": len(subclasses),
        "avec_sous_classe": with_subclass,
        "classe_seule": class_only,
        "sans_classe": without,
    }
